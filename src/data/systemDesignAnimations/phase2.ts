import type { AnimationSpec, Frame, FrameMetric, Shape } from '../../components/learning/anim/scene';
import { C, arrow, circle, frame, line, measured, rect, seeded, text, tint, type Part } from '../../components/learning/anim/kit';
import { flow, label, type FEdge, type FNode } from './flow';
import { SERVER_SIZES, SERVICE_MS, atPeak, formatCost, formatCount, formatMs, formatShare, type ServerSize } from '../systemDesignLab/model';

// System Design Phase 2: the core ideas for scaling and staying up. Numbers
// shown (downtime, availability, token counts, backoff waits) are computed.
// Load numbers (how busy, how slow, how many fail) come from the System
// Design Lab's model, so a lesson and its Lab mission always agree.

const pct = (x: number, places = 2) => `${+(x * 100).toFixed(places)}%`;
const busy = (x: number) => `${Math.round(x * 100)}% busy`;

/** How busy each server is, and what users see, with this many servers sharing `rps` (health checks on). */
const serverMetrics = (rps: number, up: number, first: [label: string, value: string]): FrameMetric[] => {
    const h = atPeak({ servers: up, healthChecks: true }, { peakRps: rps });
    return [
        { label: first[0], value: first[1] },
        { label: 'Each server', value: busy(h.servers[0].busy), tone: h.servers[0].busy >= 1 ? 'bad' : undefined },
        { label: 'Response time (p95)', value: formatMs(h.p95Ms), tone: h.p95Ms > 1000 ? 'bad' : undefined },
        { label: 'Failed requests', value: formatShare(h.errorShare), tone: h.errorShare > 0.005 ? 'bad' : undefined },
    ];
};

// ============ sd2-t1 · Scalability ============

const scalability = (): AnimationSpec => {
    const machine = (w: number, h: number, specs: string, color: string = C.blue): Shape =>
        rect('m', 200 - w / 2, 150 - h, w, h, { rx: 8, fill: tint(color, 0.3), stroke: color, sw: 2, text: specs, size: 11, weight: 700, mono: true });
    // The three machines are the Lab's small, large and extra-large servers.
    const vm = (size: ServerSize, last = false): FrameMetric[] => [
        { label: 'Handles', value: `${formatCount((SERVER_SIZES[size].workers * 1000) / SERVICE_MS)}/s` },
        { label: 'Cost a month', value: formatCost(SERVER_SIZES[size].cost) },
        { label: 'If it fails', value: 'all down', tone: last ? 'bad' : undefined },
    ];
    const vertical: Frame[] = [
        measured(frame('Vertical scaling: when one server is too slow, buy a bigger one — more CPU, more memory. Nothing else changes.', [machine(90, 50, '4 CPU\n16 GB')]), vm('small')),
        measured(frame('Simple, and it often works for a long time: four times the machine handles about four times the requests.', [machine(130, 80, '16 CPU\n64 GB')]), vm('large'), ['~ 4 → 16 CPUs, 16 → 64 GB']),
        measured(frame('But there is a ceiling — the biggest machine you can buy — and it is still ONE machine. If it fails, everything is down.', [machine(170, 110, '64 CPU\n512 GB', C.red), label('ceil', 200, 28, 'the biggest machine money can buy', C.red, { size: 11, anchor: 'middle', mono: false }), line('cl', 60, 38, 340, 38, { stroke: C.red, sw: 2, dash: '5 4' })]), vm('xl', true), ['~ 16 → 64 CPUs: the biggest size']),
    ];
    const nodes: FNode[] = [
        { id: 'lb', x: 8, y: 100, w: 78, h: 40, label: 'Load\nbalancer', color: C.blue },
        { id: 'a1', x: 140, y: 30, w: 76, label: 'App', color: C.blue },
        { id: 'a2', x: 140, y: 100, w: 76, label: 'App', color: C.blue },
        { id: 'a3', x: 140, y: 170, w: 76, label: 'App', color: C.blue },
        { id: 'redis', x: 290, y: 40, w: 104, h: 40, label: 'Sessions\n(Redis)', kind: 'store', color: C.pink, size: 10 },
        { id: 'db', x: 290, y: 150, w: 104, h: 40, label: 'Database\n+ replicas', kind: 'store', color: C.green, size: 10 },
    ];
    const edges: FEdge[] = [
        { from: 'lb', to: 'a1' }, { from: 'lb', to: 'a2' }, { from: 'lb', to: 'a3' },
        { from: 'a1', to: 'redis' }, { from: 'a2', to: 'redis' }, { from: 'a3', to: 'redis' }, { from: 'a1', to: 'db' }, { from: 'a2', to: 'db' }, { from: 'a3', to: 'db' },
    ];
    // 900 requests a second, and a small server handles 500 (the Lab's model).
    const rps = 900;
    const horizontal = flow(nodes, edges, [
        { caption: `Horizontal scaling: more machines instead of a bigger one. Here one server gets ${rps} requests a second and handles 500. First find the bottleneck — CPU, database, memory or network. (p95, above: the time 95 requests in 100 beat.)`, show: ['lb', 'a1', 'db'], metrics: serverMetrics(rps, 1, ['App servers', '1']) },
        { caption: 'The key trick: make app servers stateless. Login sessions move out of server memory into a shared store (Redis), so any server can handle any user.', show: ['lb', 'a1', 'db', 'redis'], lit: ['redis'], hot: ['a1>redis'], metrics: serverMetrics(rps, 1, ['App servers', '1']), changes: ['+ Shared session store (Redis)'] },
        { caption: `Now just add servers behind the load balancer: three share the ${rps} a second. With auto-scaling they are added when CPU or latency rises.`, show: ['lb', 'a1', 'a2', 'a3', 'db', 'redis'], ok: ['a2', 'a3'], metrics: serverMetrics(rps, 3, ['App servers', '3']), changes: ['+ 2 more app servers'] },
        { caption: 'A server dies? The other two carry on, busier — no single point of failure. Take reads off the database with caches and replicas; shard it when writes become the bottleneck.', bad: ['a2'], hot: ['lb>a1', 'lb>a3'], packets: [{ id: 'u', label: 'user 7', at: ['lb', 'a3', 0.5] }], metrics: serverMetrics(rps, 2, ['App servers', '2 of 3 up']), changes: ['− Server 2 (crashed)'] },
    ]);
    return { title: 'Scaling up (a bigger machine) versus scaling out (more machines)', variants: [{ label: 'Vertical', frames: vertical }, { label: 'Horizontal', frames: horizontal }] };
};

