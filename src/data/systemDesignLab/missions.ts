// The System Design Lab's missions. Each one is a small, real-looking problem
// that one or two lessons teach you to solve: the learner changes the design,
// runs a whole day of traffic through it (model.ts), and sees where it breaks.
//
// Learn first, then do: every mission names the lessons it uses, and nothing
// in it asks about an idea those lessons haven't taught. A test checks that
// each mission's starting design fails, that its solution meets every goal,
// and that each trap (a fix that sounds right) really fails.

import {
    BASE_CONFIG,
    BASE_WORLD,
    SERVER_SIZES,
    SHOP_DAY,
    formatCost,
    formatMs,
    formatShare,
    formatWait,
    runDay,
    type DayResult,
    type HourResult,
    type LabConfig,
    type LabWorld,
} from './model';

export type Lever = 'servers' | 'size' | 'balancer' | 'healthChecks' | 'cache' | 'replicas' | 'shards' | 'queue' | 'workers' | 'cdn' | 'rateLimit';

export type GoalKind = 'p95' | 'errors' | 'page' | 'upload' | 'jobReady' | 'budget';

export interface Goal {
    kind: GoalKind;
    /** ms for times, a share for errors, seconds for jobReady, dollars a month for budget. */
    limit: number;
}

export interface Mission {
    /** Its address: /system-design/lab/<id>/. Never change one. */
    id: string;
    title: string;
    /** Lesson ids to learn first. */
    lessons: string[];
    /** The situation, in two or three sentences. */
    story: string;
    /**
     * The one idea the mission needs, in plain words, for someone who opens the
     * Lab before the lessons: it teaches, it never asks. The lessons go deeper.
     */
    idea: string;
    world: LabWorld;
    start: LabConfig;
    /** What the learner may change. Everything else stays as it starts. */
    levers: Lever[];
    /** The most of each the learner can add. */
    max?: Partial<Record<'servers' | 'replicas' | 'shards' | 'workers', number>>;
    goals: Goal[];
    /** A design that meets every goal (checked by a test). */
    solution: Partial<LabConfig>;
    /** Fixes that sound right and fail (checked by a test), with why. */
    traps: { config: Partial<LabConfig>; why: string }[];
    /** Shown once every goal is met: why the design works. */
    debrief: string;
    /** The same idea as you would say it in an interview. */
    interview: string;
}

export const LEVER_MAX = { servers: 20, replicas: 4, shards: 4, workers: 20 };

/** What each lever is called, in a list of what a mission lets you change. */
export const LEVER_NAMES: Record<Lever, string> = {
    servers: 'how many app servers',
    size: 'how big each server is',
    balancer: 'how the load balancer chooses a server',
    healthChecks: 'health checks',
    cache: 'a cache, and its size',
    replicas: 'read replicas',
    shards: 'database shards',
    queue: 'a job queue',
    workers: 'background workers',
    cdn: 'a CDN',
    rateLimit: 'a rate limit per client',
};

const world = (w: Partial<LabWorld>): LabWorld => ({ ...BASE_WORLD, shape: SHOP_DAY, ...w });
const config = (c: Partial<LabConfig>): LabConfig => ({ ...BASE_CONFIG, ...c });

