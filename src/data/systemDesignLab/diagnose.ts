// What went wrong in a Lab run, in plain words: the first hour a goal was
// missed, which part of the system was the bottleneck, and the numbers that
// show it. This is the feedback that teaches, so every sentence names the
// cause, not only the symptom.

import {
    DB_WORKERS,
    DB_MS,
    FAR_RTT_MS,
    JOB_MS,
    PARALLEL_DOWNLOADS,
    SERVICE_MS,
    costParts,
    formatCost,
    formatCount,
    formatMs,
    formatShare,
    type DayResult,
    type HourResult,
    type LabConfig,
    type LabWorld,
} from './model';
import { hourLabel, type GoalResult, type Lever } from './missions';

const pct = (busy: number) => `${Math.round(busy * 100)}%`;

const dbCapacity = (DB_WORKERS * 1000) / DB_MS;

/** "1 request in 4". */
const oneIn = (share: number) => `1 request in ${Math.round(1 / share)}`;

/** The busiest server that is up this hour. */
const busiestServer = (hour: HourResult) =>
    hour.servers.reduce<{ index: number; busy: number }>((best, s, index) => (s.up && s.busy > best.busy ? { index, busy: s.busy } : best), { index: -1, busy: 0 });

/** Why requests were slow or failed at this hour, most basic cause first. */
const causeAt = (hour: HourResult, config: LabConfig, world: LabWorld): string[] => {
    const at = hourLabel(hour.hour);
    const out: string[] = [];
    const up = hour.servers.filter(s => s.up).length;
    const down = hour.servers.length - up;
    if (up === 0) {
        out.push(`At ${at} your only server went down, so every request failed. One server is a single point of failure.`);
        return out;
    }
    if (hour.deadRps > 0) {
        out.push(`At ${at} ${down === 1 ? 'a server' : `${down} servers`} went down, but the load balancer kept sending ${oneIn(down / hour.servers.length)} to ${down === 1 ? 'it' : 'them'}, and those all failed. Something has to notice that a server is dead.`);
    }
    if (hour.abuseRps > 0) {
        out.push(`At ${at} one client was sending ${formatCount(hour.abuseRps)} requests a second, ${hour.rps > 0 ? `${+(hour.abuseRps / hour.rps).toFixed(1)} times` : 'more than'} all your real customers together.`);
    }
    const busiest = busiestServer(hour);
    const server = busiest.index >= 0 ? hour.servers[busiest.index] : undefined;
    const capacity = server ? (server.workers * 1000) / SERVICE_MS : 0;
    if (server?.old && config.balancer === 'round-robin' && up > 1 && busiest.busy >= 0.9) {
        out.push(
            `At ${at} round robin gave the old machine as many requests as the others, but it can take only ${formatCount(capacity)} a second. ` +
                (busiest.busy >= 1 ? `It was ${pct(busiest.busy)} busy, so its requests waited and failed.` : `It was ${pct(busiest.busy)} busy, so its requests waited in a long line.`),
        );
    } else if (busiest.busy >= 1) {
        out.push(
            busiest.busy < 1.005
                ? `At ${at} the servers were completely full (100% busy), so the line of waiting requests only grew, and requests waited until they gave up.`
                : `At ${at} the servers needed to be ${pct(busiest.busy)} busy: more work than they can do. The extra requests failed, and the rest waited in line until they gave up.`,
        );
        if (down > 0 && config.healthChecks) out.push(`${down === 1 ? 'One server was' : `${down} servers were`} down, so the others had to carry ${down === 1 ? 'its' : 'their'} share.`);
        if (world.staticFiles > 0 && !config.cdn) out.push(`Most of those requests are images and scripts: ${formatCount(hour.rps * world.staticFiles)} a second, all crossing the world to your servers.`);
    } else if (busiest.busy >= 0.9) {
        out.push(`At ${at} the servers were ${pct(busiest.busy)} busy. Near 100% the line of waiting requests grows very fast, and so does the slow end.`);
    }
    if (world.jobShare > 0 && !config.queue) {
        out.push(`The photo jobs run on the servers: each one holds a worker for a whole second (${formatCount(JOB_MS)} ms), so quick requests get stuck in line behind them.`);
    }
    const node = hour.db[0];
    if (node && node.busy >= 0.9) {
        const nodes = hour.db.length;
        const perNode = hour.dbRps / nodes;
        const verb = node.busy >= 1 ? 'more than it can handle' : 'close to full, so queries waited in line';
        out.push(
            nodes === 1
                ? `At ${at} the database got ${formatCount(perNode)} queries a second, and it handles about ${formatCount(dbCapacity)}: ${verb}.`
                : `At ${at} each database node got ${formatCount(perNode)} queries a second (it handles about ${formatCount(dbCapacity)}): ${verb}.`,
        );
        if (config.replicas > 0 && world.readShare < 0.5) out.push('Read replicas don\'t help here: every replica must also apply every write, and most queries are writes.');
    }
    return out;
};

