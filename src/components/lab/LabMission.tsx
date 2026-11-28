import { useEffect, useMemo, useRef, useState } from 'react';
import { Link as RouterLink } from 'react-router-dom';
import { Box, Button, Stack, Typography } from '@mui/material';
import PlayArrowRoundedIcon from '@mui/icons-material/PlayArrowRounded';
import SkipNextRoundedIcon from '@mui/icons-material/SkipNextRounded';
import RestartAltRoundedIcon from '@mui/icons-material/RestartAltRounded';
import CheckCircleRoundedIcon from '@mui/icons-material/CheckCircleRounded';
import CancelRoundedIcon from '@mui/icons-material/CancelRounded';
import RadioButtonUncheckedRoundedIcon from '@mui/icons-material/RadioButtonUncheckedRounded';
import ArrowBackRoundedIcon from '@mui/icons-material/ArrowBackRounded';
import ArrowDownwardRoundedIcon from '@mui/icons-material/ArrowDownwardRounded';
import LightbulbRoundedIcon from '@mui/icons-material/LightbulbRounded';
import { C } from '../learning/anim/kit';
import { CONFIDENT, TAP, px, useTextSize } from '../learning/learning';
import { QuoteBox } from '../learning/LearningParts';
import { LAB_PATH } from '../../game/labAddresses';
import { formatCost, formatCount, formatShare, runDay, type LabConfig } from '../../data/systemDesignLab/model';
import {
    GOAL_LABELS,
    MISSIONS,
    allMet,
    describeDesign,
    designOf,
    formatGoal,
    goalText,
    goalValue,
    hourLabel,
    judge,
    type Mission,
} from '../../data/systemDesignLab/missions';
import { diagnose, suggest } from '../../data/systemDesignLab/diagnose';
import { LabDiagram } from './LabDiagram';
import { LabDayChart } from './LabDayChart';
import { LabDayStrip } from './LabDayStrip';
import { LabLevers } from './LabLevers';
import { Heading, LessonChips, NextMission, Reveal } from './labParts';
import { ACCENT, ACCENT_HOVER, CARD, HOUR_MS, SCROLL_MARGIN, prefersReducedMotion } from './labStyle';

// One Lab mission. Written for someone who may arrive with no lesson behind
// them: the idea the mission needs comes first, in plain words; then how the
// page works; then the system, the controls and the run, all in one place, so
// the day plays where the learner is already looking. When something breaks,
// the Lab says what went wrong AND what to try next.

/** What to do on this page, in order. Each control says what it does, too. */
const HOW_TO = [
    'Change your design on the right: + adds, − removes, switches turn a part on or off.',
    'Watch the diagram: it shows the busiest hour, and changes as you change the design.',
    'Press Run the day: 24 hours of traffic go through your design.',
    'Meet every goal. If something breaks, the Lab says what to try.',
] as const;

const RunButton = ({ label, onClick }: { label: string; onClick: () => void }) => (
    <Button variant="contained" startIcon={<PlayArrowRoundedIcon />} onClick={onClick} sx={{ minHeight: TAP, px: 3, flexShrink: 0, whiteSpace: 'nowrap', fontWeight: 800, bgcolor: ACCENT, color: '#0b0f14', '&:hover': { bgcolor: ACCENT_HOVER } }}>
        {label}
    </Button>
);

