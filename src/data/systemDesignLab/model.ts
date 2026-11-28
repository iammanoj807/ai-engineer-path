// The System Design Lab's model: how busy each part of a system is, how long a
// request takes, how many requests fail, and what it all costs a month.
//
// Every number the Lab shows, and every number in a lesson animation's
// metrics panel, comes from here, so the two always agree. It is a model, not
// a benchmark: the sizes and prices are round, realistic-looking numbers, so
// a learner can check them with napkin maths. What it gets right is the
// SHAPE of the behaviour, which is what an interview asks about:
//
//  - A server works on a fixed number of requests at once (its workers). When
//    they are all busy, new requests wait in line. The busier it is, the
//    longer the line: waiting grows slowly at first, then very fast near 100%.
//    (Queueing theory: each part is an M/M/c queue. The share of requests
//    that wait is Erlang's C formula; a mix of short and long jobs makes the
//    wait longer, by the Allen–Cunneen factor (1 + cs²) / 2.)
//  - Above 100% busy, the line grows without end: the extra requests fail,
//    and the rest wait until they give up (a timeout).
//  - A cache hit never reaches the database. A read replica takes a share of
//    the reads, but it must also apply every write, so replicas never help
//    with writes. Sharding splits both reads and writes.
//  - A slow job done inside a request makes that request slow, and holds a
//    worker the whole time. On a queue, the request answers at once and
//    background workers do the job.

// ============ THE PARTS ============

/** Time an app server spends on one API request, when nothing is waiting. */
export const SERVICE_MS = 20;
/** One database query. */
export const DB_MS = 5;
/** One cache lookup. */
export const CACHE_MS = 1;
/** One slow job, such as making the thumbnails for a photo. */
export const JOB_MS = 1000;
/** One static file (an image or a script) sent by an app server. */
export const STATIC_MS = 2;
/** A request still waiting after this long gives up, and counts as failed. */
export const TIMEOUT_MS = 2000;
/** "The slow end": p95 is the time 95 requests in 100 beat. */
export const TAIL = 0.05;

export type ServerSize = 'small' | 'large' | 'xl';

/** Each worker handles one request at a time, so a small server handles 10 × (1000 / 20) = 500 requests a second. */
export const SERVER_SIZES: Record<ServerSize, { label: string; workers: number; cost: number }> = {
    small: { label: 'Small', workers: 10, cost: 60 },
    large: { label: 'Large', workers: 40, cost: 240 },
    xl: { label: 'Extra large', workers: 160, cost: 960 },
};

/** Queries a database node runs at once: 10 × (1000 / 5) = 2,000 queries a second. */
export const DB_WORKERS = 10;

export type CacheSize = 'none' | 'small' | 'medium' | 'large';

/** The share of reads a cache answers. A bigger cache holds more of the popular data. */
export const CACHE_HIT: Record<CacheSize, number> = { none: 0, small: 0.6, medium: 0.85, large: 0.95 };

/** Prices in dollars a month. */
export const COST = {
    loadBalancer: 20,
    cache: { none: 0, small: 40, medium: 100, large: 250 } as Record<CacheSize, number>,
    dbNode: 200,
    queue: 10,
    worker: 30,
    cdn: 50,
};

/** With a rate limit on, one client may send at most this many requests a second. */
export const RATE_LIMIT_RPS = 100;

/** Round trip between a user and the servers: same region, or the other side of the world. */
export const NEAR_RTT_MS = 30;
export const FAR_RTT_MS = 250;
/** Round trip to a CDN server near the user. */
export const EDGE_RTT_MS = 20;
/** A browser downloads about six files at once from one site. */
export const PARALLEL_DOWNLOADS = 6;

// ============ ONE QUEUE ============

/**
 * Erlang's C formula: the chance that a request has to wait, at a place with
 * `c` workers and an offered load of `a` busy workers on average (a < c).
 */
