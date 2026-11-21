// The front page for visitors who are not signed in: what the site is, with
// the guides Ada and Alan saying hello, the three courses, what every lesson
// gives you, and the path itself. It asks no one to sign in: the top bar offers that, and the site asks only when progress needs saving.
// Signed-in learners get their dashboard instead (HomePage.tsx).
//
// It reads only the course outline (COURSES, from pathIndex.json), never a
// lesson, so the first visit stays small.

import { useEffect, useState, type ElementType, type ReactNode } from 'react';
import { Link as RouterLink } from 'react-router-dom';
import { Box, Button, ButtonBase, Stack, Typography } from '@mui/material';
import ArrowDownwardRoundedIcon from '@mui/icons-material/ArrowDownwardRounded';
import ArrowForwardRoundedIcon from '@mui/icons-material/ArrowForwardRounded';
import PsychologyRoundedIcon from '@mui/icons-material/PsychologyRounded';
import StorageRoundedIcon from '@mui/icons-material/StorageRounded';
import HubRoundedIcon from '@mui/icons-material/HubRounded';
import AnimationRoundedIcon from '@mui/icons-material/AnimationRounded';
import LightbulbRoundedIcon from '@mui/icons-material/LightbulbRounded';
import CodeRoundedIcon from '@mui/icons-material/CodeRounded';
import TaskAltRoundedIcon from '@mui/icons-material/TaskAltRounded';
import RecordVoiceOverRoundedIcon from '@mui/icons-material/RecordVoiceOverRounded';
import TerminalRoundedIcon from '@mui/icons-material/TerminalRounded';
import { COURSES, type CourseInfo } from '../../game/courses';
import { coursePath, topicPath } from '../../game/addresses';
import type { Course } from '../../services/progress';
import GuidesScene from './GuidesScene';
import { MASTERED, XP_GOLD } from './colours';
import { HERO, HERO_GRADIENT, HERO_STATS } from '../../game/homeCopy';

const HEADING = '#fff';
const LINE = 'rgba(255,255,255,0.08)';
const MONO = 'ui-monospace, SFMono-Regular, Menlo, Consolas, monospace';

const lessonsIn = (course: CourseInfo) => course.units.reduce((n, unit) => n + unit.topics.length, 0);

const prefersReducedMotion = () =>
    typeof window !== 'undefined' && window.matchMedia?.('(prefers-reduced-motion: reduce)').matches === true;

const SectionHeading = ({ id, eyebrow, title, children, centred = false }: { id: string; eyebrow: string; title: string; children?: ReactNode; centred?: boolean }) => (
    <Box sx={{ maxWidth: 640, mb: { xs: 3, md: 4 }, ...(centred && { mx: 'auto', textAlign: 'center' }) }}>
        <Typography variant="caption" sx={{ display: 'block', fontWeight: 800, letterSpacing: 1.4, color: 'primary.light', mb: 1 }}>
            {eyebrow}
        </Typography>
        <Typography id={id} component="h2" sx={{ fontWeight: 800, color: HEADING, fontSize: { xs: '1.65rem', sm: '2.1rem' }, lineHeight: 1.2, letterSpacing: '-0.015em' }}>
            {title}
        </Typography>
        {children && (
            <Typography color="text.secondary" sx={{ mt: 1.25 }}>
                {children}
            </Typography>
        )}
    </Box>
);

// ============ HERO PICTURE: GRADIENT DESCENT ============

// A small version of what a lesson animates: a point stepping down a loss
// curve, each step against the slope, until it settles at the minimum.