// ============ sd2-t2 · Availability ============

const availability = (): AnimationSpec => {
    const hoursPerYear = 365 * 24;
    const levels = [0.99, 0.999, 0.9999, 0.99999];
    const downtime = (a: number) => {
        const h = (1 - a) * hoursPerYear;
        return h >= 24 ? `${+(h / 24).toFixed(2)} days` : h >= 1 ? `${+h.toFixed(1)} hours` : `${+(h * 60).toFixed(h * 60 >= 10 ? 0 : 1)} minutes`;
    };
    const bars = (upTo: number) => levels.map((a, i) => {
        const on = i <= upTo;
        const w = Math.max(4, Math.log10(((1 - a) * hoursPerYear * 60) / 5) * 56);
        return [
            text(`l${i}`, 92, 60 + i * 42, pct(a, 3), { size: 13, fill: on ? C.ink : C.dim, weight: 700, mono: true, anchor: 'end' }),
            rect(`b${i}`, 100, 48 + i * 42, on ? w : 2, 24, { rx: 4, fill: tint(i === upTo ? C.amber : C.red, 0.5), stroke: 'none' }),
            on && text(`d${i}`, 108 + w, 60 + i * 42, `${downtime(a)} down a year`, { size: 10, fill: C.ink, weight: 700, anchor: 'start' }),
        ];
    });
    const nines: Frame[] = levels.map((a, i) => frame(i === 0
        ? `Availability is the share of time the system works. 99% sounds good — but it allows ${downtime(a)} of downtime a year.`
        : `${pct(a, 3)}: ${downtime(a)} a year. Each extra nine cuts downtime tenfold — and costs much more than the one before.`, [bars(i)]));
    const box = (id: string, x: number, y: number, value: string, color: string) => rect(id, x, y, 74, 34, { rx: 7, fill: tint(color, 0.3), stroke: color, sw: 2, text: value, size: 11, weight: 700, mono: true });
    const series = 0.999 * 0.999;
    const parallel = 1 - (1 - 0.99) ** 2;
    const yearly = (a: number): FrameMetric[] => [
        { label: 'Availability', value: pct(a, 2) },
        { label: 'Down a year', value: downtime(a) },
    ];
    const combine: Frame[] = [
        frame(`Two parts in series — a request needs BOTH: 99.9% × 99.9% = ${pct(series, 1)}. Every part you add in series lowers the total.`, [
            box('s1', 70, 90, 'A 99.9%', C.cyan), arrow('sa', 146, 107, 176, 107, { stroke: C.grey }), box('s2', 178, 90, 'B 99.9%', C.cyan), label('sr', 270, 107, `= ${pct(series, 1)}`, C.amber, { size: 14 }),
        ]),
        frame(`Two redundant copies in parallel — EITHER will do: 1 − 0.01 × 0.01 = ${pct(parallel, 2)}, from two copies that are each only 99%. That is why you remove single points of failure.`, [
            box('p1', 120, 60, 'copy 99%', C.green), box('p2', 120, 130, 'copy 99%', C.green),
            line('pl1', 60, 112, 118, 77, { stroke: C.grey, sw: 2 }), line('pl2', 60, 112, 118, 147, { stroke: C.grey, sw: 2 }), line('pr1', 196, 77, 250, 112, { stroke: C.grey, sw: 2 }), line('pr2', 196, 147, 250, 112, { stroke: C.grey, sw: 2 }),
            label('pr', 260, 112, `= ${pct(parallel, 2)}`, C.green, { size: 14 }),
        ]),
        frame('…as long as the copies fail independently. Put them in different availability zones, check their health every few seconds, and fail over automatically. Then practise the failover.', [
            box('p1', 120, 60, 'zone A', C.green), box('p2', 120, 130, 'zone B', C.red),
            line('pl1', 60, 112, 118, 77, { stroke: C.green, sw: 3 }), line('pl2', 60, 112, 118, 147, { stroke: C.dim, sw: 1.5, dash: '4 3' }), line('pr1', 196, 77, 250, 112, { stroke: C.green, sw: 3 }), line('pr2', 196, 147, 250, 112, { stroke: C.dim, sw: 1.5, dash: '4 3' }),
            label('pr', 260, 112, 'still up', C.green, { size: 14 }),
        ]),
    ].map((f, i) => measured(f, yearly([series, parallel, parallel][i]), [[], ['+ A second copy, in parallel'], ['− Zone B (failed): zone A carries on']][i]));
    return { title: 'Availability: counting the nines, and how redundancy adds them', variants: [{ label: 'The nines', frames: nines }, { label: 'Series and parallel', frames: combine }] };
};

