import { describe, expect, it } from 'vitest';
import { allSystemDesignTopics } from '../../data/systemDesign';
import {
    BASE_CONFIG,
    BASE_WORLD,
    CACHE_HIT,
    SERVER_SIZES,
    TIMEOUT_MS,
    atPeak,
    costOf,
    erlangC,
    formatCost,
    formatMs,
    formatShare,
    formatWait,
    mix,
    queue,
    runDay,
    waitP95Of,
} from '../../data/systemDesignLab/model';
import { LEVER_MAX, MISSIONS, allMet, designOf, judge, runMission, type Lever } from '../../data/systemDesignLab/missions';
import { diagnose, suggest } from '../../data/systemDesignLab/diagnose';
import { systemDesignForbidden } from '../../data/systemDesignAnimations';

// The Lab's model has to be right: lessons quote its numbers, and learners
// trust what it tells them about their designs.

describe('the queueing model', () => {
    it('matches Erlang C where it is known by hand', () => {
        // One worker: the chance of waiting is how busy it is.
        expect(erlangC(1, 0.5)).toBeCloseTo(0.5, 10);
        expect(erlangC(1, 0.9)).toBeCloseTo(0.9, 10);
        // Two workers, one busy on average: C = 1/3.
        expect(erlangC(2, 1)).toBeCloseTo(1 / 3, 10);
        expect(erlangC(10, 0)).toBe(0);
        expect(erlangC(10, 10)).toBe(1);
    });

    it('gives the M/M/1 wait: S × ρ / (1 − ρ)', () => {
        // 20 ms a request, one worker, half busy: 20 ms of waiting on average.
        expect(queue(25, 1, 20).waitMs).toBeCloseTo(20, 6);
        expect(queue(40, 1, 20).waitMs).toBeCloseTo(80, 6);
    });

    it('waits a little at half load, then more and more steeply towards full', () => {
        const waits = [0.5, 0.7, 0.8, 0.9, 0.95, 0.99].map(busy => queue(500 * busy, 10, 20).waitMs);
        for (let i = 1; i < waits.length; i++) expect(waits[i]).toBeGreaterThan(waits[i - 1]);
        // Each step of 10 points costs more than the one before: the hockey stick.
        expect(waits[3] - waits[2]).toBeGreaterThan(waits[2] - waits[1]);
        expect(waits[0]).toBeLessThan(1);
        expect(waits[5]).toBeGreaterThan(100);
    });

    it('fails the excess above 100%, with no jump at exactly full', () => {
        const over = queue(1000, 10, 20); // twice what it can do
        expect(over.busy).toBeCloseTo(2, 10);
        expect(over.failShare).toBeGreaterThanOrEqual(0.5);
        expect(over.failShare).toBeLessThan(0.52);
        expect(over.waitP95Ms).toBe(TIMEOUT_MS);
        const justUnder = queue(499.9, 10, 20).failShare;
        const justOver = queue(500.1, 10, 20).failShare;
        expect(Math.abs(justOver - justUnder)).toBeLessThan(0.01);
    });

    it('makes uneven jobs wait longer than even ones of the same average', () => {
        const even = mix([[100, 20]]);
        const uneven = mix([[99, 10], [1, 1010]]);
        expect(even.cs2).toBeCloseTo(1, 10);
        expect(uneven.serviceMs).toBeCloseTo(even.serviceMs, 10);
        expect(uneven.cs2).toBeGreaterThan(10);
        expect(queue(400, 10, uneven.serviceMs, uneven.cs2).waitMs).toBeGreaterThan(queue(400, 10, even.serviceMs, even.cs2).waitMs * 5);
    });

    it('finds the p95 of a mix of queues: one overloaded server in two makes the slow end time out', () => {
        const calm = queue(250, 10, 20);
        expect(waitP95Of([[1, calm], [1, calm]])).toBeCloseTo(calm.waitP95Ms, 3);
        expect(waitP95Of([[1, calm], [1, queue(600, 10, 20)]])).toBe(TIMEOUT_MS);
    });
});