const PLOT = { x0: 34, x1: 344, y0: 14, y1: 168, wMin: -1, wMax: 7, lossMax: 17 };
const lossAt = (w: number) => (w - 3) ** 2 + 0.6;
const toX = (w: number) => PLOT.x0 + ((w - PLOT.wMin) / (PLOT.wMax - PLOT.wMin)) * (PLOT.x1 - PLOT.x0);
const toY = (loss: number) => PLOT.y1 - (loss / PLOT.lossMax) * (PLOT.y1 - PLOT.y0);
/** Each step closes 30% of the gap to the minimum at w = 3. */
const STEPS = Array.from({ length: 8 }, (_, t) => 3 - 3.6 * 0.7 ** t);
/** Ticks spent resting on the minimum before it starts again. */
const REST = 3;
const CURVE = Array.from({ length: 61 }, (_, i) => {
    const w = PLOT.wMin + (i / 60) * (PLOT.wMax - PLOT.wMin);
    return `${i ? 'L' : 'M'}${toX(w).toFixed(1)} ${toY(lossAt(w)).toFixed(1)}`;
}).join(' ');
/** The slope at w, as an angle on screen. */
const slopeDegrees = (w: number) => {
    const scale = ((PLOT.y1 - PLOT.y0) / PLOT.lossMax) / ((PLOT.x1 - PLOT.x0) / (PLOT.wMax - PLOT.wMin));
    return (Math.atan(-2 * (w - 3) * scale) * 180) / Math.PI;
};

const FOUNDATIONS = COURSES.find(course => course.id === 'foundations');
const GD_UNIT = FOUNDATIONS?.units.find(unit => unit.topics.some(topic => /^gradient descent/i.test(topic.name)));
const GD_TOPIC = GD_UNIT?.topics.find(topic => /^gradient descent/i.test(topic.name));

const GradientDescentPlot = ({ colour }: { colour: string }) => {
    const [tick, setTick] = useState(() => (prefersReducedMotion() ? STEPS.length - 1 : 0));
    useEffect(() => {
        if (prefersReducedMotion()) return;
        const timer = window.setInterval(() => setTick(t => (t + 1) % (STEPS.length + REST)), 950);
        return () => window.clearInterval(timer);
    }, []);

    const step = Math.min(tick, STEPS.length - 1);
    const w = STEPS[step];
    const x = toX(w);
    const y = toY(lossAt(w));
    const trail = STEPS.slice(0, step + 1);
    const move = 'transform 0.6s cubic-bezier(0.33, 1, 0.68, 1)';

    return (
        <>
            <Box
                component="svg"
                viewBox="0 0 360 192"
                role="img"
                aria-label="Gradient descent: a point takes steps down a loss curve until it reaches the minimum"
                sx={{ width: '100%', height: 'auto', display: 'block', overflow: 'visible' }}
            >
                <defs>
                    <linearGradient id="aep-gd-fill" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0" stopColor={colour} stopOpacity={0.22} />
                        <stop offset="1" stopColor={colour} stopOpacity={0} />
                    </linearGradient>
                </defs>
                {[0.25, 0.5, 0.75].map(f => {
                    const gy = PLOT.y0 + f * (PLOT.y1 - PLOT.y0);
                    return <line key={f} x1={PLOT.x0} x2={PLOT.x1} y1={gy} y2={gy} stroke="rgba(255,255,255,0.05)" />;
                })}
                <path d={`${CURVE} L${PLOT.x1} ${PLOT.y1} L${PLOT.x0} ${PLOT.y1} Z`} fill="url(#aep-gd-fill)" />
                <line x1={PLOT.x0} y1={PLOT.y1} x2={PLOT.x1} y2={PLOT.y1} stroke="rgba(255,255,255,0.22)" strokeWidth={1.5} />
                <line x1={PLOT.x0} y1={PLOT.y0} x2={PLOT.x0} y2={PLOT.y1} stroke="rgba(255,255,255,0.22)" strokeWidth={1.5} />
                <line x1={toX(3)} x2={toX(3)} y1={toY(lossAt(3))} y2={PLOT.y1} stroke="rgba(255,255,255,0.25)" strokeDasharray="3 4" />
                <text x={toX(3)} y={PLOT.y1 + 16} textAnchor="middle" fill="#78909c" style={{ fontSize: 11, fontWeight: 600 }}>minimum</text>
                <text x={PLOT.x1} y={PLOT.y1 + 16} textAnchor="end" fill="#78909c" style={{ fontSize: 11, fontWeight: 600 }}>weight w</text>
                <text x={PLOT.x0 + 6} y={PLOT.y0 + 4} fill="#78909c" style={{ fontSize: 11, fontWeight: 600 }}>loss</text>
                <path d={CURVE} fill="none" stroke={colour} strokeWidth={3} strokeLinecap="round" />
                {trail.length > 1 && (
                    <polyline
                        points={trail.map(tw => `${toX(tw)},${toY(lossAt(tw))}`).join(' ')}
                        fill="none"
                        stroke="rgba(255,255,255,0.4)"
                        strokeWidth={1.5}
                        strokeDasharray="3 4"
                    />
                )}
                {trail.slice(0, -1).map(tw => (
                    <circle key={tw} cx={toX(tw)} cy={toY(lossAt(tw))} r={3.5} fill={colour} opacity={0.75} />
                ))}
                <g style={{ transform: `translate(${x}px, ${y}px) rotate(${slopeDegrees(w)}deg)`, transition: move }}>
                    <line x1={-38} y1={0} x2={38} y2={0} stroke={XP_GOLD} strokeWidth={2.5} strokeLinecap="round" />
                </g>
                <g style={{ transform: `translate(${x}px, ${y}px)`, transition: move }}>
                    <circle r={12} fill={colour} opacity={0.25} />
                    <circle r={6.5} fill="#fff" stroke={colour} strokeWidth={3} />
                </g>
            </Box>
            <Stack
                direction="row"
                justifyContent="space-between"
                sx={{ mt: 1.5, px: 1.5, py: 1, borderRadius: 2, bgcolor: 'rgba(255,255,255,0.04)', fontFamily: MONO, fontSize: '0.8rem', color: 'text.secondary' }}
                aria-hidden
            >
                <span>step {step}</span>
                <span>w = {w.toFixed(2)}</span>
                <Box component="span" sx={{ color: step === STEPS.length - 1 ? MASTERED : 'text.primary', fontWeight: 700, transition: 'color 0.3s' }}>
                    loss = {lossAt(w).toFixed(2)}
                </Box>
            </Stack>
        </>
    );
};