/** Sentences explaining each missed goal, most important first. Empty when every goal is met. */
export const diagnose = (day: DayResult, results: GoalResult[], config: LabConfig, world: LabWorld): string[] => {
    const out: string[] = [];
    const add = (lines: string[]) => lines.forEach(line => !out.includes(line) && out.push(line));

    const missedRequests = results.filter(r => !r.met && (r.goal.kind === 'p95' || r.goal.kind === 'errors'));
    if (missedRequests.length > 0) {
        const first = Math.min(...missedRequests.map(r => r.missed[0]));
        const hour = day.hours[first];
        const causes = causeAt(hour, config, world);
        if (causes.length > 0) add(causes);
        else add([`At ${hourLabel(first)} the slowest requests took ${formatMs(hour.p95Ms)}, and ${formatShare(hour.errorShare)} failed.`]);
    }

    const page = results.find(r => r.goal.kind === 'page' && !r.met);
    if (page) {
        const hour = day.hours[page.missed[0]];
        const rounds = Math.ceil(world.staticFiles / PARALLEL_DOWNLOADS);
        if (!config.cdn) add([`A page needs ${rounds} rounds of files (${world.staticFiles} files, ${PARALLEL_DOWNLOADS} at a time), and each round crosses the world and back: ${rounds} × ${FAR_RTT_MS} ms. More servers can't make light travel faster.`]);
        else add(causeAt(hour, config, world));
    }

    const upload = results.find(r => r.goal.kind === 'upload' && !r.met);
    if (upload) {
        if (!config.queue) add([`Each upload waits for its thumbnails before it answers: that alone is ${formatCount(JOB_MS)} ms, however many servers you have.`]);
        else add(causeAt(day.hours[upload.missed[0]], config, world));
    }

    const ready = results.find(r => r.goal.kind === 'jobReady' && !r.met);
    if (ready && config.queue) {
        const hour = day.hours[ready.worstHour];
        const peakJobs = Math.max(...day.hours.map(h => h.rps * world.jobShare));
        add([
            config.workers === 0
                ? 'Jobs go on the queue, but no workers take them off it.'
                : `At the peak ${formatCount(peakJobs)} photos arrive a second, and ${config.workers} worker${config.workers === 1 ? '' : 's'} finish ${config.workers} a second. By ${hourLabel(hour.hour)}, ${formatCount(hour.backlog)} photos were waiting.`,
        ]);
    }

    const budget = results.find(r => r.goal.kind === 'budget' && !r.met);
    if (budget) {
        const over = budget.worst - budget.goal.limit;
        const parts = costParts(config, world).filter(([, dollars]) => dollars > 0);
        const lines = [
            `This design costs ${formatCost(budget.worst)} a month: ${formatCost(over)} over the budget. ` +
                `The money goes on ${parts.map(([name, dollars]) => `${name} (${formatCost(dollars)})`).join(', ')}.`,
        ];
        // Idle servers are only worth pointing out when nothing else went wrong.
        const peakServerBusy = Math.max(...day.hours.map(h => busiestServer(h).busy));
        if (results.every(r => r.met || r.goal.kind === 'budget') && peakServerBusy < 0.6 && config.servers > 1) {
            lines.push(`Even at the busiest hour your servers are at most ${pct(peakServerBusy)} busy, so you are paying for servers that sit idle.`);
        }
        add(lines);
    }
    return out;
};

// ============ WHAT TO TRY ============

/** One next step, and the control it uses. */
export interface Suggestion {
    lever: Lever;
    text: string;
}

/**
 * What to change next, in plain words that name the control to use. Only
 * controls the mission offers are suggested, the most direct fix first. It
 * points the way without giving the numbers away: the learner still works out
 * how many.
 */