// ============ sd2-t3 · Fault tolerance ============

const faultTolerance = (): AnimationSpec => {
    const rand = seeded(11);
    const base = [100, 200, 400];
    const waits = base.map(b => Math.round(b * (0.75 + rand() * 0.5)));
    const t0 = 20;
    const attempts: number[] = [0];
    waits.forEach(w => attempts.push(attempts[attempts.length - 1] + 300 + w));
    // Fit all four attempts across the picture.
    const scale = 360 / (attempts[attempts.length - 1] + 300);
    const x = (ms: number) => t0 + ms * scale;
    const axis: Part = [line('ax', t0, 170, 386, 170, { stroke: C.dim, sw: 1.5 }), text('axt', 392, 184, 'time (ms) →', { size: 10, fill: C.dim, anchor: 'end' })];
    const call = (i: number, ok: boolean) => [
        rect(`c${i}`, x(attempts[i]), 120, 300 * scale, 26, { rx: 5, fill: tint(ok ? C.green : C.red, 0.4), stroke: ok ? C.green : C.red, sw: 1.5, text: ok ? 'ok' : 'timeout', size: 10, weight: 700, mono: true }),
    ];
    const wait = (i: number) => [
        line(`w${i}`, x(attempts[i] + 300), 133, x(attempts[i + 1]), 133, { stroke: C.amber, sw: 2, dash: '3 3' }),
        text(`wt${i}`, (x(attempts[i] + 300) + x(attempts[i + 1])) / 2, 108, `${waits[i]}`, { size: 10, fill: C.amber, weight: 700, mono: true }),
    ];
    const tries = (n: number, waited: number, ok: boolean): FrameMetric[] => [
        { label: 'Attempts', value: `${n}` },
        { label: 'Waited between', value: `${waited} ms` },
        { label: 'Result', value: ok ? 'ok' : 'timed out', tone: ok ? 'good' : 'bad' },
    ];
    const retry: Frame[] = [
        measured(frame('Never wait forever: give each call a timeout — 300 ms here. The first call is too slow, so it is abandoned.', [axis, call(0, false)]), tries(1, 0, false)),
        measured(frame(`The failure looks temporary and the call is safe to repeat, so retry — but wait first. Exponential backoff: about 100 ms, then 200, then 400. Here: ${waits[0]} ms.`, [axis, call(0, false), wait(0), call(1, false)]), tries(2, waits[0], false)),
        measured(frame(`Each wait doubles, plus a little randomness (jitter) — ${waits[1]} ms, then ${waits[2]} ms — so many clients retrying at once don't all hit the service at the same instant.`, [axis, call(0, false), wait(0), call(1, false), wait(1), call(2, false), wait(2), call(3, true)]), tries(4, waits[0] + waits[1] + waits[2], true)),
    ];
    const nodes: FNode[] = [
        { id: 'checkout', x: 8, y: 100, w: 88, label: 'Checkout', color: C.cyan },
        { id: 'breaker', x: 150, y: 94, w: 96, h: 46, label: 'circuit\nbreaker', color: C.green, size: 10 },
        { id: 'recs', x: 300, y: 100, w: 94, label: 'Recommend-\nations', h: 40, color: C.violet, size: 10 },
    ];
    const edges: FEdge[] = [{ from: 'checkout', to: 'breaker' }, { from: 'breaker', to: 'recs' }];
    // What checkout waits for each call: about 50 ms when recommendations is healthy, the full timeout when it is not.
    const state = (breakerState: string, waitMs: number, through: string, tone?: 'good' | 'bad'): FrameMetric[] => [
        { label: 'Breaker', value: breakerState },
        { label: 'Checkout waits', value: `${waitMs} ms`, tone },
        { label: 'Calls getting through', value: through },
    ];
    const breaker = flow(nodes, edges, [
        { caption: 'Checkout calls a recommendations service through a circuit breaker. Closed: calls pass straight through, and answer in about 50 ms.', hot: ['checkout>breaker', 'breaker>recs'], packets: [{ id: 'c', label: 'call', at: ['breaker', 'recs', 0.5] }], badges: { breaker: 'CLOSED' }, metrics: state('closed', 50, 'all') },
        { caption: 'Recommendations slows down. Each failing call makes checkout wait the whole 300 ms timeout. The breaker counts failures: half the calls in the last 10 seconds have timed out…', bad: ['recs'], hot: ['breaker>recs'], packets: [{ id: 'c', label: 'timeout', at: ['breaker', 'recs', 0.5], color: C.red }], badges: { breaker: '5/10 failed' }, metrics: state('closed', 300, 'all', 'bad') },
        { caption: '…so it OPENS: for the next 30 seconds every call fails instantly, without touching the struggling service. It gets room to recover.', lit: ['breaker'], bad: ['recs'], dim: ['recs'], packets: [{ id: 'c', label: 'fail fast', at: 'breaker', color: C.red }], badges: { breaker: 'OPEN' }, metrics: state('open', 0, 'none', 'good'), changes: ['~ Breaker: closed → open'] },
        { caption: 'Meanwhile checkout uses a fallback: the page loads without recommendations, or with cached ones. Checkout itself stays fast.', ok: ['checkout'], lit: ['breaker'], packets: [{ id: 'c', label: 'fallback', at: ['checkout', 'breaker', 0.5], color: C.green }], badges: { breaker: 'OPEN' }, metrics: state('open', 0, 'none', 'good'), changes: ['+ Fallback: the page without recommendations'] },
        { caption: 'After the wait: HALF-OPEN. A few test calls go through. They succeed, so the breaker CLOSES and normal service resumes. (If they had failed, it would open again.)', ok: ['breaker', 'recs'], hot: ['breaker>recs'], packets: [{ id: 'c', label: 'test ✓', at: ['breaker', 'recs', 0.5], color: C.green }], badges: { breaker: 'HALF-OPEN → CLOSED' }, metrics: state('closed again', 50, 'all again'), changes: ['~ Breaker: open → half-open → closed'] },
    ]);
    return { title: 'Staying up when something fails: timeouts, backoff, circuit breakers', variants: [{ label: 'Retry with backoff', frames: retry }, { label: 'Circuit breaker', frames: breaker }] };
};