/** The hero's picture: a lesson's animation in small, and the four checks after it. */
const LessonPreview = () => {
    const colour = FOUNDATIONS?.colour ?? '#b39ddb';
    const link = FOUNDATIONS && GD_TOPIC ? topicPath(FOUNDATIONS, GD_TOPIC.id) : undefined;
    const card = (
        <Box
            sx={{
                width: '100%',
                p: { xs: 2, sm: 2.75 },
                borderRadius: 4,
                bgcolor: '#151921',
                border: `1px solid ${LINE}`,
                boxShadow: '0 30px 80px -30px rgba(0,0,0,0.8)',
                textAlign: 'left',
                transition: 'transform 0.2s, border-color 0.2s',
                ...(link && { '&:hover': { transform: 'translateY(-3px)', borderColor: `${colour}66` } }),
            }}
        >
            <Stack direction="row" justifyContent="space-between" alignItems="center" spacing={1} sx={{ mb: 0.75 }}>
                <Typography variant="caption" sx={{ fontWeight: 800, letterSpacing: 1.2, color: 'text.secondary' }}>
                    INSIDE A LESSON
                </Typography>
                {GD_UNIT && (
                    <Typography variant="caption" sx={{ fontWeight: 800, letterSpacing: 1.2, color: colour, whiteSpace: 'nowrap' }}>
                        ML FOUNDATIONS · UNIT {GD_UNIT.number}
                    </Typography>
                )}
            </Stack>
            <Typography sx={{ fontWeight: 800, color: HEADING, fontSize: '1.15rem', lineHeight: 1.3 }}>
                {GD_TOPIC?.name ?? 'Gradient descent'}
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5, mb: 2 }}>
                The{' '}
                <Box component="span" sx={{ color: XP_GOLD, fontWeight: 700 }}>
                    yellow line
                </Box>{' '}
                is the slope. Each step goes downhill, so the loss falls.
            </Typography>
            <GradientDescentPlot colour={colour} />
            <Box sx={{ mt: 2.25, pt: 2, borderTop: `1px solid ${LINE}` }}>
                <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 1.25 }}>
                    <Typography variant="body2" sx={{ fontWeight: 700 }}>
                        Then four checks, with answers
                    </Typography>
                    {link && (
                        <Stack direction="row" alignItems="center" spacing={0.5} sx={{ color: colour, fontWeight: 800, fontSize: '0.85rem' }}>
                            <span>Open</span>
                            <ArrowForwardRoundedIcon sx={{ fontSize: 18 }} />
                        </Stack>
                    )}
                </Stack>
                <Stack direction="row" spacing={1} useFlexGap flexWrap="wrap">
                    {(FOUNDATIONS?.checkNames ?? []).map((name, i) => (
                        <Box
                            key={name}
                            sx={{
                                px: 1.25,
                                py: 0.4,
                                borderRadius: 999,
                                fontSize: '0.8rem',
                                fontWeight: 700,
                                border: `1px solid ${colour}55`,
                                bgcolor: i === 0 ? `${colour}26` : 'transparent',
                                color: i === 0 ? HEADING : 'text.secondary',
                            }}
                        >
                            {i + 1}. {name}
                        </Box>
                    ))}
                </Stack>
            </Box>
        </Box>
    );

    return (
        <Box
            sx={{
                position: 'relative',
                isolation: 'isolate',
                maxWidth: 480,
                width: '100%',
                mx: 'auto',
                // A soft glow and a dot grid behind the card.
                '&::before': {
                    content: '""',
                    position: 'absolute',
                    // No wider than the card on a phone, or the page would scroll sideways.
                    inset: { xs: '-6% 0', sm: '-8% -6%' },
                    zIndex: -1,
                    background: `radial-gradient(closest-side, ${colour}2e, transparent), radial-gradient(circle at 80% 90%, rgba(41,121,255,0.18), transparent 50%)`,
                    filter: 'blur(10px)',
                    pointerEvents: 'none',
                },
                '&::after': {
                    content: '""',
                    position: 'absolute',
                    inset: { xs: '-12px -6px', sm: '-28px -36px' },
                    zIndex: -1,
                    backgroundImage: 'radial-gradient(rgba(255,255,255,0.09) 1px, transparent 1px)',
                    backgroundSize: '18px 18px',
                    maskImage: 'radial-gradient(ellipse at center, #000 30%, transparent 72%)',
                    WebkitMaskImage: 'radial-gradient(ellipse at center, #000 30%, transparent 72%)',
                    pointerEvents: 'none',
                },
            }}
        >
            {link && GD_TOPIC ? (
                <ButtonBase component={RouterLink} to={link} aria-label={`Open the lesson: ${GD_TOPIC.name}`} sx={{ display: 'block', width: '100%', borderRadius: 4 }}>
                    {card}
                </ButtonBase>
            ) : (
                card
            )}
        </Box>
    );
};