export const erlangC = (c: number, a: number): number => {
    if (a <= 0) return 0;
    if (a >= c) return 1;
    // Erlang B by its stable recursion, then C from B.
    let b = 1;
    for (let k = 1; k <= c; k++) b = (a * b) / (k + a * b);
    const rho = a / c;
    return b / (1 - rho * (1 - b));
};

/** Busier than this, a queue is treated as full: waits are worked out here, and the rest fails. */
const EDGE = 0.995;

export interface Queue {
    /** Share of the time the workers are busy. Above 1 is more work than they can do. */
    busy: number;
    /** Average wait in line before a worker starts, in ms. */
    waitMs: number;
    /** The wait 95 requests in 100 beat. */
    waitP95Ms: number;
    /** Share of requests that fail: the excess above 100%, plus those that wait past the timeout. */
    failShare: number;
    /** The chance a request waits longer than `ms`. */
    waitsLonger: (ms: number) => number;
}

const IDLE: Queue = { busy: 0, waitMs: 0, waitP95Ms: 0, failShare: 0, waitsLonger: () => 0 };

/** Waits at or past the timeout: every request that is let in waits until it gives up. */
const full = (ms: number) => (ms < TIMEOUT_MS ? 1 : 0);

/**
 * The wait 95 requests in 100 beat, when requests are shared out over several
 * queues ([share of requests, queue]). Found by halving the range.
 */
export const waitP95Of = (parts: [share: number, q: Queue][]): number => {
    const total = parts.reduce((sum, [share]) => sum + share, 0);
    if (total <= 0) return 0;
    const slower = (ms: number) => parts.reduce((sum, [share, q]) => sum + (share / total) * q.waitsLonger(ms), 0);
    if (slower(0) <= TAIL) return 0;
    if (slower(TIMEOUT_MS - 1e-6) > TAIL) return TIMEOUT_MS;
    let lo = 0;
    let hi = TIMEOUT_MS;
    for (let i = 0; i < 40; i++) {
        const mid = (lo + hi) / 2;
        if (slower(mid) > TAIL) lo = mid;
        else hi = mid;
    }
    return hi;
};

/**
 * One place with `workers` workers, `rps` requests a second, each taking
 * `serviceMs` on average. `cs2` says how uneven the jobs are: 1 is the usual
 * spread; a mix of tiny and huge jobs is much more.
 */
export const queue = (rps: number, workers: number, serviceMs: number, cs2 = 1): Queue => {
    if (rps <= 0) return IDLE;
    if (workers <= 0) return { busy: Infinity, waitMs: TIMEOUT_MS, waitP95Ms: TIMEOUT_MS, failShare: 1, waitsLonger: full };
    const capacity = (workers * 1000) / serviceMs;
    const busy = rps / capacity;
    if (busy >= 1) {
        // The line only grows: the excess fails, and the rest wait almost until they give up
        // (as many of them time out as at the very edge of full, so nothing jumps at 100%).
        const excess = 1 - 1 / busy;
        const atEdge = queue(EDGE * capacity, workers, serviceMs, cs2).failShare;
        return { busy, waitMs: TIMEOUT_MS, waitP95Ms: TIMEOUT_MS, failShare: Math.min(1, excess + (1 - excess) * atEdge), waitsLonger: full };
    }
    const lambda = Math.min(busy, EDGE) * capacity;
    const waitChance = erlangC(workers, (lambda * serviceMs) / 1000);
    const spread = (1 + cs2) / 2;
    // A wait in an M/M/c line is 0 (no wait) or exponential with this rate, per ms.
    const drain = (capacity - lambda) / 1000 / spread;
    const waitMs = waitChance / drain;
    const waitP95Ms = waitChance > TAIL ? Math.log(waitChance / TAIL) / drain : 0;
    const timedOut = waitChance * Math.exp(-drain * Math.max(0, TIMEOUT_MS - serviceMs));
    return {
        busy,
        waitMs: Math.min(TIMEOUT_MS, waitMs),
        waitP95Ms: Math.min(TIMEOUT_MS, waitP95Ms),
        failShare: Math.min(1, timedOut),
        waitsLonger: ms => (ms >= TIMEOUT_MS ? 0 : waitChance * Math.exp(-drain * ms)),
    };
};

