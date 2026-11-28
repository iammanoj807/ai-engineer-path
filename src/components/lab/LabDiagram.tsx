import { memo, useEffect, useMemo, useState } from 'react';
import { Box } from '@mui/material';
import { C, tint } from '../learning/anim/kit';
import {
    CACHE_HIT,
    DB_MS,
    DB_WORKERS,
    RATE_LIMIT_RPS,
    SERVICE_MS,
    formatCount,
    type HourResult,
    type LabConfig,
    type LabWorld,
} from '../../data/systemDesignLab/model';
import type { Lever } from '../../data/systemDesignLab/missions';

// The Lab's live picture of the learner's system at one hour: every part,
// how busy it is, and requests flowing between them. Dots move along each
// link, more of them where more requests flow, red where requests fail. A part
// the learner could add but hasn't is drawn as a dashed outline, so they can
// see what is available.

const W = 760;
const MONO = 'ui-monospace, SFMono-Regular, Menlo, Consolas, monospace';

/** Calm, busy, nearly full or over. The status colours, never reused for anything else. */
const busyColor = (busy: number) => (busy >= 0.9 ? C.red : busy >= 0.7 ? C.amber : C.green);
const pct = (busy: number) => (Number.isFinite(busy) ? `${Math.round(busy * 100)}%` : '—');

interface Link {
    id: string;
    from: [number, number];
    to: [number, number];
    /** Requests a second along it. */
    rps: number;
    /** Share of them that fail. */
    fail: number;
    dashed?: boolean;
}

const prefersReducedMotion = () => typeof window !== 'undefined' && window.matchMedia?.('(prefers-reduced-motion: reduce)').matches === true;

/** Dots along each link: more where more flows, red for the share that fails. */
const FlowDots = memo(({ links, moving }: { links: Link[]; moving: boolean }) => {
    const [phase, setPhase] = useState(0);
    useEffect(() => {
        if (!moving) return;
        let raf = 0;
        let last = 0;
        const start = performance.now();
        const tick = (now: number) => {
            // About 30 frames a second is smooth enough, and half the work.
            if (now - last > 33) {
                last = now;
                setPhase(((now - start) / 1600) % 1);
            }
            raf = requestAnimationFrame(tick);
        };
        raf = requestAnimationFrame(tick);
        return () => cancelAnimationFrame(raf);
    }, [moving]);
    return (
        <g aria-hidden="true">
            {links.flatMap(link => {
                if (link.rps <= 0) return [];
                const n = Math.max(1, Math.min(7, Math.round(1.5 + Math.log10(Math.max(1, link.rps)) * 1.3)));
                const [x1, y1] = link.from;
                const [x2, y2] = link.to;
                return Array.from({ length: n }, (_, i) => {
                    const t = (phase + i / n) % 1;
                    const failed = (i + 0.5) / n <= link.fail;
                    return <circle key={`${link.id}-${i}`} cx={x1 + (x2 - x1) * t} cy={y1 + (y2 - y1) * t} r={3.2} fill={failed ? C.red : C.cyan} stroke={C.bg} strokeWidth={1.2} />;
                });
            })}
        </g>
    );
});

interface BoxProps {
    x: number;
    y: number;
    w: number;
    h: number;
    color: string;
    /** Drawn as a dashed outline: available, not added. */
    ghost?: boolean;
    rx?: number;
    strong?: boolean;
}

const Part = ({ x, y, w, h, color, ghost, rx = 8, strong }: BoxProps) => (
    <rect
        x={x}
        y={y}
        width={w}
        height={h}
        rx={rx}
        fill={ghost ? 'none' : tint(color, strong ? 0.32 : 0.16)}
        stroke={ghost ? C.dim : color}
        strokeWidth={ghost ? 1.2 : 1.8}
        strokeDasharray={ghost ? '5 4' : undefined}
    />
);

const Label = ({ x, y, children, size = 13, color = C.ink, anchor = 'middle', weight = 700, mono }: { x: number; y: number; children: string; size?: number; color?: string; anchor?: 'start' | 'middle' | 'end'; weight?: number; mono?: boolean }) => (
    <text x={x} y={y} textAnchor={anchor} dominantBaseline="central" fill={color} style={{ fontSize: size, fontWeight: weight, fontFamily: mono ? MONO : 'inherit' }}>
        {children}
    </text>
);