// ============ HERO ============

export const Hero = ({ onSeeCourses }: { onSeeCourses: () => void }) => {
    return (
        <Box
            component="section"
            aria-labelledby="home-title"
            sx={{
                display: 'grid',
                gridTemplateColumns: { xs: 'minmax(0, 1fr)', md: 'minmax(0, 1.08fr) minmax(0, 1fr)' },
                gap: { xs: 6, md: 7 },
                alignItems: 'center',
                pt: { xs: 1, md: 4 },
            }}
        >
            <Box>
                <Typography
                    id="home-title"
                    component="h1"
                    sx={{ fontWeight: 800, color: HEADING, fontSize: { xs: '2.3rem', sm: '3rem', md: '3.35rem' }, lineHeight: 1.07, letterSpacing: '-0.025em' }}
                >
                    {HERO.title}{' '}
                    <Box
                        component="span"
                        // inline-block keeps the phrase together, on its own line when it does not fit.
                        sx={{ display: 'inline-block', background: HERO_GRADIENT, WebkitBackgroundClip: 'text', backgroundClip: 'text', WebkitTextFillColor: 'transparent', color: 'transparent' }}
                    >
                        {HERO.titleEnd}
                    </Box>
                </Typography>
                <Typography sx={{ mt: 2.5, color: 'text.secondary', fontSize: { xs: '1.05rem', sm: '1.15rem' }, lineHeight: 1.6, maxWidth: 520 }}>
                    {HERO.lead}
                </Typography>
                <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.5} sx={{ mt: 4 }}>
                    {/* The courses' own colour, like their "Open course" buttons. */}
                    <Button
                        variant="contained"
                        size="large"
                        endIcon={<ArrowDownwardRoundedIcon />}
                        onClick={onSeeCourses}
                        sx={{ fontWeight: 800, px: 3, minHeight: 52, fontSize: '1.05rem', bgcolor: COURSES[0].colour, color: '#0B0E14', '&:hover': { bgcolor: COURSES[0].colour, filter: 'brightness(1.1)' } }}
                    >
                        {HERO.browse}
                    </Button>
                </Stack>
                <Stack direction="row" spacing={{ xs: 3.5, sm: 5 }} sx={{ mt: 4, pt: 3, borderTop: `1px solid ${LINE}` }}>
                    {HERO_STATS.map(stat => (
                        <Box key={stat.label}>
                            <Typography sx={{ fontWeight: 800, color: HEADING, fontSize: { xs: '1.5rem', sm: '1.75rem' }, lineHeight: 1.1 }}>{stat.value}</Typography>
                            <Typography variant="body2" color="text.secondary">
                                {stat.label}
                            </Typography>
                        </Box>
                    ))}
                </Stack>
            </Box>
            <GuidesScene />
        </Box>
    );
};