export const suggest = (day: DayResult, results: GoalResult[], config: LabConfig, world: LabWorld, levers: Lever[]): Suggestion[] => {
    const out: Suggestion[] = [];
    // One suggestion per control: the first reason given for it is the one that matters.
    const offer = (lever: Lever, text: string) => {
        if (levers.includes(lever) && !out.some(s => s.lever === lever)) out.push({ lever, text });
    };
    const oldHeldBack = world.oldServer && config.balancer === 'round-robin' && config.servers > 1;

    const missedRequests = results.filter(r => !r.met && (r.goal.kind === 'p95' || r.goal.kind === 'errors'));
    if (missedRequests.length > 0) {
        const first = Math.min(...missedRequests.map(r => r.missed[0]));
        const hour = day.hours[first];
        const up = hour.servers.filter(s => s.up).length;
        const down = hour.servers.length - up;
        const busiest = busiestServer(hour);
        const old = busiest.index >= 0 && hour.servers[busiest.index].old;
        // A fix aimed at the cause comes first; buying capacity for a problem it doesn't solve is a trap.
        const direct: [boolean, Lever, string][] = [
            [up === 0, 'servers', 'Add a second server (press + next to App servers). With two, one crash no longer takes everything down.'],
            [hour.deadRps > 0 && !config.healthChecks, 'healthChecks', 'Switch Health checks on, so the load balancer stops sending requests to the server that died.'],
            [hour.abuseRps > 0 && !config.rateLimit, 'rateLimit', 'Switch the Rate limit on. The script gets its 100 requests a second, and the rest are turned away before they reach your servers.'],
            [world.jobShare > 0 && !config.queue, 'queue', 'Switch the Job queue on, so the slow photo jobs leave the servers and quick requests stop waiting behind them.'],
            [world.staticFiles > 0 && !config.cdn, 'cdn', 'Switch the CDN on. It sends the images and scripts, so your servers only answer the API.'],
            [old && oldHeldBack && busiest.busy >= 0.9, 'balancer', 'Switch Load balancing to Least connections, so the old machine is sent fewer requests than the others.'],
        ];
        const causes = direct.filter(([applies, lever]) => applies && levers.includes(lever));
        causes.forEach(([, lever, text]) => offer(lever, text));
        if (causes.length === 0) {
            // Size the servers for the busiest hour, not the first one that broke.
            const peak = day.hours.reduce((a, b) => (busiestServer(b).busy > busiestServer(a).busy ? b : a));
            if (up > 0 && busiestServer(peak).busy >= 0.9) {
                offer(
                    'servers',
                    down > 0 && config.healthChecks
                        ? 'Add one more server (press + next to App servers), so the others can carry a crashed server\'s share.'
                        : `Add servers (press + next to App servers) until, at ${hourLabel(peak.hour)}, the busiest hour, every server is under about 80% busy. Tap that hour on the chart to see it in the diagram.`,
                );
                offer('size', levers.includes('servers') ? 'Or choose a bigger server size.' : 'Choose a bigger server size.');
            }
        }
        const node = hour.db[0];
        if (causes.length === 0 && node && node.busy >= 0.9) {
            if (world.readShare < 0.5) {
                offer('shards', 'Split the data across more Shards (press + next to Shards). Each shard takes its share of the writes as well as the reads.');
            } else {
                if (config.cache !== 'large') offer('cache', config.cache === 'none' ? 'Add a Cache. Every read it answers never reaches the database.' : 'Choose a bigger Cache. It answers a bigger share of the reads.');
                offer('replicas', levers.includes('cache') ? 'Or add Read replicas (press + next to Read replicas): each one takes a share of the reads.' : 'Add Read replicas (press + next to Read replicas): each one takes a share of the reads.');
            }
        }
    }

    if (results.some(r => r.goal.kind === 'page' && !r.met) && !config.cdn) {
        offer('cdn', 'Switch the CDN on, so the files come from a server near your users instead of crossing the world.');
    }
    if (results.some(r => r.goal.kind === 'upload' && !r.met) && !config.queue) {
        offer('queue', 'Switch the Job queue on. The upload then answers straight away, and a worker makes the thumbnails afterwards.');
    }
    if (results.some(r => r.goal.kind === 'jobReady' && !r.met) && config.queue) {
        offer('workers', 'Add workers (press + next to Workers) until they keep up with the photos at the busiest hour.');
    }

    const budget = results.find(r => r.goal.kind === 'budget' && !r.met);
    if (budget && results.every(r => r.met || r.goal.kind === 'budget')) {
        // It works: now make it cheaper.
        const peakServerBusy = Math.max(...day.hours.map(h => busiestServer(h).busy));
        if (oldHeldBack) offer('balancer', 'Switch to Least connections. Then fewer servers are enough, because the old machine no longer holds the others back.');
        if (world.events.some(e => e.kind === 'abuse') && !config.rateLimit) offer('rateLimit', 'Switch the Rate limit on. Then you don\'t need extra servers just to absorb one client\'s bug.');
        if (peakServerBusy < 0.6 && config.servers > 1) offer('servers', `Remove a server (press − next to App servers). Even at the busiest hour they are only ${pct(peakServerBusy)} busy.`);
        if (config.size !== 'small') offer('size', 'Try small servers. You are paying for power you don\'t use.');
        if (config.cache === 'large') offer('cache', 'Try a smaller Cache. A medium one may answer enough of the reads.');
        if (config.replicas > 0) {
            offer('cache', 'Try a Cache instead of replicas. It costs far less than a whole extra database.');
            offer('replicas', 'Remove a replica (press − next to Read replicas).');
        }
        if (config.queue && Math.max(...day.hours.map(h => h.workerBusy)) < 0.7) offer('workers', 'Remove a worker (press − next to Workers). They are never more than 70% busy.');
    }
    return out;
};