/** Average service time and spread (cs²) of a mix of request kinds: [requests a second, ms each]. */
export const mix = (kinds: [rps: number, ms: number][]): { rps: number; serviceMs: number; cs2: number } => {
    const rps = kinds.reduce((sum, [r]) => sum + r, 0);
    if (rps <= 0) return { rps: 0, serviceMs: SERVICE_MS, cs2: 1 };
    const mean = kinds.reduce((sum, [r, ms]) => sum + r * ms, 0) / rps;
    // Each kind's time is spread like an exponential, so its second moment is 2 × ms².
    const second = kinds.reduce((sum, [r, ms]) => sum + r * 2 * ms * ms, 0) / rps;
    return { rps, serviceMs: mean, cs2: second / (mean * mean) - 1 };
};

// ============ A WHOLE SYSTEM ============

export type Balancer = 'round-robin' | 'least-connections';

/** What the learner builds. */
export interface LabConfig {
    servers: number;
    size: ServerSize;
    balancer: Balancer;
    healthChecks: boolean;
    cache: CacheSize;
    /** Read replicas for each database shard. */
    replicas: number;
    /** Database shards; 1 means the data is not split. */
    shards: number;
    /** Slow jobs go on a queue for background workers. */
    queue: boolean;
    workers: number;
    cdn: boolean;
    rateLimit: boolean;
}

export const BASE_CONFIG: LabConfig = {
    servers: 1,
    size: 'small',
    balancer: 'round-robin',
    healthChecks: false,
    cache: 'none',
    replicas: 0,
    shards: 1,
    queue: false,
    workers: 0,
    cdn: false,
    rateLimit: false,
};

/** Something that happens during the day. Hours run from 0 to 23; `to` is the first hour after it ends. */
export type LabEvent =
    | { kind: 'crash'; from: number; to: number; servers: number }
    | { kind: 'surge'; from: number; to: number; factor: number }
    | { kind: 'abuse'; from: number; to: number; rps: number }
    | { kind: 'cache-flush'; from: number; to: number };

/** The world a mission happens in. The learner can't change it. */
export interface LabWorld {
    /** Normal users' API requests a second, at the busiest hour of an ordinary day. */
    peakRps: number;
    /** Share of API requests that only read data; the rest write. Each makes one database query. */
    readShare: number;
    /** Share of API requests that start a slow job (a photo upload). */
    jobShare: number;
    /** Static files (images, scripts) per page. Each API request is one page view. */
    staticFiles: number;
    /** Users are on the other side of the world from the servers. */
    far: boolean;
    /** Server 1 is an old machine with half the workers. */
    oldServer: boolean;
    /** Each hour's traffic as a share of the peak. 24 numbers. */
    shape: number[];
    events: LabEvent[];
}

/** An ordinary day for a shop: quiet at night, busy at lunch, busiest in the evening. */
export const SHOP_DAY = [
    0.25, 0.18, 0.13, 0.1, 0.1, 0.12, 0.2, 0.35, 0.5, 0.6, 0.65, 0.7,
    0.8, 0.78, 0.7, 0.68, 0.7, 0.78, 0.88, 0.96, 1, 0.92, 0.7, 0.45,
];

export const BASE_WORLD: LabWorld = {
    peakRps: 1000,
    readShare: 0.9,
    jobShare: 0,
    staticFiles: 0,
    far: false,
    oldServer: false,
    shape: SHOP_DAY,
    events: [],
};

export interface ServerState {
    up: boolean;
    old: boolean;
    workers: number;
    busy: number;
}

export interface DbNodeState {
    shard: number;
    role: 'primary' | 'replica';
    busy: number;
}