export const MISSIONS: Mission[] = [
    {
        id: 'more-or-bigger',
        title: 'More servers, or a bigger one?',
        lessons: ['sd2-t1', 'sd2-t4'],
        story:
            'Your shop runs on one small server, and tonight 1,600 requests a second are expected at 8 pm. One small server handles about 500. ' +
            'You can buy more small servers (a load balancer is added for you), or swap to a bigger server.',
        idea: 'A server can only work on so many requests at once: a small one handles about 500 a second. When more arrive, they wait in line, and when the line gets too long they fail. There are two ways to handle more. Buy a bigger server (scaling up), or add more servers (scaling out), with a load balancer in front that shares the requests between them. Either way, keep the busiest hour below about 80% busy: waiting grows very fast after that.',
        world: world({ peakRps: 1600 }),
        start: config({ servers: 1, healthChecks: true }),
        levers: ['servers', 'size'],
        max: { servers: 8 },
        goals: [
            { kind: 'p95', limit: 200 },
            { kind: 'errors', limit: 0.005 },
            { kind: 'budget', limit: 500 },
        ],
        solution: { servers: 4, healthChecks: true },
        traps: [
            { config: { servers: 3, healthChecks: true }, why: '3 × 500 = 1,500 is less than the 1,600 at 8 pm.' },
            { config: { servers: 1, size: 'xl', healthChecks: true }, why: 'Far more than needed: it costs more than the whole budget.' },
        ],
        debrief:
            'Four small servers handle 2,000 requests a second, so at 8 pm they are 80% busy: busy enough to be good value, with room left for a surprise. ' +
            'One large server works too, today. The next mission shows what the difference is.',
        interview:
            'I size for the peak, not the average, and keep about 20–30% headroom, because waiting time climbs steeply as a server gets close to full.',
    },
    {
        id: 'lunchtime-crash',
        title: 'A server dies at lunchtime',
        lessons: ['sd2-t2', 'sd2-t4'],
        story:
            'At noon one of your servers crashes, and the cloud provider won\'t replace it until tomorrow. ' +
            'The load balancer keeps sending it requests unless it checks which servers are healthy. Evening traffic still peaks at 1,600 requests a second.',
        idea: 'Servers crash. A load balancer only stops sending requests to a dead server if it checks: health checks ask every server "are you OK?" every few seconds, and skip the ones that don\'t answer. And when one server is gone, the others must carry its share, so you need one more server than the traffic needs (N + 1).',
        world: world({ peakRps: 1600, events: [{ kind: 'crash', from: 12, to: 24, servers: 1 }] }),
        start: config({ servers: 4 }),
        levers: ['servers', 'size', 'healthChecks'],
        max: { servers: 8 },
        goals: [
            { kind: 'p95', limit: 200 },
            { kind: 'errors', limit: 0.005 },
            { kind: 'budget', limit: 550 },
        ],
        solution: { servers: 5, healthChecks: true },
        traps: [
            { config: { servers: 4, healthChecks: true }, why: 'With one down, three servers can\'t carry the evening peak.' },
            { config: { servers: 6 }, why: 'Without health checks, one request in six still goes to the dead server.' },
            { config: { servers: 1, size: 'large', healthChecks: true }, why: 'One big server is a single point of failure: when it dies, everything is down.' },
        ],
        debrief:
            'Health checks take the dead server out of the rotation, so no request is sent to it. And with five servers, the four that are left still carry the evening peak (N + 1: one more than you need). ' +
            'One big server could never survive this: when it is the one that dies, nothing is left.',
        interview:
            'I avoid single points of failure: at least N + 1 servers behind a load balancer that health-checks them, so losing any one server costs capacity, not availability.',
    },
    {
        id: 'old-machine',
        title: 'The old machine in the pool',
        lessons: ['sd2-t4'],
        story:
            'Server 1 is an old machine with half the power of the others (250 requests a second instead of 500), and it has to stay. ' +
            'Round robin gives every server the same number of requests, however powerful it is.',
        idea: 'A load balancer needs a rule for choosing a server. Round robin takes turns (1, 2, 3, 4, 1, 2…), so every server gets the same number of requests, however powerful it is. Least connections sends each request to the server with the fewest requests in progress, so a slower server is simply sent less.',
        world: world({ peakRps: 1600, oldServer: true }),
        start: config({ servers: 4, healthChecks: true }),
        levers: ['balancer', 'servers'],
        max: { servers: 8 },
        goals: [
            { kind: 'p95', limit: 200 },
            { kind: 'errors', limit: 0.005 },
            { kind: 'budget', limit: 500 },
        ],
        solution: { servers: 4, healthChecks: true, balancer: 'least-connections' },
        traps: [
            { config: { servers: 6, healthChecks: true }, why: 'Round robin still gives the old machine 1 in 6, about 270 a second: more than its 250.' },
            { config: { servers: 7, healthChecks: true }, why: 'Enough servers for round robin, but over budget.' },
        ],
        debrief:
            'Least connections sends each request to the server with the fewest requests in progress. The old machine fills up sooner, so it is simply sent less, and every server ends up about equally busy. ' +
            'Round robin would need seven servers to keep the old one under its limit.',
        interview:
            'Round robin is fine when servers and requests are alike. When they differ, I use least connections (or weights), so work follows real capacity.',
    },
    {
        id: 'busy-database',
        title: 'Reads are drowning the database',
        lessons: ['sd2-t5', 'sd3-t4'],
        story:
            'Product pages get 6,000 requests a second at the peak. 95 in 100 are reads, and each makes one database query, but the database handles about 2,000 queries a second. ' +
            'The app servers are fine. The database is not.',
        idea: 'Each of these requests makes one database query, and one database handles about 2,000 queries a second. There are two ways to take reads off it. A cache keeps popular answers in fast memory, so those reads never reach the database, and a bigger cache answers a bigger share. Read replicas are extra copies of the database that share the reads, but each one costs as much as the database.',
        world: world({ peakRps: 6000, readShare: 0.95 }),
        start: config({ servers: 4, size: 'large', healthChecks: true }),
        levers: ['cache', 'replicas'],
        goals: [
            { kind: 'p95', limit: 150 },
            { kind: 'errors', limit: 0.005 },
            { kind: 'budget', limit: 1400 },
        ],
        solution: { servers: 4, size: 'large', healthChecks: true, cache: 'medium' },
        traps: [
            { config: { servers: 4, size: 'large', healthChecks: true, cache: 'small' }, why: 'A small cache answers 60% of reads: 2,580 queries a second still reach the database.' },
            { config: { servers: 4, size: 'large', healthChecks: true, replicas: 3 }, why: 'Three replicas share the reads, but four database nodes cost more than the budget.' },
            { config: { servers: 4, size: 'large', healthChecks: true, cache: 'large' }, why: 'It works, but costs more than the budget: a medium cache is enough.' },
        ],
        debrief:
            'A medium cache answers 85% of reads, so only 855 reads and 300 writes a second reach the database: well under its 2,000. ' +
            'Replicas could share the reads too, but each one is a whole database to pay for. When the same data is read again and again, a cache is the cheapest fix.',
        interview:
            'For a read-heavy workload I add a cache first, with cache-aside and a TTL, and size it from the hit rate I need. Read replicas come next if the misses still overload the database.',
    },
    {
        id: 'too-many-writes',
        title: 'Too many writes for one database',
        lessons: ['sd3-t5', 'sd3-t4'],
        story:
            'Every like, view and follow is saved: 70 in 100 requests are writes. At the peak the database gets 3,000 queries a second and can handle 2,000. ' +
            'You can add a cache, add read replicas, or split the data across shards.',
        idea: 'Here most requests are writes: saving a like, a view or a follow. A cache only helps reads. A read replica only shares reads, because it must also apply every write to stay a copy. Sharding splits the data itself: each shard holds some of the users, so it gets only its share of the reads AND of the writes.',
        world: world({ peakRps: 3000, readShare: 0.3 }),
        start: config({ servers: 2, size: 'large', healthChecks: true }),
        levers: ['cache', 'replicas', 'shards'],
        goals: [
            { kind: 'p95', limit: 150 },
            { kind: 'errors', limit: 0.005 },
            { kind: 'budget', limit: 1000 },
        ],
        solution: { servers: 2, size: 'large', healthChecks: true, shards: 2 },
        traps: [
            { config: { servers: 2, size: 'large', healthChecks: true, replicas: 3 }, why: 'Every replica must apply every write too, so each node still gets all 2,100 writes a second.' },
            { config: { servers: 2, size: 'large', healthChecks: true, cache: 'large' }, why: 'A cache only saves reads. The 2,100 writes a second still all go to one database.' },
        ],
        debrief:
            'Two shards each hold half of the users, so each gets half of the reads AND half of the writes: 1,500 queries a second, under the 2,000 it can handle. ' +
            'Replicas and caches only take away reads. When writes are the problem, the data itself has to be split.',
        interview:
            'Replicas scale reads, not writes, because every replica applies every write. When writes outgrow one machine, I shard by a key such as user_id, so each shard takes a slice of both.',
    },
    {
        id: 'photo-uploads',
        title: 'Photo uploads freeze the site',
        lessons: ['sd2-t8'],
        story:
            'One request in 100 is a photo upload, and making its thumbnails takes a whole second of a server\'s time. ' +
            'Right now the server does it before answering, so the user waits, and a worker is stuck the whole time. Photos should be ready within 15 minutes.',
        idea: 'Some work is slow: making a photo\'s thumbnails takes a whole second. If the server does it before it answers, the user waits, and one of the server\'s workers is stuck all that time. A job queue lets the server answer at once ("got it, processing") and leave the job on a queue. Background workers take jobs off the queue and do them at their own pace: here, one photo a second each.',
        world: world({ peakRps: 1000, jobShare: 0.01 }),
        start: config({ servers: 3, healthChecks: true }),
        levers: ['servers', 'queue', 'workers'],
        max: { servers: 8 },
        goals: [
            { kind: 'p95', limit: 200 },
            { kind: 'upload', limit: 300 },
            { kind: 'jobReady', limit: 15 * 60 },
            { kind: 'budget', limit: 720 },
        ],
        solution: { servers: 3, healthChecks: true, queue: true, workers: 10 },
        traps: [
            { config: { servers: 6, healthChecks: true }, why: 'More servers stop the overload, but every upload still waits a whole second for its thumbnails.' },
            { config: { servers: 3, healthChecks: true, queue: true, workers: 4 }, why: 'Four workers make 4 photos a second; 10 arrive at the peak, so the queue grows for hours.' },
        ],
        debrief:
            'The upload request now only saves the photo and puts a job on the queue, so it answers in milliseconds. Background workers make the thumbnails at their own pace. ' +
            'At the evening peak 10 photos arrive a second, and 10 workers keep up. With 9, the queue grows for a while and empties at night: that is the queue doing its job as a buffer.',
        interview:
            'Anything slow that the user doesn\'t need to wait for goes on a queue: the API answers 202 Accepted, workers process the job, and the queue absorbs spikes. I size workers from the peak job rate and how long a job may wait.',
    },
    {
        id: 'far-away-users',
        title: 'Customers on the other side of the world',
        lessons: ['sd1-t4'],
        story:
            'Your servers are in Europe, and most customers are in Australia: every round trip takes 250 ms. A page is one API request plus 24 images and scripts, ' +
            'and a browser fetches about 6 files at a time. Pages should load within 1.2 seconds.',
        idea: 'Distance takes time: a message from Australia to Europe and back takes about a quarter of a second. A page needs many files (images and scripts), and a browser fetches only about 6 at a time, so it makes several of these trips. A CDN keeps copies of the files on servers near your users, so each trip is short, and your own servers don\'t have to send the files at all.',
        world: world({ peakRps: 800, staticFiles: 24, far: true }),
        start: config({ servers: 3, healthChecks: true }),
        levers: ['cdn', 'servers'],
        max: { servers: 12 },
        goals: [
            { kind: 'page', limit: 1200 },
            { kind: 'errors', limit: 0.005 },
            { kind: 'budget', limit: 500 },
        ],
        solution: { servers: 3, healthChecks: true, cdn: true },
        traps: [
            { config: { servers: 10, healthChecks: true }, why: 'More servers stop the overload, but each round of files still crosses the world: about 2 seconds a page.' },
        ],
        debrief:
            'The CDN keeps copies of the images and scripts on servers near your users, so each round of files takes 20 ms instead of 250 ms. ' +
            'And because those 19,200 file requests a second no longer reach your servers, three servers are plenty for the API.',
        interview:
            'Static content goes on a CDN: it cuts latency for distant users and takes most of the requests off the origin. For dynamic data I would also look at a second region.',
    },
    {
        id: 'runaway-script',
        title: 'One client\'s script runs wild',
        lessons: ['sd2-t7'],
        story:
            'From 2 pm to 6 pm a partner\'s buggy script sends 2,500 requests a second, on top of your normal traffic (1,200 a second at the evening peak). ' +
            'It overloads the servers and the database, and real customers get errors.',
        idea: 'Every request uses some of your servers\' and database\'s capacity, whoever sends it. A rate limit gives each client a budget (here, 100 requests a second) and turns the rest away with "429 Too Many Requests". One misbehaving client can then never use up what everyone shares.',
        world: world({ peakRps: 1200, events: [{ kind: 'abuse', from: 14, to: 18, rps: 2500 }] }),
        start: config({ servers: 4, healthChecks: true }),
        levers: ['rateLimit', 'servers', 'replicas'],
        max: { servers: 12 },
        goals: [
            { kind: 'p95', limit: 200 },
            { kind: 'errors', limit: 0.005 },
            { kind: 'budget', limit: 500 },
        ],
        solution: { servers: 4, healthChecks: true, rateLimit: true },
        traps: [
            { config: { servers: 8, healthChecks: true }, why: 'The servers cope, but the script\'s queries still overload the database.' },
            { config: { servers: 8, healthChecks: true, replicas: 1 }, why: 'Enough to absorb the script, but you are paying to serve a bug: far over budget.' },
        ],
        debrief:
            'With a rate limit, the script gets 100 requests a second and a "429 Too Many Requests" for the rest, while every other customer is untouched. ' +
            'Buying servers to absorb one client\'s bug is a race you can\'t win: next time it sends 10,000.',
        interview:
            'I rate-limit per client at the gateway, with a token bucket, so one client can\'t use up capacity everyone shares. Over the limit they get 429 with Retry-After.',
    },
    {
        id: 'black-friday',
        title: 'Black Friday',
        lessons: ['sd0-t2', 'sd2-t1', 'sd2-t4', 'sd2-t5'],
        story:
            'A normal evening peaks at 2,000 requests a second, 92 in 100 of them reads. On Black Friday traffic is three times higher from 6 pm to 10 pm, ' +
            'and at 7 pm one server crashes for two hours. Everything you have learned is available.',
        idea: 'Do the napkin maths first: how many requests arrive at the busiest hour? Then size each part for it, with room to spare. A small server handles about 500 requests a second, and a database about 2,000 queries. A cache takes reads off the database. Keep a spare server in case one crashes, and health checks so the load balancer notices.',
        world: world({
            peakRps: 2000,
            readShare: 0.92,
            events: [
                { kind: 'surge', from: 18, to: 22, factor: 3 },
                { kind: 'crash', from: 19, to: 21, servers: 1 },
            ],
        }),
        start: config({ servers: 4 }),
        levers: ['servers', 'size', 'balancer', 'healthChecks', 'cache', 'replicas', 'shards'],
        goals: [
            { kind: 'p95', limit: 250 },
            { kind: 'errors', limit: 0.01 },
            { kind: 'budget', limit: 1400 },
        ],
        solution: { servers: 14, healthChecks: true, cache: 'medium' },
        traps: [
            { config: { servers: 15, healthChecks: true }, why: 'The servers cope, but 6,000 requests a second means 6,000 queries a second for one database.' },
            { config: { servers: 13, healthChecks: true, cache: 'medium' }, why: 'Fine until the crash: then 12 servers are exactly full, and a full server makes requests wait until they fail.' },
            { config: { servers: 15, cache: 'medium' }, why: 'Without health checks, the crashed server still gets 1 request in 15.' },
        ],
        debrief:
            'Napkin maths first: 3 × 2,000 = 6,000 requests a second. Small servers handle 500 each, so 12 would be completely full: you need at least 13 for headroom, and one spare for the crash, 14. ' +
            'The database would get 6,000 queries a second, so a cache takes the reads off it. Health checks route around the crash.',
        interview:
            'I estimate the peak first, size each tier for it with headroom plus one spare, put a cache in front of the database for the reads, and make sure failures are detected and routed around.',
    },
];