// ============ COURSES ============

const COURSE_ICON: Record<Course, ElementType> = {
    foundations: PsychologyRoundedIcon,
    sql: StorageRoundedIcon,
    system_design: HubRoundedIcon,
};

const COURSE_LINE: Record<Course, string> = {
    foundations: 'You build classical ML by hand, and every worked example has code that has been run.',
    sql: 'A real SQLite engine in the page runs every query you write.',
    system_design: 'Caches, queues, databases and load balancers first, then full designs.',
};

const UNITS_SHOWN = 4;

export const CourseShowcase = ({ onShowPath }: { onShowPath: (id: Course) => void }) => (
    <Box component="section" id="courses" aria-labelledby="courses-title" sx={{ scrollMarginTop: 84 }}>
        <SectionHeading id="courses-title" eyebrow="THE COURSES" title="Three courses, each from zero">
            Start with the one you need most. Each begins at the very start and ends with the questions interviews ask.
        </SectionHeading>
        <Box sx={{ display: 'grid', gridTemplateColumns: { xs: 'minmax(0, 1fr)', md: 'repeat(3, minmax(0, 1fr))' }, gap: 2 }}>
            {COURSES.map(course => {
                const Icon = COURSE_ICON[course.id];
                const more = course.units.length - UNITS_SHOWN;
                return (
                    <Box
                        key={course.id}
                        sx={{
                            position: 'relative',
                            display: 'flex',
                            flexDirection: 'column',
                            p: { xs: 2.5, sm: 3 },
                            borderRadius: 4,
                            border: `1px solid ${LINE}`,
                            background: `linear-gradient(180deg, ${course.colour}1a 0%, rgba(21,25,33,0) 42%), #151921`,
                            overflow: 'hidden',
                        }}
                    >
                        <Box sx={{ position: 'absolute', top: 0, left: 0, right: 0, height: 3, bgcolor: course.colour }} />
                        <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 2 }}>
                            <Box sx={{ width: 48, height: 48, borderRadius: 3, display: 'grid', placeItems: 'center', bgcolor: `${course.colour}24`, color: course.colour }}>
                                <Icon />
                            </Box>
                            <Typography variant="body2" sx={{ fontWeight: 700, color: 'text.secondary' }}>
                                {course.units.length} units · {lessonsIn(course)} lessons
                            </Typography>
                        </Stack>
                        <Typography component="h3" sx={{ fontWeight: 800, fontSize: '1.35rem', color: HEADING }}>
                            {course.title}
                        </Typography>
                        <Typography color="text.secondary" sx={{ mt: 0.75, fontSize: '1rem' }}>
                            {course.tagline}
                        </Typography>
                        <Typography variant="body2" sx={{ mt: 1.5, color: 'text.primary' }}>
                            {COURSE_LINE[course.id]}
                        </Typography>
                        <Box component="ol" aria-label={`${course.title} units`} sx={{ listStyle: 'none', p: 0, m: 0, mt: 2.5, mb: 3, display: 'grid', gap: 1 }}>
                            {course.units.slice(0, UNITS_SHOWN).map(unit => (
                                <Box component="li" key={unit.id} sx={{ display: 'flex', gap: 1.25, alignItems: 'baseline', fontSize: '0.9rem' }}>
                                    <Box component="span" sx={{ color: course.colour, fontWeight: 800, minWidth: 16, fontFamily: MONO, fontSize: '0.8rem' }}>
                                        {unit.number}
                                    </Box>
                                    <span>{unit.title}</span>
                                </Box>
                            ))}
                            {more > 0 && (
                                <Box component="li" sx={{ pl: 3.25, fontSize: '0.85rem', color: 'text.secondary' }}>
                                    and {more} more unit{more === 1 ? '' : 's'}
                                </Box>
                            )}
                        </Box>
                        <Stack direction="row" spacing={1} useFlexGap flexWrap="wrap" sx={{ mt: 'auto' }}>
                            <Button
                                component={RouterLink}
                                to={coursePath(course)}
                                variant="contained"
                                endIcon={<ArrowForwardRoundedIcon />}
                                sx={{ bgcolor: course.colour, color: '#0B0E14', fontWeight: 800, minHeight: 44, '&:hover': { bgcolor: course.colour, filter: 'brightness(1.1)' } }}
                            >
                                Open course
                            </Button>
                            <Button onClick={() => onShowPath(course.id)} sx={{ color: 'text.primary', fontWeight: 700, minHeight: 44 }}>
                                See the path
                            </Button>
                        </Stack>
                    </Box>
                );
            })}
        </Box>
    </Box>
);