// ============ sd2-t4 · Load balancing ============

const loadBalancing = (): AnimationSpec => {
    const nodes: FNode[] = [
        { id: 'clients', x: 6, y: 100, w: 70, label: 'Clients', kind: 'client', color: C.cyan },
        { id: 'lb', x: 120, y: 94, w: 86, h: 46, label: 'Load\nbalancer', color: C.blue },
        { id: 's1', x: 296, y: 30, w: 98, label: 'server 1', color: C.violet },
        { id: 's2', x: 296, y: 100, w: 98, label: 'server 2', color: C.violet },
        { id: 's3', x: 296, y: 170, w: 98, label: 'server 3', color: C.violet },
    ];
    const edges: FEdge[] = [{ from: 'clients', to: 'lb' }, { from: 'lb', to: 's1' }, { from: 'lb', to: 's2' }, { from: 'lb', to: 's3' }];
    const servers = ['s1', 's2', 's3'];
    // Round robin over the healthy servers only.
    const healthy = (down: string | null) => servers.filter(s => s !== down);
    const assign: string[] = [];
    for (let i = 0; i < 6; i++) assign.push(healthy(i >= 3 ? 's2' : null)[i % (i >= 3 ? 2 : 3)]);
    // 900 requests a second over small servers that handle 500 each (the Lab's model).
    const rps = 900;
    const three = serverMetrics(rps, 3, ['In rotation', '3 of 3']);
    const two = serverMetrics(rps, 2, ['In rotation', '2 of 3']);
    const busier = `~ Servers 1 and 3: ${three[1].value.replace(' busy', '')} → ${two[1].value}`;
    const rr = flow(nodes, edges, [
        { caption: `Clients only ever see the load balancer's address. It makes many servers look like one. Here ${rps} requests a second share three servers. (p95, above: the time 95 requests in 100 beat.)`, lit: ['lb'], metrics: three },
        ...[0, 1, 2].map(i => ({ caption: `Round robin: request ${i + 1} goes to the next server in turn — ${assign[i].replace('s', 'server ')}.`, hot: [`lb>${assign[i]}`], packets: [{ id: 'r', label: `req ${i + 1}`, at: ['lb', assign[i], 0.6] as [string, string, number] }], hold: 2400, metrics: three })),
        { caption: 'Every few seconds it calls each server\'s /health endpoint. Server 2 fails a few checks in a row, so it is taken out of the rotation. The other two take its share, and get busier.', bad: ['s2'], badges: { s2: '/health ✗' }, metrics: two, changes: ['− Server 2, from the rotation', busier] },
        ...[3, 4].map(i => ({ caption: `Request ${i + 1} → ${assign[i].replace('s', 'server ')}. Traffic goes only to healthy servers, so nothing fails; server 2 is added back when it recovers.`, bad: ['s2'], hot: [`lb>${assign[i]}`], packets: [{ id: 'r', label: `req ${i + 1}`, at: ['lb', assign[i], 0.6] as [string, string, number] }], hold: 2600, metrics: two })),
    ]);
    const conns = [7, 2, 5];
    const least = flow(nodes, edges, [
        { caption: 'Least connections: the balancer tracks how many requests each server is busy with right now.', badges: { s1: `${conns[0]} busy`, s2: `${conns[1]} busy`, s3: `${conns[2]} busy` } },
        { caption: 'A new request goes to the least busy server — server 2 — which is fairer when some requests take much longer than others.', hot: ['lb>s2'], ok: ['s2'], packets: [{ id: 'r', label: 'new', at: ['lb', 's2', 0.6] }], badges: { s1: `${conns[0]} busy`, s2: `${conns[1] + 1} busy`, s3: `${conns[2]} busy` } },
        { caption: 'A layer 7 balancer can also read the request itself — path, headers, cookies — and route /api to API servers and /images to a media service.', lit: ['lb'], badges: { lb: 'layer 7' } },
    ]);
    return { title: 'Load balancing: spread the work, skip the broken servers', variants: [{ label: 'Round robin + health checks', frames: rr }, { label: 'Least connections', frames: least }] };
};