export const missionById = (id: string): Mission | undefined => MISSIONS.find(m => m.id === id);

/** A design in words: "4 small servers · round robin · health checks on · a medium cache". */
export const describeDesign = (c: LabConfig): string =>
    [
        `${c.servers} ${SERVER_SIZES[c.size].label.toLowerCase()} server${c.servers === 1 ? '' : 's'}`,
        c.servers > 1 && (c.balancer === 'round-robin' ? 'round robin' : 'least connections'),
        c.servers > 1 && `health checks ${c.healthChecks ? 'on' : 'off'}`,
        c.rateLimit && 'a rate limit',
        c.cdn && 'a CDN',
        c.cache !== 'none' && `a ${c.cache} cache`,
        c.replicas > 0 && `${c.replicas} read replica${c.replicas === 1 ? '' : 's'}`,
        c.shards > 1 && `${c.shards} shards`,
        c.queue && `a queue with ${c.workers} worker${c.workers === 1 ? '' : 's'}`,
    ]
        .filter(Boolean)
        .join(' · ');

// ============ JUDGING A DAY ============

export const GOAL_LABELS: Record<GoalKind, string> = {
    p95: 'Response time (p95)',
    errors: 'Failed requests',
    page: 'Page load (p95)',
    upload: 'Upload answered',
    jobReady: 'Photo ready',
    budget: 'Monthly cost',
};