export const MissionView = ({ mission, number, done, onDone }: { mission: Mission; number: number; done: boolean; onDone: (id: string) => void }) => {
    const t = useTextSize();
    const reduced = useMemo(() => prefersReducedMotion(), []);
    const [changes, setChanges] = useState<Partial<LabConfig>>({});
    const design = designOf(mission, changes);
    const designKey = JSON.stringify(design);
    // eslint-disable-next-line react-hooks/exhaustive-deps
    const day = useMemo(() => runDay(design, mission.world), [designKey, mission]);
    const results = useMemo(() => judge(day, mission.goals), [day, mission]);
    const peakHour = useMemo(() => day.hours.reduce((best, h) => (h.rps > day.hours[best].rps ? h.hour : best), 0), [day]);

    const [run, setRun] = useState<{ design: string; revealed: number } | null>(null);
    const [failedRuns, setFailedRuns] = useState(0);
    const [selected, setSelected] = useState(peakHour);
    const stale = run !== null && run.design !== designKey;
    const playing = run !== null && !stale && run.revealed < 24;
    const finished = run !== null && !stale && run.revealed >= 24;
    const revealed = run === null || stale ? 0 : run.revealed;
    const success = finished && allMet(results);
    const systemRef = useRef<HTMLDivElement>(null);
    const feedbackRef = useRef<HTMLDivElement>(null);

    // Play the day: one more hour every HOUR_MS, the diagram following the clock.
    useEffect(() => {
        if (!playing) return;
        const timer = window.setTimeout(() => {
            setRun(r => (r ? { ...r, revealed: r.revealed + 1 } : r));
            setSelected(run!.revealed);
        }, HOUR_MS);
        return () => window.clearTimeout(timer);
    }, [playing, run]);

    // At the end of the day: show the first hour that broke, and remember a success.
    const firstMiss = Math.min(...results.filter(r => !r.met && r.goal.kind !== 'budget').map(r => r.missed[0]));
    const finishedKey = finished ? run!.design : null;
    useEffect(() => {
        if (!finishedKey) return;
        setSelected(Number.isFinite(firstMiss) ? firstMiss : peakHour);
        if (allMet(results)) onDone(mission.id);
        else setFailedRuns(n => n + 1);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [finishedKey]);

    const startRun = () => {
        setRun({ design: designKey, revealed: reduced ? 24 : 0 });
        // The day plays in the system's card: bring all of it into view.
        systemRef.current?.scrollIntoView({ behavior: reduced ? 'auto' : 'smooth', block: 'start' });
    };
    const change = (next: Partial<LabConfig>) => setChanges(before => ({ ...before, ...next }));
    const reset = () => {
        setChanges({});
        setRun(null);
        setSelected(peakHour);
    };
    const toFeedback = () => feedbackRef.current?.scrollIntoView({ behavior: reduced ? 'auto' : 'smooth', block: 'start' });

    const hour = day.hours[selected];
    const budget = mission.goals.find(g => g.kind === 'budget');
    const hourly = mission.goals.filter(g => g.kind !== 'budget');
    const tiles: { label: string; value: string; over?: boolean }[] = [
        { label: 'Time', value: hourLabel(selected) },
        { label: 'Requests a second', value: formatCount(hour.rps + hour.abuseRps) },
        ...hourly.map(g => ({ label: GOAL_LABELS[g.kind], value: formatGoal(g.kind, goalValue(g.kind, hour)), over: goalValue(g.kind, hour) > g.limit })),
        ...(hourly.some(g => g.kind === 'errors') ? [] : [{ label: GOAL_LABELS.errors, value: formatShare(hour.errorShare), over: hour.errorShare > 0.005 }]),
    ];
    const wrong = finished && !success ? diagnose(day, results, design, mission.world) : [];
    const tries = finished && !success ? suggest(day, results, design, mission.world, mission.levers) : [];
    const missedGoals = results.filter(r => !r.met).length;

    // What the diagram is showing, in words.
    const status = stale
        ? 'You changed the design. Press Run the day to check it.'
        : playing
          ? `Playing the day… ${hourLabel(selected)}`
          : finished
            ? success
                ? `Showing ${hourLabel(selected)}. Tap any hour below to see it.`
                : `Showing ${hourLabel(selected)}, the first hour something went wrong. Tap any hour below to see it.`
            : `Showing ${hourLabel(selected)}${selected === peakHour ? ', the busiest hour' : ''}. It changes as you change your design.`;

    return (
        <Box>
            <Button component={RouterLink} to={LAB_PATH} startIcon={<ArrowBackRoundedIcon />} sx={{ minHeight: TAP, px: 1, mb: 1, color: 'text.secondary' }}>
                All missions
            </Button>
            <Typography variant="caption" sx={{ display: 'block', color: ACCENT, fontWeight: 800, letterSpacing: 1.2 }}>
                {`MISSION ${number} OF ${MISSIONS.length}`}
                {done && <Box component="span" sx={{ color: CONFIDENT }}>{'  ·  COMPLETE'}</Box>}
            </Typography>
            <Typography component="h1" sx={{ fontWeight: 800, color: 'text.primary', fontSize: { xs: `${1.6 * t.heading}rem`, sm: `${2.1 * t.heading}rem` }, lineHeight: 1.2, mt: 0.5, mb: 1.5 }}>
                {mission.title}
            </Typography>
            <Typography variant="body1" sx={{ color: 'text.primary', maxWidth: 820, mb: 2.5 }}>
                {mission.story}
            </Typography>

            {/* ---- the idea it needs, and how this page works ---- */}
            <Box sx={{ display: 'grid', gridTemplateColumns: { xs: 'minmax(0, 1fr)', md: 'minmax(0, 1fr) minmax(0, 1fr)' }, gap: 2, mb: 2 }}>
                <Box sx={{ ...CARD, borderColor: `${ACCENT}55`, bgcolor: 'rgba(179,157,219,0.06)' }}>
                    <Stack direction="row" spacing={1} alignItems="center" sx={{ mb: 1 }}>
                        <LightbulbRoundedIcon sx={{ color: ACCENT, fontSize: 20 }} />
                        <Heading>THE IDEA YOU NEED</Heading>
                    </Stack>
                    <Typography variant="body1" sx={{ color: 'text.primary', mb: 1.5 }}>{mission.idea}</Typography>
                    <Typography sx={{ color: 'text.secondary', fontWeight: 700, fontSize: px(t.small), mb: 0.75 }}>The full lessons:</Typography>
                    <LessonChips ids={mission.lessons} />
                </Box>
                <Box sx={CARD}>
                    <Heading>HOW THIS WORKS</Heading>
                    <Stack component="ol" spacing={1} sx={{ m: 0, pl: 0, listStyle: 'none' }}>
                        {HOW_TO.map((step, i) => (
                            <Stack component="li" key={step} direction="row" spacing={1.25} alignItems="flex-start">
                                <Box sx={{ flexShrink: 0, width: 24, height: 24, borderRadius: '50%', display: 'grid', placeItems: 'center', bgcolor: 'rgba(179,157,219,0.16)', color: ACCENT, fontWeight: 800, fontSize: '0.8rem' }}>
                                    {i + 1}
                                </Box>
                                <Typography sx={{ color: 'text.primary', fontSize: px(t.body2) }}>{step}</Typography>
                            </Stack>
                        ))}
                    </Stack>
                    <Typography sx={{ color: 'text.secondary', fontWeight: 700, fontSize: px(t.small), mt: 1.75, mb: 0.5 }}>Your goals:</Typography>
                    <Stack component="ul" spacing={0.25} sx={{ m: 0, pl: 2.5 }}>
                        {mission.goals.map(g => (
                            <Typography component="li" key={g.kind} sx={{ color: 'text.primary', fontSize: px(t.body2) }}>
                                <strong>{GOAL_LABELS[g.kind]}</strong>
                                {`: ${goalText(g)}.`}
                            </Typography>
                        ))}
                    </Stack>
                    {hourly.some(g => g.kind === 'p95' || g.kind === 'page') && (
                        <Typography sx={{ color: 'text.secondary', fontSize: px(t.small), mt: 0.75 }}>
                            p95 is the time 95 requests in 100 beat: the slow end that real users feel, not the average.
                        </Typography>
                    )}
                </Box>
            </Box>

            {/* ---- the system and its controls; the results under the system ----
                On a phone the order is system, design, results: change things before running the day. */}
            <Box
                sx={{
                    display: 'grid',
                    gridTemplateColumns: { xs: 'minmax(0, 1fr)', md: 'minmax(0, 1fr) 340px' },
                    gridTemplateAreas: { xs: '"diagram" "levers" "results"', md: '"diagram levers" "results levers"' },
                    gridTemplateRows: { md: 'auto 1fr' },
                    gap: 2,
                    alignItems: 'start',
                }}
            >
                <Box ref={systemRef} sx={{ ...CARD, gridArea: 'diagram', minWidth: 0, scrollMarginTop: SCROLL_MARGIN }}>
                    {/* Run, and what the picture shows right now. */}
                    <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.5} alignItems={{ xs: 'stretch', sm: 'center' }} sx={{ mb: 1.5 }}>
                        {playing ? (
                            <Button variant="outlined" startIcon={<SkipNextRoundedIcon />} onClick={() => setRun(r => (r ? { ...r, revealed: 24 } : r))} sx={{ minHeight: TAP, px: 2.5, fontWeight: 800, flexShrink: 0 }}>
                                Skip to the end
                            </Button>
                        ) : (
                            <RunButton label={finished ? 'Run the day again' : 'Run the day'} onClick={startRun} />
                        )}
                        <Typography aria-live="polite" sx={{ color: stale ? C.amber : 'text.secondary', fontSize: px(t.small), fontWeight: playing ? 800 : 500 }}>
                            {status}
                        </Typography>
                    </Stack>

                    <Box sx={{ display: 'grid', gridTemplateColumns: { xs: 'repeat(2, 1fr)', sm: 'repeat(auto-fit, minmax(118px, 1fr))' }, gap: 1, mb: 1.5 }}>
                        {tiles.map(tile => (
                            <Box key={tile.label} sx={{ p: 1, borderRadius: 2, bgcolor: 'rgba(255,255,255,0.04)', border: '1px solid', borderColor: tile.over ? `${C.red}88` : 'rgba(255,255,255,0.06)' }}>
                                <Typography sx={{ color: 'text.secondary', fontSize: px(t.label), fontWeight: 700, lineHeight: 1.2 }}>{tile.label}</Typography>
                                <Stack direction="row" alignItems="center" spacing={0.5}>
                                    <Typography sx={{ color: 'text.primary', fontWeight: 800, fontSize: '1.05rem', fontVariantNumeric: 'tabular-nums' }}>{tile.value}</Typography>
                                    {tile.over && <CancelRoundedIcon aria-label="over the goal" sx={{ fontSize: 16, color: C.red }} />}
                                </Stack>
                            </Box>
                        ))}
                    </Box>

                    {/* On a phone the whole system would be too small to read, so it keeps a readable size and scrolls sideways inside its card. */}
                    <Typography sx={{ display: { xs: 'block', sm: 'none' }, color: 'text.secondary', fontSize: px(t.label), mb: 0.5 }}>
                        Swipe sideways to see the whole system →
                    </Typography>
                    <Box sx={{ overflowX: 'auto', mx: { xs: -1, sm: 0 } }}>
                        <Box sx={{ minWidth: { xs: 680, sm: 540 } }}>
                            <LabDiagram config={design} world={mission.world} hour={hour} levers={mission.levers} />
                        </Box>
                    </Box>
                    <Stack direction="row" spacing={2} flexWrap="wrap" useFlexGap sx={{ mt: 0.5, mb: 1.5 }}>
                        {[[C.cyan, 'requests'], [C.red, 'failing requests']].map(([color, text]) => (
                            <Stack key={text} direction="row" alignItems="center" spacing={0.75}>
                                <Box sx={{ width: 8, height: 8, borderRadius: '50%', bgcolor: color }} />
                                <Typography sx={{ color: 'text.secondary', fontSize: px(t.label) }}>{text}</Typography>
                            </Stack>
                        ))}
                        {[[C.green, 'under 70% busy'], [C.amber, '70–90%'], [C.red, '90% or more']].map(([color, text]) => (
                            <Stack key={text} direction="row" alignItems="center" spacing={0.75}>
                                <Box sx={{ width: 14, height: 5, borderRadius: 3, bgcolor: color }} />
                                <Typography sx={{ color: 'text.secondary', fontSize: px(t.label) }}>{text}</Typography>
                            </Stack>
                        ))}
                    </Stack>

                    {/* The day, filling in as it plays: green hours held every goal, red ones missed one. */}
                    <LabDayStrip day={day} goals={mission.goals} revealed={revealed} selected={selected} onSelect={setSelected} />

                    {finished && (
                        <Stack
                            direction={{ xs: 'column', sm: 'row' }}
                            spacing={1.5}
                            alignItems={{ xs: 'stretch', sm: 'center' }}
                            justifyContent="space-between"
                            sx={{ mt: 1.5, p: 1.5, borderRadius: 2, border: '1px solid', borderColor: success ? `${CONFIDENT}66` : `${C.red}66`, bgcolor: success ? `${CONFIDENT}12` : `${C.red}12` }}
                        >
                            <Stack direction="row" spacing={1} alignItems="center">
                                {success ? <CheckCircleRoundedIcon sx={{ color: CONFIDENT }} /> : <CancelRoundedIcon sx={{ color: C.red }} />}
                                <Typography sx={{ color: 'text.primary', fontWeight: 800 }}>
                                    {success
                                        ? 'Mission complete: every goal met.'
                                        : `Not yet: ${missedGoals} goal${missedGoals === 1 ? '' : 's'} missed${Number.isFinite(firstMiss) ? `, first at ${hourLabel(firstMiss)}` : ''}.`}
                                </Typography>
                            </Stack>
                            <Button onClick={toFeedback} endIcon={<ArrowDownwardRoundedIcon />} sx={{ minHeight: TAP, fontWeight: 800, flexShrink: 0 }}>
                                {success ? 'See why it works' : 'See what to try'}
                            </Button>
                        </Stack>
                    )}
                </Box>

                <Box sx={{ ...CARD, gridArea: 'levers' }}>
                    <Heading>YOUR DESIGN</Heading>
                    <LabLevers mission={mission} design={design} onChange={change} />
                    <Box sx={{ mt: 1.5, pt: 1.5, borderTop: '1px solid rgba(255,255,255,0.1)' }}>
                        <Stack direction="row" justifyContent="space-between" alignItems="baseline">
                            <Typography sx={{ fontWeight: 800, color: 'text.primary' }}>Cost</Typography>
                            <Typography sx={{ fontWeight: 800, fontVariantNumeric: 'tabular-nums', color: budget && day.cost > budget.limit ? C.red : 'text.primary' }}>
                                {`${formatCost(day.cost)} a month`}
                            </Typography>
                        </Stack>
                        {budget && <Typography sx={{ color: 'text.secondary', fontSize: px(t.small) }}>{`Budget: ${formatCost(budget.limit)} a month`}</Typography>}
                    </Box>
                    <Stack spacing={1} sx={{ mt: 2 }}>
                        {!playing && <RunButton label={finished && !stale ? 'Run the day again' : 'Run the day'} onClick={startRun} />}
                        <Button onClick={reset} startIcon={<RestartAltRoundedIcon />} sx={{ minHeight: TAP, px: 1, color: 'text.secondary' }}>
                            Start again
                        </Button>
                    </Stack>
                </Box>

                <Stack spacing={2} sx={{ gridArea: 'results', minWidth: 0 }}>
                    {/* ---- the goals, and the day in detail ---- */}
                    <Box sx={CARD}>
                        <Heading>THE GOALS</Heading>
                        <Stack spacing={0.75} sx={{ mb: 2 }}>
                            {results.map(r => {
                                const known = r.goal.kind === 'budget' || finished;
                                const icon = !known ? (
                                    <RadioButtonUncheckedRoundedIcon sx={{ fontSize: 20, color: 'text.disabled' }} />
                                ) : r.met ? (
                                    <CheckCircleRoundedIcon sx={{ fontSize: 20, color: CONFIDENT }} />
                                ) : (
                                    <CancelRoundedIcon sx={{ fontSize: 20, color: C.red }} />
                                );
                                return (
                                    <Stack key={r.goal.kind} direction="row" spacing={1} alignItems="flex-start">
                                        <Box sx={{ pt: 0.25 }} aria-label={!known ? 'not run yet' : r.met ? 'met' : 'missed'}>
                                            {icon}
                                        </Box>
                                        <Typography sx={{ color: 'text.primary', fontSize: px(t.body2) }}>
                                            <strong>{GOAL_LABELS[r.goal.kind]}</strong>
                                            {`: ${goalText(r.goal)}.`}
                                            <Box component="span" sx={{ color: 'text.secondary' }}>
                                                {!known
                                                    ? ' Run the day to check.'
                                                    : r.goal.kind === 'budget'
                                                      ? ` Yours: ${formatCost(r.worst)}.`
                                                      : r.goal.kind === 'errors' && r.worst === 0
                                                        ? ' None failed.'
                                                        : ` Worst: ${formatGoal(r.goal.kind, r.worst)} at ${hourLabel(r.worstHour)}.`}
                                            </Box>
                                        </Typography>
                                    </Stack>
                                );
                            })}
                        </Stack>

                        <LabDayChart day={day} world={mission.world} goals={mission.goals} revealed={revealed} selected={selected} onSelect={setSelected} />

                        {finished && (
                            <Box component="details" sx={{ mt: 1.5, '& summary': { cursor: 'pointer', color: 'text.secondary', fontWeight: 700, fontSize: px(t.small), minHeight: TAP, display: 'flex', alignItems: 'center' } }}>
                                <summary>Every hour as a table</summary>
                                <Box sx={{ overflowX: 'auto' }}>
                                    <Box component="table" sx={{ borderCollapse: 'collapse', fontSize: px(t.small), color: 'text.primary', '& td, & th': { px: 1.25, py: 0.5, textAlign: 'right', borderBottom: '1px solid rgba(255,255,255,0.06)', whiteSpace: 'nowrap' }, '& th': { color: 'text.secondary', fontWeight: 700 } }}>
                                        <thead>
                                            <tr>
                                                <th style={{ textAlign: 'left' }}>Hour</th>
                                                <th>Requests/s</th>
                                                {hourly.map(g => <th key={g.kind}>{GOAL_LABELS[g.kind]}</th>)}
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {day.hours.map(h => (
                                                <tr key={h.hour}>
                                                    <td style={{ textAlign: 'left' }}>{hourLabel(h.hour)}</td>
                                                    <td>{formatCount(h.rps + h.abuseRps)}</td>
                                                    {hourly.map(g => {
                                                        const v = goalValue(g.kind, h);
                                                        return <td key={g.kind} style={{ color: v > g.limit ? C.red : undefined, fontWeight: v > g.limit ? 800 : undefined }}>{`${formatGoal(g.kind, v)}${v > g.limit ? ' ✗' : ''}`}</td>;
                                                    })}
                                                </tr>
                                            ))}
                                        </tbody>
                                    </Box>
                                </Box>
                            </Box>
                        )}
                    </Box>

                    {/* ---- what happened, and what to do about it ---- */}
                    {finished && !success && (
                        <Box ref={feedbackRef} sx={{ ...CARD, borderColor: `${C.red}55`, scrollMarginTop: SCROLL_MARGIN }}>
                            <Heading>WHAT WENT WRONG</Heading>
                            <Stack component="ul" spacing={1} sx={{ m: 0, pl: 2.5 }}>
                                {wrong.map(line => (
                                    <Typography component="li" key={line} variant="body1" sx={{ color: 'text.primary' }}>
                                        {line}
                                    </Typography>
                                ))}
                            </Stack>
                            {tries.length > 0 && (
                                <Box sx={{ mt: 2.5 }}>
                                    <Heading>WHAT TO TRY</Heading>
                                    <Stack component="ul" spacing={1} sx={{ m: 0, pl: 0, listStyle: 'none' }}>
                                        {tries.map(tip => (
                                            <Stack component="li" key={tip.text} direction="row" spacing={1} alignItems="flex-start">
                                                <LightbulbRoundedIcon sx={{ color: C.amber, fontSize: 20, mt: 0.25, flexShrink: 0 }} />
                                                <Typography variant="body1" sx={{ color: 'text.primary' }}>{tip.text}</Typography>
                                            </Stack>
                                        ))}
                                    </Stack>
                                </Box>
                            )}
                            <Typography sx={{ color: 'text.secondary', mt: 2, fontSize: px(t.small) }}>
                                Change your design on the right, then press Run the day again.
                            </Typography>
                            {failedRuns >= 2 && <Reveal label="Still stuck? Show one design that works" text={`One design that meets every goal: ${describeDesign(designOf(mission, mission.solution))}. Set it up yourself, then run the day to see why it works.`} />}
                        </Box>
                    )}
                    {success && (
                        <Box ref={feedbackRef} sx={{ ...CARD, borderColor: `${CONFIDENT}66`, scrollMarginTop: SCROLL_MARGIN }}>
                            <Stack direction="row" spacing={1} alignItems="center" sx={{ mb: 1 }}>
                                <CheckCircleRoundedIcon sx={{ color: CONFIDENT }} />
                                <Typography sx={{ fontWeight: 800, color: 'text.primary', fontSize: px(t.body1) }}>Every goal met. Mission complete.</Typography>
                            </Stack>
                            <Typography variant="body1" sx={{ color: 'text.primary', mb: 2 }}>{mission.debrief}</Typography>
                            <QuoteBox accent={ACCENT}>
                                <Typography variant="caption" sx={{ display: 'block', color: ACCENT, fontWeight: 800, letterSpacing: 1, mb: 0.5 }}>SAY IT IN AN INTERVIEW</Typography>
                                <Typography variant="body1" sx={{ fontStyle: 'italic' }}>{`"${mission.interview}"`}</Typography>
                            </QuoteBox>
                            {mission.traps.length > 0 && (
                                <Box sx={{ mt: 2 }}>
                                    <Typography sx={{ fontWeight: 800, color: 'text.primary', mb: 0.5 }}>Fixes that sound right, and why they fail here</Typography>
                                    <Stack component="ul" spacing={0.5} sx={{ m: 0, pl: 2.5 }}>
                                        {mission.traps.map(trap => (
                                            <Typography component="li" key={trap.why} variant="body2" sx={{ color: 'text.secondary' }}>
                                                <Box component="span" sx={{ display: 'block', color: 'text.primary', fontWeight: 700 }}>{describeDesign(designOf(mission, trap.config))}</Box>
                                                {trap.why}
                                            </Typography>
                                        ))}
                                    </Stack>
                                </Box>
                            )}
                            <NextMission after={mission} />
                        </Box>
                    )}
                </Stack>
            </Box>
        </Box>
    );
};