/** A thin bar showing how busy a part is, in its status colour, with the number beside it. */
const BusyBar = ({ x, y, w, busy }: { x: number; y: number; w: number; busy: number }) => {
    const fill = Math.max(0, Math.min(1, Number.isFinite(busy) ? busy : 1));
    const color = busyColor(busy);
    return (
        <g>
            <rect x={x} y={y} width={w} height={5} rx={2.5} fill={tint(C.grey, 0.18)} />
            {fill > 0 && <rect x={x} y={y} width={Math.max(5, w * fill)} height={5} rx={2.5} fill={color} />}
        </g>
    );
};

export interface DiagramProps {
    config: LabConfig;
    world: LabWorld;
    hour: HourResult;
    levers: Lever[];
    /** Move the dots (off while reduced motion is preferred). */
    moving?: boolean;
}

export const LabDiagram = ({ config, world, hour, levers, moving = true }: DiagramProps) => {
    const reduced = useMemo(() => prefersReducedMotion(), []);
    const hasAbuse = world.events.some(e => e.kind === 'abuse');
    const showCdn = world.staticFiles > 0 || config.cdn || levers.includes('cdn');
    const showCache = config.cache !== 'none' || levers.includes('cache');
    const showQueue = world.jobShare > 0 || config.queue || levers.includes('queue');
    const showLb = config.servers > 1 || levers.includes('servers') || levers.includes('balancer') || levers.includes('rateLimit');
    const lbOn = config.servers > 1;

    // ---- Where everything goes ----
    // A small system gets a shorter picture, so the run's result fits on the screen under it.
    const compact = !showQueue && config.servers <= 5 && config.shards <= 2;
    const H = compact ? 300 : 400;
    const mid = H / 2;
    const users = { x: 12, y: mid - 32, w: 100, h: 64 };
    const script = { x: 12, y: mid + 62, w: 100, h: 52 };
    const cdn = { x: 140, y: compact ? 26 : 52, w: 104, h: 52 };
    const lb = { x: 150, y: mid - 28, w: 112, h: 56 };
    const serverTop = 20;
    const serverBottom = showQueue ? 318 : H - 20;
    const two = config.servers > 8;
    const cols = two ? 2 : 1;
    const rows = Math.ceil(config.servers / cols);
    const gap = two ? 5 : 8;
    const colW = two ? 74 : 150;
    const serverX = 316;
    const tileH = Math.min(46, (serverBottom - serverTop - gap * (rows - 1)) / rows);
    const blockH = rows * tileH + (rows - 1) * gap;
    const blockY = serverTop + (serverBottom - serverTop - blockH) / 2;
    const tiles = hour.servers.map((s, i) => {
        const col = two ? i % 2 : 0;
        const row = two ? Math.floor(i / 2) : i;
        return { ...s, i, x: serverX + col * (colW + gap), y: blockY + row * (tileH + gap), w: colW, h: tileH };
    });
    const serversRight = serverX + cols * colW + (cols - 1) * gap;
    const serversMid = serverTop + (serverBottom - serverTop) / 2;
    const cache = { x: 560, y: 20, w: 188, h: 50 };
    const dbTop = showCache ? 92 : 40;
    const dbBottom = showQueue ? 318 : H - 20;
    const nodesPer = 1 + config.replicas;
    const shardGap = 8;
    const shardH = Math.min(64, (dbBottom - dbTop - shardGap * (config.shards - 1)) / config.shards);
    const shardsH = config.shards * shardH + (config.shards - 1) * shardGap;
    const shardsY = dbTop + (dbBottom - dbTop - shardsH) / 2;
    const nodeGap = 5;
    const nodeW = (188 - nodeGap * (nodesPer - 1)) / nodesPer;
    const queueBox = { x: 316, y: 340, w: 150, h: 48 };
    const workersBox = { x: 560, y: 340, w: 188, h: 48 };

    // ---- How much flows where ----
    const jobsRps = hour.rps * world.jobShare;
    const apiRps = hour.rps + hour.abuseRps;
    const staticRps = hour.rps * world.staticFiles;
    const toServers = apiRps + (config.cdn ? 0 : staticRps);
    const upCount = hour.servers.filter(s => s.up).length;
    const routedCount = config.healthChecks ? upCount : hour.servers.length;
    const serverFail = (busy: number) => (busy >= 1 ? 1 - 1 / busy : 0);
    const cacheHit = hour.cacheHit;
    const reads = (hour.rps - jobsRps) * world.readShare + hour.abuseRps;
    const dbBusy = hour.db[0]?.busy ?? 0;

    const links: Link[] = [];
    const entry = lbOn ? lb : tiles[0];
    const entryLeft: [number, number] = [entry.x, entry.y + entry.h / 2];
    links.push({ id: 'u-in', from: [users.x + users.w, users.y + users.h / 2], to: entryLeft, rps: hour.rps, fail: 0 });
    if (hasAbuse) links.push({ id: 's-in', from: [script.x + script.w, script.y + script.h / 2], to: [entryLeft[0], entryLeft[1] + 10], rps: hour.abuseRps, fail: 0 });
    if (config.cdn) links.push({ id: 'u-cdn', from: [users.x + users.w * 0.75, users.y], to: [cdn.x, cdn.y + cdn.h / 2], rps: staticRps, fail: 0 });
    if (lbOn) {
        const share = routedCount > 0 ? toServers / routedCount : 0;
        const routed = (tile: (typeof tiles)[number]) => tile.up || !config.healthChecks;
        const failOf = (tile: (typeof tiles)[number]) => (tile.up ? serverFail(tile.busy) : 1);
        if (!two) {
            tiles.filter(routed).forEach(tile => {
                links.push({ id: `lb-${tile.i}`, from: [lb.x + lb.w, lb.y + lb.h / 2], to: [tile.x, tile.y + tile.h / 2], rps: share, fail: failOf(tile) });
            });
        } else {
            // Two columns: one line to each row, so no line crosses a server to reach the one behind it.
            for (let row = 0; row < rows; row++) {
                const pair = tiles.slice(row * 2, row * 2 + 2).filter(routed);
                if (pair.length === 0) continue;
                const first = tiles[row * 2];
                links.push({
                    id: `lb-row-${row}`,
                    from: [lb.x + lb.w, lb.y + lb.h / 2],
                    to: [first.x, first.y + first.h / 2],
                    rps: share * pair.length,
                    fail: pair.reduce((sum, tile) => sum + failOf(tile), 0) / pair.length,
                });
            }
        }
    }
    const fromServers: [number, number] = [serversRight, serversMid];
    if (config.cache !== 'none') links.push({ id: 'cache', from: fromServers, to: [cache.x, cache.y + cache.h / 2], rps: reads, fail: 0 });
    links.push({ id: 'db', from: fromServers, to: [560, shardsY + shardsH / 2], rps: hour.dbRps / Math.max(1, nodesPer) , fail: serverFail(dbBusy) });
    if (config.queue) {
        links.push({ id: 'q-in', from: [serverX + 40, blockY + blockH], to: [queueBox.x + 40, queueBox.y], rps: jobsRps, fail: 0 });
        links.push({ id: 'q-out', from: [queueBox.x + queueBox.w, queueBox.y + queueBox.h / 2], to: [workersBox.x, workersBox.y + workersBox.h / 2], rps: Math.min(jobsRps, config.workers), fail: 0 });
    }

    const tileText = (tile: (typeof tiles)[number]) => {
        const name = two ? `${tile.i + 1}` : `Server ${tile.i + 1}${tile.old ? ' (old)' : ''}`;
        return tile.up ? `${name} · ${pct(tile.busy)}` : `${name} · down`;
    };

    return (
        <Box
            component="svg"
            viewBox={`0 0 ${W} ${H}`}
            role="img"
            aria-label={`Your system at this hour: ${hour.servers.length} server${hour.servers.length === 1 ? '' : 's'}, ${upCount} up${config.cache !== 'none' ? ', a cache' : ''}, ${hour.db.length} database node${hour.db.length === 1 ? '' : 's'}.`}
            sx={{ display: 'block', width: '100%', height: 'auto', fontFamily: 'inherit' }}
        >
            {/* ---- links (lines first, under everything) ---- */}
            <g stroke={C.dim} strokeWidth={1.4} fill="none">
                {links.map(link => (
                    <line key={link.id} x1={link.from[0]} y1={link.from[1]} x2={link.to[0]} y2={link.to[1]} strokeDasharray={link.dashed ? '4 4' : undefined} />
                ))}
            </g>

            {/* ---- users, and a runaway client ---- */}
            <Part {...users} color={C.cyan} rx={32} />
            <Label x={users.x + users.w / 2} y={users.y + 22}>Users</Label>
            <Label x={users.x + users.w / 2} y={users.y + 44} size={12} color={C.grey} mono>{`${formatCount(hour.rps)}/s`}</Label>
            {hasAbuse && (
                <g>
                    <Part {...script} color={hour.abuseRps > 0 ? C.red : C.grey} ghost={hour.abuseRps === 0 && hour.limitedRps === 0} rx={26} />
                    <Label x={script.x + script.w / 2} y={script.y + 17}>A script</Label>
                    <Label x={script.x + script.w / 2} y={script.y + 36} size={11} color={C.grey} mono>
                        {hour.abuseRps + hour.limitedRps === 0 ? 'quiet' : `${formatCount(hour.abuseRps)}/s`}
                    </Label>
                </g>
            )}

            {/* ---- CDN ---- */}
            {showCdn && (
                <g>
                    <Part {...cdn} color={C.teal} ghost={!config.cdn} />
                    <Label x={cdn.x + cdn.w / 2} y={cdn.y + 18} color={config.cdn ? C.ink : C.dim}>{config.cdn ? 'CDN' : 'no CDN'}</Label>
                    <Label x={cdn.x + cdn.w / 2} y={cdn.y + 36} size={11} color={C.grey} mono>
                        {config.cdn ? `${formatCount(staticRps)} files/s` : 'files from servers'}
                    </Label>
                </g>
            )}

            {/* ---- load balancer ---- */}
            {showLb && (
                <g>
                    <Part {...lb} color={C.blue} ghost={!lbOn} />
                    <Label x={lb.x + lb.w / 2} y={lb.y + 16} color={lbOn ? C.ink : C.dim}>{lbOn ? 'Load balancer' : 'no balancer'}</Label>
                    {lbOn && (
                        <Label x={lb.x + lb.w / 2} y={lb.y + 33} size={10.5} color={C.grey} mono>
                            {config.balancer === 'round-robin' ? 'round robin' : 'least conns'}
                        </Label>
                    )}
                    {lbOn && (
                        <Label x={lb.x + lb.w / 2} y={lb.y + 47} size={10.5} color={config.healthChecks ? C.green : C.grey} mono>
                            {config.healthChecks ? 'health checks ✓' : 'no health checks'}
                        </Label>
                    )}
                    {config.rateLimit && (
                        <g>
                            <rect x={lb.x + 6} y={lb.y + lb.h + 6} width={lb.w - 12} height={20} rx={10} fill={tint(C.violet, 0.3)} stroke={C.violet} strokeWidth={1} />
                            <Label x={lb.x + lb.w / 2} y={lb.y + lb.h + 16} size={10} mono>{`limit ${RATE_LIMIT_RPS}/s each`}</Label>
                        </g>
                    )}
                    {config.rateLimit && hour.limitedRps > 0 && (
                        <Label x={lb.x + lb.w / 2} y={lb.y + lb.h + 38} size={10} color={C.grey} mono>{`${formatCount(hour.limitedRps)}/s refused (429)`}</Label>
                    )}
                </g>
            )}

            {/* ---- app servers ---- */}
            {tiles.map(tile => {
                const color = tile.up ? busyColor(tile.busy) : C.dim;
                const small = tile.h < 32;
                return (
                    <g key={tile.i}>
                        <Part x={tile.x} y={tile.y} w={tile.w} h={tile.h} color={tile.up ? C.violet : C.dim} rx={6} />
                        {!tile.up && <line x1={tile.x + 8} y1={tile.y + 6} x2={tile.x + tile.w - 8} y2={tile.y + tile.h - 6} stroke={C.red} strokeWidth={2} />}
                        <Label x={tile.x + 8} y={small ? tile.y + tile.h / 2 - 2 : tile.y + tile.h / 2 - 6} anchor="start" size={small ? 10.5 : 12} color={tile.up ? C.ink : C.grey}>
                            {tileText(tile)}
                        </Label>
                        {tile.up && <BusyBar x={tile.x + 8} y={tile.y + tile.h - (small ? 7 : 12)} w={tile.w - 16} busy={tile.busy} />}
                        {tile.up && !small && tile.busy >= 1 && <circle cx={tile.x + tile.w - 10} cy={tile.y + 10} r={4} fill={color} />}
                    </g>
                );
            })}
            {!two && (
                <Label x={serverX + colW / 2} y={Math.max(10, blockY - 10)} size={10.5} color={C.grey} mono>
                    {`each takes ${formatCount((hour.servers[hour.servers.length - 1]?.workers ?? 10) * 1000 / SERVICE_MS)}/s`}
                </Label>
            )}

            {/* ---- cache ---- */}
            {showCache && (
                <g>
                    <Part {...cache} color={C.pink} ghost={config.cache === 'none'} />
                    <Label x={cache.x + 12} y={cache.y + 17} anchor="start" color={config.cache === 'none' ? C.dim : C.ink}>
                        {config.cache === 'none' ? 'no cache' : `Cache (${config.cache})`}
                    </Label>
                    <Label x={cache.x + 12} y={cache.y + 35} anchor="start" size={11} color={C.grey} mono>
                        {config.cache === 'none' ? 'every read hits the DB' : `answers ${Math.round(CACHE_HIT[config.cache] * 100)}% of reads${cacheHit === 0 ? ' (empty!)' : ''}`}
                    </Label>
                </g>
            )}

            {/* ---- database: one row per shard, primary then replicas ---- */}
            {Array.from({ length: config.shards }, (_, shard) => {
                const y = shardsY + shard * (shardH + shardGap);
                return (
                    <g key={shard}>
                        {Array.from({ length: nodesPer }, (_, n) => {
                            const x = 560 + n * (nodeW + nodeGap);
                            const narrow = nodeW < 60;
                            const name = n === 0 ? (narrow ? 'P' : config.shards > 1 ? `Shard ${shard + 1}` : 'Database') : narrow ? 'R' : 'Replica';
                            return (
                                <g key={n}>
                                    <Part x={x} y={y} w={nodeW} h={shardH} color={C.green} rx={10} strong={n === 0} />
                                    <Label x={x + nodeW / 2} y={y + shardH / 2 - (shardH >= 40 ? 8 : 4)} size={narrow ? 11 : 12}>{name}</Label>
                                    {shardH >= 40 && <Label x={x + nodeW / 2} y={y + shardH / 2 + 8} size={10.5} color={C.grey} mono>{pct(dbBusy)}</Label>}
                                    <BusyBar x={x + 5} y={y + shardH - 9} w={nodeW - 10} busy={dbBusy} />
                                </g>
                            );
                        })}
                    </g>
                );
            })}
            <Label x={748} y={Math.min(dbBottom + 12, H - 6)} anchor="end" size={10.5} color={C.grey} mono>
                {`${formatCount(hour.dbRps / Math.max(1, hour.db.length))} of ${formatCount((DB_WORKERS * 1000) / DB_MS)} queries/s${hour.db.length > 1 ? ' each' : ''}`}
            </Label>

            {/* ---- queue and workers ---- */}
            {showQueue && (
                <g>
                    <Part {...queueBox} color={C.amber} ghost={!config.queue} />
                    <Label x={queueBox.x + 12} y={queueBox.y + 16} anchor="start" color={config.queue ? C.ink : C.dim}>{config.queue ? 'Queue' : 'no queue'}</Label>
                    <Label x={queueBox.x + 12} y={queueBox.y + 34} anchor="start" size={11} color={C.grey} mono>
                        {config.queue ? `${formatCount(hour.backlog)} waiting` : 'jobs run on servers'}
                    </Label>
                    <Part {...workersBox} color={C.amber} ghost={!config.queue} />
                    <Label x={workersBox.x + 12} y={workersBox.y + 16} anchor="start" color={config.queue ? C.ink : C.dim}>
                        {config.queue ? `${config.workers} worker${config.workers === 1 ? '' : 's'}` : 'no workers'}
                    </Label>
                    {config.queue && config.workers > 0 && <BusyBar x={workersBox.x + 12} y={workersBox.y + 32} w={workersBox.w - 60} busy={hour.workerBusy} />}
                    {config.queue && config.workers > 0 && (
                        <Label x={workersBox.x + workersBox.w - 10} y={workersBox.y + 34} anchor="end" size={11} color={C.grey} mono>{pct(hour.workerBusy)}</Label>
                    )}
                </g>
            )}

            <FlowDots links={links} moving={moving && !reduced} />
        </Box>
    );
};