// ============ sd2-t5 · Caching ============

const caching = (): AnimationSpec => {
    const nodes: FNode[] = [
        { id: 'app', x: 8, y: 100, w: 80, label: 'App', color: C.blue },
        { id: 'redis', x: 160, y: 30, w: 96, h: 40, label: 'Cache\n(Redis)', kind: 'store', color: C.pink },
        { id: 'db', x: 160, y: 170, w: 96, h: 40, label: 'Database', kind: 'store', color: C.green },
    ];
    const edges: FEdge[] = [{ from: 'app', to: 'redis' }, { from: 'app', to: 'db' }];
    const note = (value: string, color: string = C.ink): [string, string?][] => [[value, color]];
    const reads = (last: string, reachedDb: string): FrameMetric[] => [
        { label: 'Last read', value: last },
        { label: 'Reads reaching the database', value: reachedDb },
    ];
    const frames = flow(nodes, edges, [
        { caption: 'A request needs product 42. Cache-aside: ask the cache first, for the key "product:42".', hot: ['app>redis'], packets: [{ id: 'r', label: 'product:42?', at: ['app', 'redis', 0.55] }], metrics: reads('…', '0 of 1') },
        { caption: 'Miss: it isn\'t there. Read the database instead — perhaps 5–20 ms.', bad: ['redis'], hot: ['app>db'], packets: [{ id: 'r', label: 'SELECT …42', at: ['app', 'db', 0.55] }], notes: note('miss → database ≈ 5–20 ms', C.red), metrics: reads('miss · 5–20 ms', '1 of 1') },
        { caption: 'Return the result, and store it in the cache with a TTL of, say, 5 minutes.', hot: ['app>redis'], ok: ['redis'], packets: [{ id: 'r', label: 'set 42, 5 min', at: ['app', 'redis', 0.55] }], badges: { redis: 'product:42' }, metrics: reads('miss · 5–20 ms', '1 of 1'), changes: ['+ product:42 in the cache, for 5 minutes'] },
        { caption: 'The next read is a hit: under a millisecond, and the database never sees it.', ok: ['redis'], dim: ['db'], hot: ['app>redis'], packets: [{ id: 'r', label: 'hit', at: ['app', 'redis', 0.55], color: C.green }], badges: { redis: 'product:42' }, notes: note('hit → < 1 ms', C.green), metrics: reads('hit · < 1 ms', '1 of 2') },
        { caption: 'Product 42 changes. Write the database, then DELETE the cache key, so the next read loads the fresh value. Keeping the cache in step is the hard part (invalidation).', hot: ['app>db', 'app>redis'], packets: [{ id: 'r', label: 'del product:42', at: ['app', 'redis', 0.55], color: C.red }], ok: ['db'], metrics: reads('hit · < 1 ms', '1 of 2'), changes: ['~ Product 42, in the database', '− product:42, from the cache'] },
        { caption: 'When the cache is full it evicts keys — usually the least recently used. Watch the hit rate: 95% means only 1 read in 20 reaches the database.', ok: ['redis'], badges: { redis: 'hit rate 95%' }, notes: note('1 read in 20 reaches the database'), metrics: reads('hit · < 1 ms', '1 in 20') },
    ]);
    return { title: 'Cache-aside: check the cache, fall back to the database, keep them in step', variants: [{ label: 'Read, write, invalidate', frames }] };
};