// ============ WHAT A LESSON GIVES YOU ============

const LESSON_PARTS: { icon: ElementType; colour: string; title: string; text: string }[] = [
    { icon: AnimationRoundedIcon, colour: '#b39ddb', title: 'An animation', text: 'See the idea move before you read about it. Play it, pause it, or step through it.' },
    { icon: LightbulbRoundedIcon, colour: '#ffca28', title: 'The idea, step by step', text: 'Why it exists, how it works, and the mistakes people make with it.' },
    { icon: CodeRoundedIcon, colour: '#82b1ff', title: 'A worked example', text: 'Real numbers worked through, with code that has been run.' },
    { icon: TaskAltRoundedIcon, colour: MASTERED, title: 'Practise like a game', text: 'Your coaches, Ada and Alan, ask quick questions: match the pairs, type or choose the missing word, put the steps in order. Hearts, XP and a streak keep you going.' },
    { icon: RecordVoiceOverRoundedIcon, colour: '#4dd0e1', title: 'Interview questions', text: 'Every course has an interview mode: full spoken answers, the traps, and the follow-ups.' },
    { icon: TerminalRoundedIcon, colour: COURSES.find(course => course.id === 'sql')?.colour ?? '#f48fb1', title: 'SQL that runs in the page', text: 'SQLite runs in your browser, so every query works with nothing to install.' },
];

