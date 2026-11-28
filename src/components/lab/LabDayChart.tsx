import { useLayoutEffect, useRef, useState } from 'react';
import { Box, Typography } from '@mui/material';
import { C, tint } from '../learning/anim/kit';
import { formatCount, type DayResult, type LabWorld } from '../../data/systemDesignLab/model';
import { formatGoal, goalValue, hourLabel, GOAL_LABELS, type Goal, type GoalKind } from '../../data/systemDesignLab/missions';

// The day, hour by hour: small charts stacked on one shared hour axis (never
// two scales on one chart). The top one is the traffic, known before the run.
// The others fill in hour by hour as the day plays, each with its goal as a
// line, so the moment a design breaks is plain to see. Hover or tap an hour
// for its numbers; tapping also shows that hour in the diagram.

const LEFT = 8;
const RIGHT = 8;
const PANEL = 76;
const TITLE = 26;
const AXIS = 22;
const MONO = 'ui-monospace, SFMono-Regular, Menlo, Consolas, monospace';

/** The surface the charts sit on, for the 2px gaps and rings. */
const SURFACE = '#0d1117';
const GRID = '#2a333e';
const TEXT = '#b0bec5';
const INK = '#e6edf3';
const SERIES = C.blue;
const CRITICAL = C.red;

/** A rounded-top column from the baseline: 4px radius at the data end, square at the base. */
const column = (cx: number, base: number, height: number, BAR: number) => {
    const h = Math.max(0, height);
    const r = Math.min(4, h, BAR / 2);
    const l = cx - BAR / 2;
    const rt = cx + BAR / 2;
    const top = base - h;
    return `M${l},${base} L${l},${top + r} Q${l},${top} ${l + r},${top} L${rt - r},${top} Q${rt},${top} ${rt},${top + r} L${rt},${base} Z`;
};

interface Panel {
    kind: 'traffic' | GoalKind;
    title: string;
}