// ============ sd2-t6 · Consistency, CAP and PACELC ============

const cap = (): AnimationSpec => {
    const nodes: FNode[] = [
        { id: 'user', x: 6, y: 30, w: 82, label: 'User in\nLondon', h: 40, kind: 'client', color: C.cyan, size: 10 },
        { id: 'lon', x: 40, y: 120, w: 110, h: 44, label: 'London copy', kind: 'store', color: C.blue },
        { id: 'par', x: 256, y: 120, w: 110, h: 44, label: 'Paris copy', kind: 'store', color: C.blue },
    ];
    const edges: FEdge[] = [{ from: 'user', to: 'lon' }, { from: 'lon', to: 'par', plain: true }];
    const cut: Part = [line('cut', 203, 108, 203, 176, { stroke: C.red, sw: 3, dash: '6 4' }), text('cut-t', 203, 192, 'partition', { size: 10, fill: C.red, weight: 700 })];
    const both = (lon: string, par: string) => ({ lon, par });
    const frames = flow(nodes, edges, [
        { caption: 'Two copies of one account, in London and Paris. Both say £100, and they keep each other in step.', badges: both('£100', '£100') },
        { caption: 'The network between them breaks: a partition. It WILL happen sooner or later. Now a user in London withdraws £80.', badges: both('£100', '£100'), extra: [cut], hot: ['user>lon'], packets: [{ id: 'w', label: 'withdraw £80', at: ['user', 'lon', 0.5] }] },
        { caption: 'A CP system (consistent) refuses, because it can\'t confirm with Paris. Always correct — but some requests fail until the network heals.', bad: ['lon'], badges: both('£100', '£100'), extra: [cut], packets: [{ id: 'w', label: 'refused', at: ['user', 'lon', 0.5], color: C.red }] },
        { caption: 'An AP system (available) accepts: London now says £20 while Paris still says £100. Both keep answering — but a second £80 withdrawal in Paris would overdraw the account.', ok: ['lon'], lit: ['par'], badges: both('£20', '£100'), extra: [cut], packets: [{ id: 'w', label: 'OK', at: ['user', 'lon', 0.5], color: C.green }] },
        { caption: 'When the network heals, the AP system must reconcile the two copies. So during a partition the real choice is consistency OR availability.', badges: both('£20', '£20 (fixed)'), ok: ['lon', 'par'] },
        { caption: 'PACELC adds: Else, with no partition, waiting for both copies before saying "done" is consistent but slower. Even on a good day you trade latency against consistency.', hot: ['lon>par'], packets: [{ id: 'w', label: 'wait for Paris…', at: ['lon', 'par', 0.5] }], badges: both('£20', '£20') },
    ]);
    return { title: 'When copies can\'t talk: choose consistency or availability', variants: [{ label: 'Two copies, one partition', frames }] };
};

// ============ sd2-t7 · Rate limiting and backpressure ============