/** One hour of the day, worked out. */
export interface HourResult {
    hour: number;
    /** Normal users' requests a second. */
    rps: number;
    /** Requests a second from a runaway client, after any rate limit. */
    abuseRps: number;
    /** Requests a second the rate limit turned away. */
    limitedRps: number;
    /** The time 95 in 100 API requests beat, network included. */
    p95Ms: number;
    /** Share of normal users' requests that failed. */
    errorShare: number;
    /** A page with its files: 95 in 100 page loads are faster (only when pages have static files). */
    pageMs: number;
    /** Answering a photo upload (only when there are jobs). */
    uploadMs: number;
    /** Until a photo is ready, in seconds (only when there are jobs). */
    jobReadyS: number;
    /** Jobs waiting on the queue at the end of the hour. */
    backlog: number;
    servers: ServerState[];
    db: DbNodeState[];
    cacheHit: number;
    /** Database queries a second, all nodes together. */
    dbRps: number;
    /** Background workers' busy share. */
    workerBusy: number;
    /** Requests a second sent to a server that is down (no health checks). */
    deadRps: number;
}

export interface DayResult {
    hours: HourResult[];
    cost: number;
}

/** The hours an event covers include `from`, not `to`. */
const during = (event: LabEvent, hour: number) => hour >= event.from && hour < event.to;

/** What a design costs a month, part by part. */
export const costParts = (config: LabConfig, world: LabWorld = BASE_WORLD): [part: string, dollars: number][] => {
    const each = SERVER_SIZES[config.size].cost;
    // The old machine is already paid for at a small server's price.
    const servers = config.servers * each - (world.oldServer ? each - SERVER_SIZES.small.cost : 0);
    const nodes = config.shards * (1 + config.replicas);
    return [
        [`${config.servers} server${config.servers === 1 ? '' : 's'}`, servers],
        ['the load balancer', config.servers > 1 ? COST.loadBalancer : 0],
        ['the cache', COST.cache[config.cache]],
        [nodes === 1 ? 'the database' : `${nodes} database nodes`, nodes * COST.dbNode],
        ['the queue and workers', config.queue ? COST.queue + config.workers * COST.worker : 0],
        ['the CDN', config.cdn ? COST.cdn : 0],
    ];
};

/** Monthly cost of a design. */
export const costOf = (config: LabConfig, world: LabWorld = BASE_WORLD): number =>
    costParts(config, world).reduce((sum, [, dollars]) => sum + dollars, 0);

/** Which servers are up this hour: a crash takes down servers from the second one on (the first if there is only one). */
const serversAt = (config: LabConfig, world: LabWorld, hour: number): { up: boolean; old: boolean; workers: number }[] => {
    const down = world.events.filter(e => e.kind === 'crash' && during(e, hour)).reduce((n, e) => n + (e.kind === 'crash' ? e.servers : 0), 0);
    return Array.from({ length: config.servers }, (_, i) => {
        const old = world.oldServer && i === 0;
        const workers = old ? SERVER_SIZES.small.workers / 2 : SERVER_SIZES[config.size].workers;
        // With one server, it is the one that crashes; with more, server 2, 3, … go first.
        const order = config.servers === 1 ? 0 : i === 0 ? config.servers - 1 : i - 1;
        return { up: order >= Math.min(down, config.servers), old, workers };
    });
};