export const LabDayChart = ({
    day,
    world,
    goals,
    revealed,
    selected,
    onSelect,
}: {
    day: DayResult;
    world: LabWorld;
    goals: Goal[];
    /** How many hours of results to show (0 before a run, 24 after). */
    revealed: number;
    selected: number;
    onSelect: (hour: number) => void;
}) => {
    const [hover, setHover] = useState<number | null>(null);
    const boxRef = useRef<HTMLDivElement>(null);
    // Drawn at the width it is shown, so its text stays the size of the page's text.
    const [W, setW] = useState(720);
    useLayoutEffect(() => {
        const element = boxRef.current;
        if (!element) return;
        const measure = () => setW(Math.max(320, Math.round(element.getBoundingClientRect().width)));
        measure();
        if (typeof ResizeObserver === 'undefined') return;
        const observer = new ResizeObserver(measure);
        observer.observe(element);
        return () => observer.disconnect();
    }, []);
    const SLOT = (W - LEFT - RIGHT) / 24;
    const BAR = Math.min(24, SLOT - 2);
    const x = (hour: number) => LEFT + hour * SLOT + SLOT / 2;
    const hourGoals = goals.filter(g => g.kind !== 'budget');
    const panels: Panel[] = [{ kind: 'traffic', title: 'Requests a second (your users)' }, ...hourGoals.map(g => ({ kind: g.kind, title: GOAL_LABELS[g.kind] }))];
    const height = panels.length * (TITLE + PANEL) + AXIS;
    const top = (i: number) => i * (TITLE + PANEL) + TITLE;

    const peak = Math.max(...day.hours.map(h => h.rps), 1);
    const events = world.events;

    const panelMarks = (panel: Panel, i: number) => {
        const y0 = top(i);
        const base = y0 + PANEL;
        if (panel.kind === 'traffic') {
            // Leave room above the columns for the day's events.
            const room = PANEL - 14 - events.length * 14;
            return day.hours.map(h => <path key={h.hour} d={column(x(h.hour), base, (h.rps / peak) * room, BAR)} fill={SERIES} />);
        }
        const goal = hourGoals.find(g => g.kind === panel.kind)!;
        const values = day.hours.slice(0, revealed).map(h => goalValue(panel.kind as GoalKind, h));
        const finite = values.filter(Number.isFinite);
        const max = Math.max(goal.limit * 1.6, ...finite.map(v => v * 1.05));
        const yOf = (v: number) => base - (Math.min(Number.isFinite(v) ? v : max, max) / max) * (PANEL - 4);
        const goalY = yOf(goal.limit);
        const marks = [
            // The goal's own label sits in the title row, where no column can cover it.
            <line key="goal" x1={LEFT} x2={W - RIGHT} y1={goalY} y2={goalY} stroke={TEXT} strokeWidth={1} strokeDasharray="3 3" opacity={0.7} />,
            <text key="goal-t" x={W - RIGHT} y={y0 - 8} textAnchor="end" fill={TEXT} style={{ fontSize: 12, fontWeight: 600 }}>
                {`- - - goal: under ${formatGoal(goal.kind, goal.limit)}`}
            </text>,
        ];
        if (revealed === 0) return marks;
        if (panel.kind === 'errors') {
            // Failures as columns: there are none on a good day, so an empty row means "nothing failed".
            values.forEach((v, hour) => {
                if (v > 0) marks.push(<path key={hour} d={column(x(hour), base, Math.max(2, base - yOf(v)), BAR)} fill={v > goal.limit ? CRITICAL : tint(TEXT, 0.6)} />);
            });
            return marks;
        }
        const points = values.map((v, hour) => [x(hour), yOf(v)] as const);
        marks.push(
            <path key="area" d={`M${points[0][0]},${base} ${points.map(([px, py]) => `L${px},${py}`).join(' ')} L${points[points.length - 1][0]},${base} Z`} fill={SERIES} opacity={0.1} />,
            <polyline key="line" points={points.map(([px, py]) => `${px},${py}`).join(' ')} fill="none" stroke={SERIES} strokeWidth={2} strokeLinejoin="round" strokeLinecap="round" />,
        );
        values.forEach((v, hour) => {
            if (v > goal.limit) marks.push(<circle key={`o${hour}`} cx={x(hour)} cy={yOf(v)} r={4.5} fill={CRITICAL} stroke={SURFACE} strokeWidth={2} />);
        });
        return marks;
    };

    const shown = hover ?? null;
    const tip = shown !== null ? day.hours[shown] : null;
    const tipLeft = shown !== null ? `${(x(shown) / W) * 100}%` : '0';

    return (
        <Box ref={boxRef} sx={{ position: 'relative' }}>
            <Box
                component="svg"
                viewBox={`0 0 ${W} ${height}`}
                role="img"
                aria-label="The day hour by hour: traffic, and each goal's value against its limit. The table below the chart has every number."
                sx={{ display: 'block', width: '100%', height: 'auto', fontFamily: 'inherit', userSelect: 'none' }}
                onMouseLeave={() => setHover(null)}
            >
                {/* The chosen hour, behind everything. */}
                <rect x={x(selected) - SLOT / 2} y={0} width={SLOT} height={height - AXIS + 4} fill={tint(C.violet, 0.14)} rx={4} />
                {panels.map((panel, i) => (
                    <g key={panel.kind}>
                        <text x={LEFT} y={top(i) - 8} fill={INK} style={{ fontSize: 13, fontWeight: 700 }}>
                            {panel.title}
                            {panel.kind === 'traffic' && <tspan fill={TEXT} style={{ fontWeight: 500 }}>{`  peak ${formatCount(peak)}`}</tspan>}
                            {panel.kind !== 'traffic' && revealed === 0 && <tspan fill={TEXT} style={{ fontWeight: 500 }}>{'  · run the day to see'}</tspan>}
                        </text>
                        <line x1={LEFT} x2={W - RIGHT} y1={top(i) + PANEL} y2={top(i) + PANEL} stroke={GRID} strokeWidth={1} />
                        {panelMarks(panel, i)}
                    </g>
                ))}
                {/* What happens during the day, marked on the traffic row. */}
                {events.map((event, i) => {
                    const label = event.kind === 'crash' ? `server down` : event.kind === 'surge' ? `×${event.factor} traffic` : event.kind === 'abuse' ? 'script' : 'cache emptied';
                    const x1 = LEFT + event.from * SLOT;
                    const x2 = LEFT + event.to * SLOT;
                    const y = top(0) + 14 + i * 14;
                    return (
                        <g key={i}>
                            <line x1={x1 + 2} x2={x2 - 2} y1={y} y2={y} stroke={TEXT} strokeWidth={1.5} />
                            <line x1={x1 + 2} x2={x1 + 2} y1={y - 4} y2={y + 4} stroke={TEXT} strokeWidth={1.5} />
                            <text x={x1 + 6} y={y - 4} fill={INK} style={{ fontSize: 10.5, fontWeight: 700 }}>{label}</text>
                        </g>
                    );
                })}
                {/* Hours along the bottom. */}
                {[0, 6, 12, 18, 23].map(hour => (
                    <text key={hour} x={hour === 0 ? LEFT : hour === 23 ? W - RIGHT : x(hour)} y={height - 6} textAnchor={hour === 0 ? 'start' : hour === 23 ? 'end' : 'middle'} fill={TEXT} style={{ fontSize: 12, fontFamily: MONO }}>
                        {hourLabel(hour)}
                    </text>
                ))}
                {/* One tall target per hour, wider than the marks, for hover and tap. */}
                {day.hours.map(h => (
                    <rect
                        key={h.hour}
                        x={LEFT + h.hour * SLOT}
                        y={0}
                        width={SLOT}
                        height={height}
                        fill="transparent"
                        style={{ cursor: 'pointer' }}
                        onMouseEnter={() => setHover(h.hour)}
                        onClick={() => onSelect(h.hour)}
                    >
                        <title>{hourLabel(h.hour)}</title>
                    </rect>
                ))}
            </Box>
            {tip && (
                <Box
                    sx={{
                        position: 'absolute',
                        top: 4,
                        left: tipLeft,
                        transform: shown! > 15 ? 'translateX(calc(-100% - 12px))' : 'translateX(12px)',
                        pointerEvents: 'none',
                        bgcolor: '#151921',
                        border: '1px solid rgba(255,255,255,0.15)',
                        borderRadius: 1.5,
                        px: 1.25,
                        py: 0.75,
                        minWidth: 150,
                        zIndex: 2,
                    }}
                >
                    <Typography sx={{ fontWeight: 800, fontSize: '0.8rem', color: 'text.primary' }}>{hourLabel(tip.hour)}</Typography>
                    <Typography sx={{ fontSize: '0.75rem', color: 'text.secondary' }}>{`${formatCount(tip.rps)} requests/s`}</Typography>
                    {shown! < revealed &&
                        hourGoals.map(g => (
                            <Typography key={g.kind} sx={{ fontSize: '0.75rem', color: 'text.secondary' }}>
                                {`${GOAL_LABELS[g.kind]}: `}
                                <Box component="span" sx={{ color: 'text.primary', fontWeight: 700 }}>{formatGoal(g.kind, goalValue(g.kind, tip))}</Box>
                                {goalValue(g.kind, tip) > g.limit && <Box component="span" sx={{ color: CRITICAL, fontWeight: 800 }}>{' ✗'}</Box>}
                            </Typography>
                        ))}
                    <Typography sx={{ fontSize: '0.7rem', color: 'text.secondary', mt: 0.25 }}>Tap to see this hour</Typography>
                </Box>
            )}
        </Box>
    );
};