const rateLimiting = (): AnimationSpec => {
    // The lesson's bucket: holds up to 10 tokens and refills at 1 token a second.
    const capacity = 10;
    const refill = 1;
    const arrivals: [number, number][] = [[0, 6], [1, 6], [4, 3]]; // [second, requests]
    type Snap = { t: number; before: number; served: number; refused: number; after: number };
    const snaps: Snap[] = [];
    let tokens = capacity;
    let last = 0;
    for (const [t, n] of arrivals) {
        tokens = Math.min(capacity, tokens + (t - last) * refill);
        last = t;
        const before = tokens;
        const served = Math.min(n, Math.floor(tokens));
        tokens -= served;
        snaps.push({ t, before, served, refused: n - served, after: tokens });
    }
    const bucket = (n: number, color: string = C.green, before: number | null = null): Part => [
        rect('bucket', 140, 50, 120, 140, { rx: 10, fill: tint(C.blue, 0.06), stroke: C.blue, sw: 2 }),
        text('bucket-t', 200, 40, before === null ? `bucket: ${n} of ${capacity} tokens` : `bucket: ${before} → ${n} tokens`, { size: 11, fill: C.ink, weight: 700 }),
        Array.from({ length: capacity }, (_, i) => circle(`tok${i}`, 162 + (i % 4) * 25, 172 - Math.floor(i / 4) * 30, 10, { fill: tint(color, i < n ? 0.75 : 0.04), stroke: i < n ? color : C.faint, sw: 1.5 })),
    ];
    const reqs = (served: number, refused: number): Part => [
        Array.from({ length: served }, (_, i) => rect(`ok${i}`, 290 + (i % 3) * 34, 60 + Math.floor(i / 3) * 26, 30, 20, { rx: 5, fill: tint(C.green, 0.4), stroke: C.green, sw: 1, text: '200', size: 9, weight: 700, mono: true })),
        Array.from({ length: refused }, (_, i) => rect(`no${i}`, 290 + (i % 3) * 34, 130 + Math.floor(i / 3) * 26, 30, 20, { rx: 5, fill: tint(C.red, 0.4), stroke: C.red, sw: 1, text: '429', size: 9, weight: 700, mono: true })),
    ];
    const refillArrow: Part = [arrow('ref', 90, 110, 136, 110, { stroke: C.cyan, sw: 2 }), text('ref-t', 64, 96, `+${refill} token/s`, { size: 11, fill: C.cyan, weight: 700 })];
    const [s0, s1, s2] = snaps;
    const frames: Frame[] = [
        frame(`Token bucket: each user has a bucket holding up to ${capacity} tokens, refilled at ${refill} token a second.`, [bucket(capacity), refillArrow]),
        frame(`Second ${s0.t}: a burst of ${s0.served + s0.refused} requests. Each takes a token; all ${s0.served} go through. Short bursts are fine. ${s0.after} tokens left.`, [bucket(s0.after, C.green, s0.before), refillArrow, reqs(s0.served, s0.refused)]),
        frame(`Second ${s1.t}: the bucket has refilled to ${s1.before}. ${s1.served + s1.refused} more requests: ${s1.served} get tokens; then the bucket is empty, so the rest (${s1.refused}) get 429 Too Many Requests, with "Retry-After: 1".`, [bucket(s1.after, C.amber, s1.before), refillArrow, reqs(s1.served, s1.refused)]),
        frame(`Second ${s2.t}: after a quiet spell the bucket has refilled to ${s2.before}, so the user's next ${s2.served} requests go through. Sustained abuse is held to ${refill} a second; normal use never notices.`, [bucket(s2.after, C.green, s2.before), refillArrow, reqs(s2.served, s2.refused)]),
        frame('With many gateway servers, each bucket lives in Redis and is updated atomically, so every server shares one count. Inside the system, backpressure does the same job: a full queue stops accepting new work instead of growing forever.', [bucket(s2.after), refillArrow, label('redis', 200, 214, 'buckets in Redis, updated atomically', C.violet, { size: 11, anchor: 'middle', mono: false })]),
    ];
    return { title: 'A token bucket: bursts allowed, abuse refused', variants: [{ label: 'Token bucket', frames }] };
};

// ============ sd2-t8 · Asynchronous processing and queues ============

const queues = (): AnimationSpec => {
    const nodes: FNode[] = [
        { id: 'user', x: 6, y: 30, w: 70, label: 'User', kind: 'client', color: C.cyan },
        { id: 'api', x: 6, y: 120, w: 70, label: 'API', color: C.blue },
        { id: 'q', x: 120, y: 120, w: 120, label: 'queue', kind: 'queue', color: C.amber },
        { id: 'w1', x: 290, y: 70, w: 104, label: 'worker 1', color: C.violet },
        { id: 'w2', x: 290, y: 140, w: 104, label: 'worker 2', color: C.violet },
        { id: 'dlq', x: 120, y: 204, w: 120, label: 'dead-letter queue', kind: 'queue', color: C.red, size: 9 },
    ];
    const edges: FEdge[] = [{ from: 'user', to: 'api' }, { from: 'api', to: 'q' }, { from: 'q', to: 'w1' }, { from: 'q', to: 'w2' }, { from: 'q', to: 'dlq' }];
    const state = (video42: string, waiting: string, lost: string): FrameMetric[] => [
        { label: 'Video 42', value: video42, tone: video42 === 'converted' ? 'good' : undefined },
        { label: 'Waiting in queue', value: waiting },
        { label: 'Videos lost', value: lost },
    ];
    const frames = flow(nodes, edges, [
        { caption: 'A user uploads a video. The API stores the file and puts a message, {video_id: 42}, on a queue.', hot: ['user>api', 'api>q'], packets: [{ id: 'm', label: 'video 42', at: ['api', 'q', 0.6] }], metrics: state('queued', '1', '0') },
        { caption: 'The API replies straight away — "202 Accepted, processing" — instead of making the user wait for the conversion.', ok: ['api'], packets: [{ id: 'm', label: 'video 42', at: 'q' }, { id: 'r', label: '202', at: ['user', 'api', 0.5], color: C.green }], metrics: state('queued', '1', '0') },
        { caption: 'Workers pull messages at their own pace. Worker 1 takes message 42 and starts converting the video.', hot: ['q>w1'], lit: ['w1'], packets: [{ id: 'm', label: 'video 42', at: 'w1' }], metrics: state('converting', '0', '0') },
        { caption: 'Worker 1 crashes before it finishes. It never acknowledged the message, so the queue makes it visible again…', bad: ['w1'], packets: [{ id: 'm', label: 'video 42', at: 'q' }], metrics: state('queued again', '1', '0'), changes: ['− Worker 1 (crashed)'] },
        { caption: '…and worker 2 picks it up and retries. Only when a worker acknowledges the message is it removed for good.', bad: ['w1'], ok: ['w2'], hot: ['q>w2'], packets: [{ id: 'm', label: 'video 42 ✓', at: 'w2', color: C.green }], metrics: state('converted', '0', '0') },
        { caption: 'A message that fails too many times goes to a dead-letter queue for a person to inspect, instead of blocking everything behind it.', hot: ['q>dlq'], lit: ['dlq'], packets: [{ id: 'bad', label: 'video 77', at: 'dlq', color: C.red }], metrics: state('converted', '0', '0 (1 parked)') },
        { caption: '10,000 uploads at once? They simply wait in the queue — it absorbs the spike. Add workers to clear it faster.', lit: ['q'], badges: { q: '10,000 waiting' }, metrics: state('converted', '10,000', '0') },
    ]);
    return { title: 'A queue lets the API answer now and do the slow work later', variants: [{ label: 'Video upload', frames }] };
};