describe('a whole system', () => {
    it('lets a cache hit rate of h take away a share h of the database reads', () => {
        const without = atPeak({ servers: 4 }, { peakRps: 1000, readShare: 1 });
        for (const size of ['small', 'medium', 'large'] as const) {
            const withCache = atPeak({ servers: 4, cache: size }, { peakRps: 1000, readShare: 1 });
            expect(withCache.dbRps).toBeCloseTo(without.dbRps * (1 - CACHE_HIT[size]), 6);
        }
    });

    it('spreads reads over replicas, but every replica applies every write', () => {
        const writes = atPeak({ servers: 4, replicas: 3 }, { peakRps: 1000, readShare: 0 });
        const writesAlone = atPeak({ servers: 4 }, { peakRps: 1000, readShare: 0 });
        expect(writes.db[0].busy).toBeCloseTo(writesAlone.db[0].busy, 10);
        const reads = atPeak({ servers: 4, replicas: 3 }, { peakRps: 1000, readShare: 1 });
        const readsAlone = atPeak({ servers: 4 }, { peakRps: 1000, readShare: 1 });
        expect(reads.db[0].busy).toBeCloseTo(readsAlone.db[0].busy / 4, 10);
    });

    it('splits reads and writes alike over shards', () => {
        const one = atPeak({ servers: 4 }, { peakRps: 1000, readShare: 0.5 });
        const two = atPeak({ servers: 4, shards: 2 }, { peakRps: 1000, readShare: 0.5 });
        expect(two.db).toHaveLength(2);
        expect(two.db[0].busy).toBeCloseTo(one.db[0].busy / 2, 10);
    });

    it('fails a dead server\'s share without health checks, and none with them', () => {
        const world = { ...BASE_WORLD, peakRps: 400, events: [{ kind: 'crash' as const, from: 0, to: 24, servers: 1 }] };
        const blind = runDay({ ...BASE_CONFIG, servers: 4 }, world).hours[20];
        expect(blind.errorShare).toBeCloseTo(0.25, 2);
        const checked = runDay({ ...BASE_CONFIG, servers: 4, healthChecks: true }, world).hours[20];
        expect(checked.errorShare).toBeLessThan(0.001);
    });

    it('charges what the price list says', () => {
        expect(costOf({ ...BASE_CONFIG, servers: 4, cache: 'medium', replicas: 1 })).toBe(4 * SERVER_SIZES.small.cost + 20 + 100 + 2 * 200);
        expect(costOf({ ...BASE_CONFIG, servers: 1 })).toBe(SERVER_SIZES.small.cost + 200);
    });

    it('writes numbers the way the lessons do', () => {
        expect(formatMs(81.4)).toBe('81 ms');
        expect(formatMs(1240)).toBe('1.2 s');
        expect(formatShare(0)).toBe('0%');
        expect(formatShare(0.0004)).toBe('< 0.1%');
        expect(formatShare(0.069)).toBe('6.9%');
        expect(formatShare(0.25)).toBe('25%');
        expect(formatCost(1280)).toBe('$1,280');
        expect(formatWait(680)).toBe('11 min');
    });
});