/** The value a goal is judged on, at one hour. Budget has no hourly value. */
export const goalValue = (kind: GoalKind, hour: HourResult): number => {
    switch (kind) {
        case 'p95': return hour.p95Ms;
        case 'errors': return hour.errorShare;
        case 'page': return hour.pageMs;
        case 'upload': return hour.uploadMs;
        case 'jobReady': return hour.jobReadyS;
        case 'budget': return 0;
    }
};

export const formatGoal = (kind: GoalKind, value: number): string => {
    switch (kind) {
        case 'p95':
        case 'page':
        case 'upload':
            return formatMs(value);
        case 'errors': return formatShare(value);
        case 'jobReady': return formatWait(value);
        case 'budget': return formatCost(value);
    }
};

/** How a goal reads: "under 200 ms all day". */
export const goalText = (goal: Goal): string =>
    goal.kind === 'budget' ? `${formatGoal('budget', goal.limit)} a month at most` : `under ${formatGoal(goal.kind, goal.limit)} all day`;

export interface GoalResult {
    goal: Goal;
    met: boolean;
    /** The worst value over the day (the cost, for the budget). */
    worst: number;
    /** The hour of the worst value. */
    worstHour: number;
    /** The hours it was missed. */
    missed: number[];
}

export const judge = (day: DayResult, goals: Goal[]): GoalResult[] =>
    goals.map(goal => {
        if (goal.kind === 'budget') return { goal, met: day.cost <= goal.limit, worst: day.cost, worstHour: -1, missed: [] };
        let worst = -Infinity;
        let worstHour = 0;
        const missed: number[] = [];
        day.hours.forEach(hour => {
            const value = goalValue(goal.kind, hour);
            if (value > worst) {
                worst = value;
                worstHour = hour.hour;
            }
            if (!(value <= goal.limit)) missed.push(hour.hour);
        });
        return { goal, met: missed.length === 0, worst, worstHour, missed };
    });

export const allMet = (results: GoalResult[]) => results.every(r => r.met);

export const runMission = (mission: Mission, c: LabConfig) => {
    const day = runDay(c, mission.world);
    return { day, results: judge(day, mission.goals) };
};

/** A mission's design with the learner's changes applied to the levers it allows. */
export const designOf = (mission: Mission, changes: Partial<LabConfig>): LabConfig => ({ ...mission.start, ...changes });

/** 8 pm. */
export const hourLabel = (hour: number) => {
    const h = hour % 24;
    if (h === 0) return 'midnight';
    if (h === 12) return 'noon';
    return h < 12 ? `${h} am` : `${h - 12} pm`;
};