const hourOf = (config: LabConfig, world: LabWorld, hour: number, backlogIn: number): HourResult => {
    const events = world.events.filter(e => during(e, hour));
    const surge = events.reduce((f, e) => (e.kind === 'surge' ? f * e.factor : f), 1);
    const rps = world.peakRps * world.shape[hour] * surge;
    const abuseRaw = events.reduce((n, e) => (e.kind === 'abuse' ? n + e.rps : n), 0);
    const abuseRps = config.rateLimit ? Math.min(abuseRaw, RATE_LIMIT_RPS) : abuseRaw;
    const limitedRps = abuseRaw - abuseRps;
    const cacheHit = events.some(e => e.kind === 'cache-flush') ? 0 : CACHE_HIT[config.cache];

    // What reaches the app servers: API requests (the runaway client's are plain reads),
    // uploads with their job unless it goes on a queue, and static files without a CDN.
    const jobsRps = rps * world.jobShare;
    const apiRps = rps - jobsRps + abuseRps;
    const staticRps = config.cdn ? 0 : rps * world.staticFiles;
    const work = mix([
        [apiRps, SERVICE_MS],
        [jobsRps, config.queue ? SERVICE_MS : JOB_MS + SERVICE_MS],
        [staticRps, STATIC_MS],
    ]);

    // The load balancer spreads that over the servers.
    const pool = serversAt(config, world, hour);
    const live = pool.filter(s => s.up);
    const routed = config.healthChecks ? live : pool;
    const deadShare = routed.length === 0 ? 1 : (routed.length - live.length) / routed.length;
    const deadRps = work.rps * deadShare;
    let serverFail: number;
    let serverWaitP95: number;
    let servers: ServerState[];
    if (live.length === 0) {
        serverFail = 1;
        serverWaitP95 = TIMEOUT_MS;
        servers = pool.map(s => ({ ...s, busy: 0 }));
    } else if (config.balancer === 'least-connections' || live.length === 1) {
        // Sending each request to the least busy server works almost like one shared line for all of them.
        const workers = live.reduce((n, s) => n + s.workers, 0);
        const q = queue(work.rps * (1 - deadShare), workers, work.serviceMs, work.cs2);
        serverFail = q.failShare;
        serverWaitP95 = q.waitP95Ms;
        servers = pool.map(s => ({ ...s, busy: s.up ? q.busy : 0 }));
    } else {
        // Round robin: every server routed to gets the same share, however big it is.
        const share = work.rps / routed.length;
        const each = live.map(s => queue(share, s.workers, work.serviceMs, work.cs2));
        serverFail = each.reduce((sum, q) => sum + q.failShare, 0) / live.length;
        serverWaitP95 = waitP95Of(each.map(q => [1, q]));
        let k = 0;
        servers = pool.map(s => ({ ...s, busy: s.up ? each[k++].busy : 0 }));
    }

    // The database: reads the cache didn't answer, and every write.
    const reads = (rps - jobsRps) * world.readShare + abuseRps;
    const writes = (rps - jobsRps) * (1 - world.readShare) + jobsRps;
    const dbReads = reads * (1 - cacheHit);
    const perShardReads = dbReads / config.shards;
    const perShardWrites = writes / config.shards;
    const nodes = 1 + config.replicas;
    // Every node of a shard takes its share of the reads, and applies every write.
    const node = queue(perShardReads / nodes + perShardWrites, DB_WORKERS, DB_MS);
    const db: DbNodeState[] = Array.from({ length: config.shards }, (_, shard) =>
        Array.from({ length: nodes }, (_, n): DbNodeState => ({ shard, role: n === 0 ? 'primary' : 'replica', busy: node.busy })),
    ).flat();
    const dbRps = dbReads + writes * nodes;

    // A normal user's API request: the network, a server, then the cache and (sometimes) the database.
    const rtt = world.far ? FAR_RTT_MS : NEAR_RTT_MS;
    const userReads = (rps - jobsRps) * world.readShare;
    const userWrites = (rps - jobsRps) * (1 - world.readShare);
    const userApi = rps - jobsRps;
    const reachDb = userApi > 0 ? (userReads * (1 - cacheHit) + userWrites) / userApi : 0;
    const dbPart = reachDb >= TAIL ? DB_MS + node.waitP95Ms : 0;
    const cachePart = config.cache !== 'none' ? CACHE_MS : 0;
    const p95Ms = Math.min(TIMEOUT_MS + rtt, rtt + SERVICE_MS + serverWaitP95 + cachePart + dbPart);
    const ok = (1 - deadShare) * (1 - serverFail) * (1 - reachDb * node.failShare);
    const errorShare = Math.max(0, Math.min(1, 1 - ok));

    // A page: connect (two round trips), the API request, then the files a few at a time.
    const rounds = Math.ceil(world.staticFiles / PARALLEL_DOWNLOADS);
    const fileMs = config.cdn ? EDGE_RTT_MS : rtt + STATIC_MS + serverWaitP95;
    const pageMs = world.staticFiles > 0 ? 2 * rtt + p95Ms + rounds * fileMs : 0;

    // Photo uploads and their jobs.
    let uploadMs = 0;
    let jobReadyS = 0;
    let backlog = 0;
    let workerBusy = 0;
    if (world.jobShare > 0) {
        if (config.queue) {
            uploadMs = Math.min(TIMEOUT_MS + rtt, rtt + SERVICE_MS + serverWaitP95 + DB_MS + node.waitP95Ms);
            const capacity = (config.workers * 1000) / JOB_MS;
            const arriving = jobsRps * 3600;
            const done = capacity * 3600;
            backlog = Math.max(0, backlogIn + arriving - done);
            workerBusy = capacity > 0 ? jobsRps / capacity : Infinity;
            // A job has no timeout: it waits its turn. When the workers are behind, the
            // turn comes after the backlog; otherwise after the usual wait for a free worker.
            const waiting = (backlogIn + backlog) / 2;
            if (capacity <= 0) jobReadyS = Infinity;
            else if (waiting > 0 || workerBusy >= 1) jobReadyS = waiting / capacity + JOB_MS / 1000;
            else jobReadyS = (queue(jobsRps, config.workers, JOB_MS).waitP95Ms + JOB_MS) / 1000;
        } else {
            uploadMs = Math.min(TIMEOUT_MS + rtt, rtt + SERVICE_MS + JOB_MS + serverWaitP95 + DB_MS + node.waitP95Ms);
            jobReadyS = uploadMs / 1000;
        }
    }

    return {
        hour,
        rps,
        abuseRps,
        limitedRps,
        p95Ms,
        errorShare,
        pageMs,
        uploadMs,
        jobReadyS,
        backlog,
        servers,
        db,
        cacheHit,
        dbRps,
        workerBusy,
        deadRps,
    };
};