describe('the missions', () => {
    const lessonIds = new Set(allSystemDesignTopics.map(t => t.id));
    const leverOf: Record<keyof typeof BASE_CONFIG, Lever> = {
        servers: 'servers', size: 'size', balancer: 'balancer', healthChecks: 'healthChecks', cache: 'cache',
        replicas: 'replicas', shards: 'shards', queue: 'queue', workers: 'workers', cdn: 'cdn', rateLimit: 'rateLimit',
    };
    /** The levers a design changes from the mission's start. */
    const changed = (mission: (typeof MISSIONS)[number], c: Partial<typeof BASE_CONFIG>) =>
        (Object.keys(c) as (keyof typeof BASE_CONFIG)[]).filter(key => c[key] !== mission.start[key]).map(key => leverOf[key]);

    it('have unique addresses and names, and real lessons to learn first', () => {
        expect(new Set(MISSIONS.map(m => m.id)).size).toBe(MISSIONS.length);
        expect(new Set(MISSIONS.map(m => m.title)).size).toBe(MISSIONS.length);
        for (const m of MISSIONS) {
            expect(m.id).toMatch(/^[a-z0-9-]+$/);
            expect(m.lessons.length, m.id).toBeGreaterThan(0);
            for (const id of m.lessons) expect(lessonIds.has(id), `${m.id}: ${id}`).toBe(true);
            expect(m.world.shape).toHaveLength(24);
        }
    });

    for (const m of MISSIONS) {
        describe(m.id, () => {
            it('starts with a design that misses a goal', () => {
                expect(allMet(runMission(m, m.start).results)).toBe(false);
            });

            it('can be solved with only the levers it offers, within their limits', () => {
                const solution = designOf(m, m.solution);
                const { results } = runMission(m, solution);
                expect(results.filter(r => !r.met).map(r => r.goal.kind)).toEqual([]);
                for (const lever of changed(m, m.solution)) expect(m.levers, `${m.id} changes ${lever}`).toContain(lever);
                for (const key of ['servers', 'replicas', 'shards', 'workers'] as const) {
                    expect(solution[key], `${m.id} ${key}`).toBeLessThanOrEqual(m.max?.[key] ?? LEVER_MAX[key]);
                }
            });

            it('has traps that really fail, using only its levers', () => {
                for (const trap of m.traps) {
                    expect(allMet(runMission(m, designOf(m, trap.config)).results), `${m.id}: ${trap.why}`).toBe(false);
                    for (const lever of changed(m, trap.config)) expect(m.levers, `${m.id} trap changes ${lever}`).toContain(lever);
                }
            });

            it('suggests what to try next, using only its own controls, for its start and every trap, and nothing for the solution', () => {
                for (const c of [m.start, ...m.traps.map(t => designOf(m, t.config))]) {
                    const { day, results } = runMission(m, c);
                    const tips = suggest(day, results, c, m.world, m.levers);
                    expect(tips.length, `${m.id}: ${JSON.stringify(c)}`).toBeGreaterThan(0);
                    for (const tip of tips) expect(m.levers, `${m.id}: ${tip.text}`).toContain(tip.lever);
                }
                const solution = designOf(m, m.solution);
                const solved = runMission(m, solution);
                expect(suggest(solved.day, solved.results, solution, m.world, m.levers)).toEqual([]);
            });

            it('explains what went wrong with the starting design, and nothing for the solution', () => {
                const start = runMission(m, m.start);
                expect(diagnose(start.day, start.results, m.start, m.world).length).toBeGreaterThan(0);
                const solution = designOf(m, m.solution);
                const solved = runMission(m, solution);
                expect(diagnose(solved.day, solved.results, solution, m.world)).toEqual([]);
            });
        });
    }

    it('never shows what a practice question of one of its lessons asks the learner to work out', () => {
        // A lesson links to its missions from its practice step, before the exercises: a mission's
        // text must not give away what those exercises ask.
        const leaks: string[] = [];
        for (const m of MISSIONS) {
            const texts = [m.title, m.story, m.idea, m.debrief, m.interview, ...m.traps.map(t => t.why)];
            for (const id of m.lessons) {
                for (const word of systemDesignForbidden[id] ?? []) if (texts.some(text => text.includes(word))) leaks.push(`${m.id} shows "${word}" (${id})`);
            }
        }
        expect(leaks).toEqual([]);
    });

    it('quotes numbers the model agrees with', () => {
        const byId = Object.fromEntries(MISSIONS.map(m => [m.id, m]));
        // "Four small servers ... at 8 pm they are 80% busy"
        const four = runMission(byId['more-or-bigger'], designOf(byId['more-or-bigger'], byId['more-or-bigger'].solution)).day.hours[20];
        expect(four.servers[0].busy).toBeCloseTo(0.8, 6);
        // "only 855 reads and 300 writes a second reach the database"
        const db = byId['busy-database'];
        expect(runMission(db, designOf(db, db.solution)).day.hours[20].dbRps).toBeCloseTo(855 + 300, 6);
        // "each gets ... 1,500 queries a second"
        const writes = byId['too-many-writes'];
        const sharded = runMission(writes, designOf(writes, writes.solution)).day.hours[20];
        expect(sharded.dbRps / sharded.db.length).toBeCloseTo(1500, 6);
        // "With 9, the queue grows for a while and empties at night"
        const photos = byId['photo-uploads'];
        const nine = runMission(photos, designOf(photos, { queue: true, workers: 9 }));
        expect(allMet(nine.results)).toBe(true);
        expect(Math.max(...nine.day.hours.map(h => h.backlog))).toBeGreaterThan(0);
        expect(nine.day.hours[23].backlog).toBe(0);
        // "Round robin would need seven servers"
        const old = byId['old-machine'];
        const seven = judge(runDay(designOf(old, { servers: 7 }), old.world), old.goals.filter(g => g.kind !== 'budget'));
        const six = judge(runDay(designOf(old, { servers: 6 }), old.world), old.goals.filter(g => g.kind !== 'budget'));
        expect([allMet(six), allMet(seven)]).toEqual([false, true]);
        // "One large server works too, today."
        const more = byId['more-or-bigger'];
        expect(allMet(runMission(more, designOf(more, { size: 'large' })).results)).toBe(true);
    });
});