export const LessonAnatomy = () => (
    <Box component="section" aria-labelledby="lesson-title">
        <SectionHeading id="lesson-title" eyebrow="WHAT YOU GET" title="Inside every lesson">
            Each lesson teaches one idea all the way through, then lets you practise it and prove it: four exercises with answers, checked when you pass them without notes.
        </SectionHeading>
        {/* A real lesson's picture beside what every lesson has. */}
        <Box sx={{ display: 'grid', gridTemplateColumns: { xs: 'minmax(0, 1fr)', md: 'minmax(0, 0.95fr) minmax(0, 1.2fr)' }, gap: { xs: 3, md: 4 }, alignItems: 'center' }}>
        <LessonPreview />
        <Box sx={{ display: 'grid', gridTemplateColumns: { xs: 'minmax(0, 1fr)', sm: 'repeat(2, minmax(0, 1fr))' }, gap: 1.5 }}>
            {LESSON_PARTS.map(({ icon: Icon, colour, title, text }) => (
                <Box
                    key={title}
                    sx={{ display: 'flex', gap: 1.75, alignItems: 'flex-start', p: 2, borderRadius: 3, border: `1px solid ${LINE}`, bgcolor: '#151921' }}
                >
                    <Box sx={{ width: 42, height: 42, flexShrink: 0, borderRadius: 2.5, display: 'grid', placeItems: 'center', bgcolor: `${colour}1f`, color: colour }}>
                        <Icon />
                    </Box>
                    <Box sx={{ minWidth: 0 }}>
                        <Typography component="h3" sx={{ fontWeight: 800, color: HEADING, fontSize: '1.05rem', mb: 0.5 }}>
                            {title}
                        </Typography>
                        <Typography variant="body2" color="text.secondary" sx={{ lineHeight: 1.6 }}>
                            {text}
                        </Typography>
                    </Box>
                </Box>
            ))}
        </Box>
        </Box>
    </Box>
);

// ============ THE PATH ============

/** The heading and course switch above the path; the path itself comes in as children. */
export const PathSection = ({ selected, onSelect, children }: { selected: Course; onSelect: (id: Course) => void; children: ReactNode }) => (
    <Box component="section" id="path" aria-labelledby="path-title" sx={{ scrollMarginTop: 84 }}>
        <SectionHeading id="path-title" eyebrow="THE PATH" title="Walk it one lesson at a time" centred>
            Pick a course, then tap a lesson to open it. The next one is always marked START.
        </SectionHeading>
        <Stack direction="row" spacing={1} useFlexGap flexWrap="wrap" justifyContent="center" sx={{ mb: 4 }}>
            {COURSES.map(course => {
                const active = course.id === selected;
                return (
                    <ButtonBase
                        key={course.id}
                        onClick={() => onSelect(course.id)}
                        aria-pressed={active}
                        sx={{
                            px: 2,
                            minHeight: 44,
                            borderRadius: 999,
                            gap: 1,
                            fontWeight: 700,
                            fontSize: '0.95rem',
                            border: '1.5px solid',
                            borderColor: active ? course.colour : LINE,
                            bgcolor: active ? `${course.colour}1f` : 'transparent',
                            color: active ? HEADING : 'text.secondary',
                            transition: 'border-color 0.2s, background-color 0.2s, color 0.2s',
                            '&:hover': { borderColor: course.colour },
                        }}
                    >
                        <Box component="span" sx={{ width: 9, height: 9, borderRadius: '50%', bgcolor: course.colour }} />
                        {course.title}
                    </ButtonBase>
                );
            })}
        </Stack>
        <Box sx={{ maxWidth: 560, mx: 'auto' }}>{children}</Box>
    </Box>
);