/** A whole day, hour by hour. A queue's backlog carries from one hour to the next. */
export const runDay = (config: LabConfig, world: LabWorld): DayResult => {
    const hours: HourResult[] = [];
    let backlog = 0;
    for (let hour = 0; hour < 24; hour++) {
        const result = hourOf(config, world, hour, backlog);
        backlog = result.backlog;
        hours.push(result);
    }
    return { hours, cost: costOf(config, world) };
};

/** One moment, for a lesson animation: the system at its peak hour with these settings. */
export const atPeak = (config: Partial<LabConfig>, world: Partial<Omit<LabWorld, 'shape'>> = {}): HourResult =>
    hourOf({ ...BASE_CONFIG, ...config }, { ...BASE_WORLD, ...world, shape: [1] }, 0, 0);

// ============ SHOWING NUMBERS ============

/** 140 ms, 1.2 s. */
export const formatMs = (ms: number): string => {
    if (!Number.isFinite(ms)) return 'never';
    if (ms >= 1000) return `${+(ms / 1000).toFixed(ms >= 10000 ? 0 : 1)} s`;
    return `${Math.round(ms)} ms`;
};

/** 0%, 0.4%, 12%. */
export const formatShare = (share: number): string => {
    const pct = share * 100;
    if (pct === 0) return '0%';
    if (pct < 0.1) return '< 0.1%';
    if (pct < 10) return `${+pct.toFixed(1)}%`;
    return `${Math.round(pct)}%`;
};

/** 950, 1,600, 12,000. */
export const formatCount = (n: number): string => Math.round(n).toLocaleString('en-GB');

/** $260 a month. */
export const formatCost = (dollars: number): string => `$${Math.round(dollars).toLocaleString('en-GB')}`;

/** 45 s, 6 min, 2 h. */
export const formatWait = (seconds: number): string => {
    if (!Number.isFinite(seconds)) return 'never';
    if (seconds < 90) return `${Math.round(seconds)} s`;
    if (seconds < 5400) return `${Math.round(seconds / 60)} min`;
    return `${+(seconds / 3600).toFixed(1)} h`;
};