// ============ sd2-t9 · Observability ============

const observability = (): AnimationSpec => {
    const spans: [string, number, number, string][] = [
        ['checkout', 0, 2000, C.cyan],
        ['cart', 60, 250, C.violet],
        ['payment', 260, 1950, C.pink],
        ['payment → DB', 300, 1900, C.red],
    ];
    const x = (ms: number) => 120 + ms * 0.1;
    const waterfall = (upTo: number, hot: number | null): Part => spans.slice(0, upTo).map(([name, a, b, color], i) => [
        text(`sn${i}`, 112, 70 + i * 30, name, { size: 11, fill: C.ink, weight: 700, mono: true, anchor: 'end' }),
        rect(`sp${i}`, x(a), 60 + i * 30, x(b) - x(a), 20, { rx: 4, fill: tint(color, i === hot ? 0.7 : 0.35), stroke: i === hot ? C.amber : color, sw: i === hot ? 2.5 : 1 }),
        text(`st${i}`, x(b) + 4, 70 + i * 30, `${b - a} ms`, { size: 10, fill: C.grey, weight: 700, mono: true, anchor: 'start' }),
    ]);
    const header: Part = [text('h', 10, 32, 'trace 7f3a — one checkout request', { size: 11, fill: C.grey, weight: 700, anchor: 'start', mono: true })];
    const frames: Frame[] = [
        frame('Metrics: the p99 checkout latency jumps from 300 ms to 2 s and stays there. An alert fires — on a symptom users feel, not on a CPU blip.', [
            label('m1', 20, 20, 'p99 checkout latency', C.grey, { size: 11, mono: false }),
            rect('mbar1', 20, 84, 30, 50, { fill: tint(C.green, 0.5) }), rect('mbar2', 56, 84, 30, 50, { fill: tint(C.green, 0.5) }), rect('mbar3', 92, 34, 30, 100, { fill: tint(C.red, 0.6) }),
            text('m300', 52, 146, '300 ms', { size: 10, fill: C.green, weight: 700 }), text('m2s', 107, 146, '2 s', { size: 10, fill: C.red, weight: 700 }),
            label('alert', 160, 90, 'ALERT: p99 above SLO for 5 min', C.red, { size: 12 }),
        ]),
        frame('Traces: the first service created a trace ID and passed it in a header to every service it called. Each records how long its part took.', [header, waterfall(2, null)]),
        frame('Laid out as a waterfall, one bar stands out: the payment service takes about 1.7 s…', [header, waterfall(3, 2)]),
        frame('…and almost all of it is one database call: about 1.6 s.', [header, waterfall(4, 3)]),
        frame('Logs: that service\'s structured logs for trace 7f3a show why — a lock timeout. Metrics said WHEN, the trace said WHERE, the logs said WHY.', [header, waterfall(4, 3), label('log', 10, 196, '{"trace":"7f3a","msg":"lock wait timeout","ms":1600}', C.amber, { size: 10 })]),
    ];
    return { title: 'Metrics say when, traces say where, logs say why', variants: [{ label: 'A slow checkout', frames }] };
};

export const phase2Animations: Record<string, () => AnimationSpec> = {
    'sd2-t1': scalability,
    'sd2-t2': availability,
    'sd2-t3': faultTolerance,
    'sd2-t4': loadBalancing,
    'sd2-t5': caching,
    'sd2-t6': cap,
    'sd2-t7': rateLimiting,
    'sd2-t8': queues,
    'sd2-t9': observability,
};
