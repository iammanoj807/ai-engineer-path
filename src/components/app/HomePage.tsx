// The home page: today's goal and streak, the one thing to do next, and each
// course drawn as a path of topics to walk, one step at a time.

import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
    Alert,
    Box,
    Button,
    ButtonBase,
    CircularProgress,
    LinearProgress,
    Menu,
    MenuItem,
    Popover,
    Stack,
    Tooltip,
    Typography,
} from '@mui/material';
import CheckRoundedIcon from '@mui/icons-material/CheckRounded';
import PlayArrowRoundedIcon from '@mui/icons-material/PlayArrowRounded';
import MenuBookRoundedIcon from '@mui/icons-material/MenuBookRounded';
import EmojiEventsRoundedIcon from '@mui/icons-material/EmojiEventsRounded';
import LocalFireDepartmentRoundedIcon from '@mui/icons-material/LocalFireDepartmentRounded';
import TuneRoundedIcon from '@mui/icons-material/TuneRounded';
import { courseById, readLastCourse, topicLink, unitOf, writeLastCourse, type CourseInfo, type PathTopic, type PathUnit } from '../../game/courses';
import { checksDocOf, useGameStats, type CourseStats } from '../../game/useProgress';
import { DAILY_GOALS, checksPassedIn, lastDays, readDailyGoal, writeDailyGoal, type ChecksDoc } from '../../game/xp';
import { useAccount, signIn } from '../../services/account';
import type { Course } from '../../services/progress';
import { FLAME, MASTERED, XP_GOLD } from './colours';

const CARD = { p: { xs: 2, sm: 2.5 }, borderRadius: 3, bgcolor: 'background.paper', border: '1px solid rgba(255,255,255,0.08)' } as const;

// ============ TODAY ============

const DailyGoalCard = ({ today, streak, activity }: { today: number; streak: number; activity: ReturnType<typeof useGameStats>['progress']['activity'] }) => {
    const [goal, setGoal] = useState(readDailyGoal);
    const [anchor, setAnchor] = useState<HTMLElement | null>(null);
    const done = today >= goal;
    const week = lastDays(activity, 7);
    const dayLetter = (day: string) => new Date(`${day}T12:00:00`).toLocaleDateString(undefined, { weekday: 'narrow' });

    return (
        <Box sx={{ ...CARD, flex: 1, minWidth: 0 }}>
            <Stack direction="row" spacing={2.5} alignItems="center">
                <Box sx={{ position: 'relative', display: 'inline-flex', flexShrink: 0 }}>
                    <CircularProgress variant="determinate" value={100} size={84} thickness={5} sx={{ color: 'rgba(255,255,255,0.08)', position: 'absolute' }} />
                    <CircularProgress
                        variant="determinate"
                        value={Math.min(100, (today / goal) * 100)}
                        size={84}
                        thickness={5}
                        sx={{ color: done ? MASTERED : 'primary.main', '& circle': { strokeLinecap: 'round' } }}
                        aria-label={`${today} of ${goal} checks today`}
                    />
                    <Box sx={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column' }}>
                        {done ? (
                            <CheckRoundedIcon sx={{ color: MASTERED, fontSize: 34 }} />
                        ) : (
                            <Typography sx={{ fontWeight: 800, fontSize: '1.3rem' }}>
                                {today}/{goal}
                            </Typography>
                        )}
                    </Box>
                </Box>
                <Box sx={{ flex: 1, minWidth: 0 }}>
                    <Stack direction="row" justifyContent="space-between" alignItems="center">
                        <Typography variant="caption" sx={{ fontWeight: 800, letterSpacing: 1.2, color: 'text.secondary' }}>
                            DAILY GOAL
                        </Typography>
                        <Tooltip title="Change your daily goal">
                            <Button size="small" startIcon={<TuneRoundedIcon />} onClick={event => setAnchor(event.currentTarget)} sx={{ color: 'text.secondary', minHeight: 32 }}>
                                {DAILY_GOALS.find(g => g.ticks === goal)?.label}
                            </Button>
                        </Tooltip>
                        <Menu anchorEl={anchor} open={!!anchor} onClose={() => setAnchor(null)}>
                            {DAILY_GOALS.map(option => (
                                <MenuItem
                                    key={option.ticks}
                                    selected={option.ticks === goal}
                                    onClick={() => {
                                        setGoal(option.ticks);
                                        writeDailyGoal(option.ticks);
                                        setAnchor(null);
                                    }}
                                >
                                    <Box>
                                        <Typography fontWeight={700}>{option.label}</Typography>
                                        <Typography variant="body2" color="text.secondary">{option.detail}</Typography>
                                    </Box>
                                </MenuItem>
                            ))}
                        </Menu>
                    </Stack>
                    <Typography sx={{ fontWeight: 700, mb: 1 }}>
                        {done ? 'Goal done for today. Nice work!' : today === 0 ? 'Tick your first check today.' : `${goal - today} more check${goal - today === 1 ? '' : 's'} to hit today's goal.`}
                    </Typography>
                    <Stack direction="row" alignItems="center" spacing={1.5}>
                        <Stack direction="row" alignItems="center" spacing={0.5}>
                            <LocalFireDepartmentRoundedIcon sx={{ color: streak > 0 ? FLAME : 'text.disabled' }} />
                            <Typography sx={{ fontWeight: 800, color: streak > 0 ? FLAME : 'text.secondary' }}>
                                {streak} day{streak === 1 ? '' : 's'}
                            </Typography>
                        </Stack>
                        <Stack direction="row" spacing={0.5} aria-label="The last 7 days">
                            {week.map(({ day, count }) => (
                                <Tooltip key={day} title={`${day}: ${count} check${count === 1 ? '' : 's'}`}>
                                    <Box sx={{ textAlign: 'center' }}>
                                        <Box sx={{ width: 18, height: 18, borderRadius: '50%', bgcolor: count > 0 ? FLAME : 'rgba(255,255,255,0.1)' }} />
                                        <Typography sx={{ fontSize: '0.65rem', color: 'text.secondary' }}>{dayLetter(day)}</Typography>
                                    </Box>
                                </Tooltip>
                            ))}
                        </Stack>
                    </Stack>
                </Box>
            </Stack>
        </Box>
    );
};

// ============ CONTINUE ============

const ContinueCard = ({ stats }: { stats: CourseStats }) => {
    const navigate = useNavigate();
    const { course, next, nextPassed } = stats;
    const unit = next ? unitOf(course, next.id) : undefined;

    if (!next) {
        return (
            <Box sx={{ ...CARD, flex: 1.4, minWidth: 0, borderColor: XP_GOLD }}>
                <Stack direction="row" spacing={2} alignItems="center">
                    <EmojiEventsRoundedIcon sx={{ fontSize: 48, color: XP_GOLD }} />
                    <Box>
                        <Typography variant="h6" fontWeight={800}>You mastered every {course.title} topic</Typography>
                        <Typography color="text.secondary">Re-test old topics every two weeks, and untick any you fail. Or pick another course below.</Typography>
                    </Box>
                </Stack>
            </Box>
        );
    }

    return (
        <Box sx={{ ...CARD, flex: 1.4, minWidth: 0, borderColor: `${course.colour}66`, background: `linear-gradient(135deg, ${course.colour}1f, rgba(21,25,33,1) 60%)` }}>
            <Typography variant="caption" sx={{ fontWeight: 800, letterSpacing: 1.2, color: course.colour }}>
                {nextPassed > 0 ? 'KEEP GOING' : 'UP NEXT'} · {course.title.toUpperCase()}{unit ? ` · UNIT ${unit.number}` : ''}
            </Typography>
            <Typography variant="h5" sx={{ fontWeight: 800, mt: 0.5, mb: 1 }}>
                {next.name}
            </Typography>
            <Typography
                color="text.secondary"
                sx={{ display: '-webkit-box', WebkitLineClamp: 3, WebkitBoxOrient: 'vertical', overflow: 'hidden', mb: 2 }}
            >
                <Box component="span" sx={{ color: 'text.primary', fontWeight: 700 }}>Why it matters: </Box>
                {next.problem}
            </Typography>
            <Stack direction="row" spacing={2} alignItems="center" flexWrap="wrap" useFlexGap>
                <Button
                    variant="contained"
                    size="large"
                    startIcon={<PlayArrowRoundedIcon />}
                    onClick={() => navigate(topicLink(course, next.id))}
                    sx={{ fontWeight: 800, px: 3, minHeight: 48 }}
                >
                    {nextPassed > 0 ? 'Continue' : 'Start'}
                </Button>
                <CheckDots passed={nextPassed} names={course.checkNames} colour={course.colour} />
            </Stack>
        </Box>
    );
};

const CheckDots = ({ passed, names, colour }: { passed: number; names: string[]; colour: string }) => (
    <Stack direction="row" spacing={0.75} alignItems="center" aria-label={`${passed} of 4 checks passed`}>
        {names.map((name, i) => (
            <Tooltip key={name} title={name}>
                <Box sx={{ width: 26, height: 8, borderRadius: 4, bgcolor: i < passed ? colour : 'rgba(255,255,255,0.12)' }} />
            </Tooltip>
        ))}
        <Typography variant="body2" color="text.secondary" sx={{ pl: 0.5 }}>
            {passed}/4 checks
        </Typography>
    </Stack>
);

// ============ COURSE PICKER ============

const CoursePicker = ({ stats, selected, onSelect }: { stats: CourseStats[]; selected: Course; onSelect: (id: Course) => void }) => (
    <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.5} sx={{ mb: 4 }}>
        {stats.map(({ course, mastered, total }) => {
            const active = course.id === selected;
            return (
                <ButtonBase
                    key={course.id}
                    onClick={() => onSelect(course.id)}
                    aria-pressed={active}
                    sx={{
                        ...CARD,
                        flex: 1,
                        display: 'block',
                        textAlign: 'left',
                        borderColor: active ? course.colour : 'rgba(255,255,255,0.08)',
                        borderWidth: 2,
                        bgcolor: active ? `${course.colour}14` : 'background.paper',
                        transition: 'border-color 0.2s, background-color 0.2s',
                    }}
                >
                    <Stack direction="row" justifyContent="space-between" alignItems="baseline">
                        <Typography sx={{ fontWeight: 800, color: active ? course.colour : 'text.primary' }}>{course.title}</Typography>
                        <Typography variant="body2" color="text.secondary">{mastered}/{total}</Typography>
                    </Stack>
                    <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5, mb: 1.25, minHeight: { sm: 40 } }}>
                        {course.tagline}
                    </Typography>
                    <LinearProgress
                        variant="determinate"
                        value={total ? (mastered / total) * 100 : 0}
                        sx={{ height: 8, borderRadius: 4, bgcolor: 'rgba(255,255,255,0.08)', '& .MuiLinearProgress-bar': { bgcolor: course.colour, borderRadius: 4 } }}
                    />
                </ButtonBase>
            );
        })}
    </Stack>
);

// ============ THE PATH ============

/** How far each node sits from the centre line, in steps, so the path winds. */
const WIND = [0, 1, 1.6, 1, 0, -1, -1.6, -1];

type NodeState = 'mastered' | 'current' | 'started' | 'upcoming';

const NODE = 76;

const ProgressRing = ({ passed, colour }: { passed: number; colour: string }) => {
    const r = (NODE + 10) / 2 - 4;
    const c = 2 * Math.PI * r;
    return (
        <Box component="svg" viewBox={`0 0 ${NODE + 10} ${NODE + 10}`} sx={{ position: 'absolute', inset: -5, width: NODE + 10, height: NODE + 10, transform: 'rotate(-90deg)', pointerEvents: 'none' }}>
            <circle cx={(NODE + 10) / 2} cy={(NODE + 10) / 2} r={r} fill="none" stroke="rgba(255,255,255,0.1)" strokeWidth={6} />
            <circle
                cx={(NODE + 10) / 2}
                cy={(NODE + 10) / 2}
                r={r}
                fill="none"
                stroke={colour}
                strokeWidth={6}
                strokeLinecap="round"
                strokeDasharray={`${(passed / 4) * c} ${c}`}
            />
        </Box>
    );
};

const TopicNode = ({
    topic,
    state,
    passed,
    accent,
    offset,
    onOpen,
}: {
    topic: PathTopic;
    state: NodeState;
    passed: number;
    accent: string;
    offset: number;
    onOpen: (el: HTMLElement) => void;
}) => {
    const fill = {
        mastered: accent,
        current: accent,
        started: `${accent}40`,
        upcoming: '#252b36',
    }[state];
    const icon = {
        mastered: <CheckRoundedIcon sx={{ fontSize: 38, color: '#0B0E14' }} />,
        current: <PlayArrowRoundedIcon sx={{ fontSize: 42, color: '#0B0E14' }} />,
        started: <Typography sx={{ fontWeight: 800, color: 'text.primary' }}>{passed}/4</Typography>,
        upcoming: <MenuBookRoundedIcon sx={{ fontSize: 30, color: '#6b7380' }} />,
    }[state];

    return (
        <Stack
            alignItems="center"
            sx={{
                width: 200,
                // Stack resets its children's margins, so centre with alignSelf, not mx: auto.
                alignSelf: 'center',
                transform: { xs: `translateX(${offset * 38}px)`, sm: `translateX(${offset * 70}px)` },
            }}
        >
            <Box sx={{ position: 'relative', width: NODE, height: NODE, mt: state === 'current' ? 5 : 0 }}>
                {state === 'current' && (
                    <Box
                        sx={{
                            position: 'absolute',
                            bottom: '100%',
                            left: '50%',
                            mb: 1.25,
                            px: 1.5,
                            py: 0.5,
                            borderRadius: 2,
                            bgcolor: '#fff',
                            color: '#0B0E14',
                            fontWeight: 800,
                            fontSize: '0.8rem',
                            letterSpacing: 1,
                            whiteSpace: 'nowrap',
                            animation: 'aepBob 1.6s ease-in-out infinite',
                            '@keyframes aepBob': {
                                '0%, 100%': { transform: 'translate(-50%, 0)' },
                                '50%': { transform: 'translate(-50%, -5px)' },
                            },
                            '&::after': {
                                content: '""',
                                position: 'absolute',
                                top: '100%',
                                left: '50%',
                                transform: 'translateX(-50%)',
                                border: '6px solid transparent',
                                borderTopColor: '#fff',
                            },
                        }}
                    >
                        {passed > 0 ? 'CONTINUE' : 'START'}
                    </Box>
                )}
                {(state === 'current' || state === 'started') && <ProgressRing passed={passed} colour={state === 'current' ? '#fff' : accent} />}
                <ButtonBase
                    onClick={event => onOpen(event.currentTarget)}
                    aria-label={`${topic.name}: ${passed} of 4 checks${state === 'mastered' ? ', mastered' : ''}`}
                    sx={{
                        width: NODE,
                        height: NODE,
                        borderRadius: '50%',
                        bgcolor: fill,
                        boxShadow: state === 'upcoming' ? '0 6px 0 #161a22' : `0 6px 0 ${accent}88`,
                        transition: 'transform 0.12s',
                        '&:hover': { transform: 'translateY(-2px)' },
                        '&:active': { transform: 'translateY(3px)', boxShadow: 'none' },
                        ...(state === 'current' && {
                            animation: 'aepPulse 2s ease-out infinite',
                            '@keyframes aepPulse': {
                                '0%': { boxShadow: `0 6px 0 ${accent}88, 0 0 0 0 ${accent}88` },
                                '70%': { boxShadow: `0 6px 0 ${accent}88, 0 0 0 16px ${accent}00` },
                                '100%': { boxShadow: `0 6px 0 ${accent}88, 0 0 0 0 ${accent}00` },
                            },
                        }),
                    }}
                >
                    {icon}
                </ButtonBase>
            </Box>
            <Typography
                variant="body2"
                sx={{
                    mt: 1.5,
                    textAlign: 'center',
                    fontWeight: state === 'current' ? 800 : 600,
                    color: state === 'upcoming' ? 'text.secondary' : 'text.primary',
                    display: '-webkit-box',
                    WebkitLineClamp: 2,
                    WebkitBoxOrient: 'vertical',
                    overflow: 'hidden',
                    lineHeight: 1.3,
                }}
            >
                {topic.name}
            </Typography>
        </Stack>
    );
};

const UnitBanner = ({ unit, mastered }: { unit: PathUnit; mastered: number }) => (
    <Box sx={{ ...CARD, borderLeft: `6px solid ${unit.accent}`, bgcolor: `${unit.accent}12`, mb: 4 }}>
        <Stack direction="row" justifyContent="space-between" alignItems="flex-start" spacing={2}>
            <Box sx={{ minWidth: 0 }}>
                <Typography variant="caption" sx={{ fontWeight: 800, letterSpacing: 1.2, color: unit.accent }}>
                    UNIT {unit.number}
                </Typography>
                <Typography variant="h6" sx={{ fontWeight: 800, lineHeight: 1.25 }}>
                    {unit.title}
                </Typography>
                <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5, display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
                    {unit.goal}
                </Typography>
            </Box>
            <Typography sx={{ fontWeight: 800, whiteSpace: 'nowrap', color: mastered === unit.topics.length ? MASTERED : 'text.secondary' }}>
                {mastered}/{unit.topics.length}
            </Typography>
        </Stack>
    </Box>
);

const UnitTrophy = ({ complete, unit }: { complete: boolean; unit: PathUnit }) => (
    <Stack alignItems="center" sx={{ my: 1 }}>
        <Tooltip title={complete ? `Unit ${unit.number} complete` : `Master every topic in unit ${unit.number} to earn this`}>
            <Box
                sx={{
                    width: 64,
                    height: 64,
                    borderRadius: '50%',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    bgcolor: complete ? `${XP_GOLD}26` : 'rgba(255,255,255,0.04)',
                    border: `3px solid ${complete ? XP_GOLD : 'rgba(255,255,255,0.1)'}`,
                }}
            >
                <EmojiEventsRoundedIcon sx={{ fontSize: 34, color: complete ? XP_GOLD : '#4a5160' }} />
            </Box>
        </Tooltip>
    </Stack>
);

const TopicCard = ({
    course,
    topic,
    passed,
    anchor,
    onClose,
}: {
    course: CourseInfo;
    topic: PathTopic;
    passed: number;
    anchor: HTMLElement;
    onClose: () => void;
}) => {
    const navigate = useNavigate();
    return (
        <Popover
            open
            anchorEl={anchor}
            onClose={onClose}
            anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
            transformOrigin={{ vertical: 'top', horizontal: 'center' }}
            slotProps={{ paper: { sx: { p: 2.5, maxWidth: 360, mt: 1, border: `1px solid ${course.colour}55` } } }}
        >
            <Typography sx={{ fontWeight: 800, mb: 0.75 }}>{topic.name}</Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                {topic.definition}
            </Typography>
            <CheckDots passed={passed} names={course.checkNames} colour={course.colour} />
            <Button
                fullWidth
                variant="contained"
                onClick={() => navigate(topicLink(course, topic.id))}
                sx={{ mt: 2, fontWeight: 800, minHeight: 44 }}
            >
                {passed >= 4 ? 'Review lesson' : passed > 0 ? 'Continue lesson' : 'Start lesson'}
            </Button>
        </Popover>
    );
};

const LearningPath = ({ course, doc }: { course: CourseInfo; doc: ChecksDoc | undefined }) => {
    const [open, setOpen] = useState<{ topic: PathTopic; el: HTMLElement } | null>(null);
    const topics = course.units.flatMap(unit => unit.topics);
    const firstOpen = topics.find(topic => checksPassedIn(doc, topic.id) < 4)?.id;
    const order = new Map(topics.map((topic, i) => [topic.id, i]));

    return (
        <Box>
            {course.units.map(unit => {
                const mastered = unit.topics.filter(topic => checksPassedIn(doc, topic.id) >= 4).length;
                return (
                    <Box key={unit.id} sx={{ mb: 6 }}>
                        <UnitBanner unit={unit} mastered={mastered} />
                        <Stack spacing={3.5} sx={{ overflow: 'hidden', py: 1 }}>
                            {unit.topics.map(topic => {
                                const passed = checksPassedIn(doc, topic.id);
                                const state: NodeState = passed >= 4 ? 'mastered' : topic.id === firstOpen ? 'current' : passed > 0 ? 'started' : 'upcoming';
                                const offset = WIND[(order.get(topic.id) ?? 0) % WIND.length];
                                return (
                                    <TopicNode
                                        key={topic.id}
                                        topic={topic}
                                        state={state}
                                        passed={passed}
                                        accent={course.colour}
                                        offset={offset}
                                        onOpen={el => setOpen({ topic, el })}
                                    />
                                );
                            })}
                            <UnitTrophy complete={mastered === unit.topics.length} unit={unit} />
                        </Stack>
                    </Box>
                );
            })}
            {open && (
                <TopicCard
                    course={course}
                    topic={open.topic}
                    passed={checksPassedIn(doc, open.topic.id)}
                    anchor={open.el}
                    onClose={() => setOpen(null)}
                />
            )}
        </Box>
    );
};

// ============ PAGE ============

const GuestNote = () => {
    const account = useAccount();
    if (account.status === 'off') {
        return (
            <Alert severity="info" variant="outlined" sx={{ mb: 3 }}>
                Your progress is saved in this browser. Clearing your browser data clears it too.
            </Alert>
        );
    }
    if (account.status !== 'guest') {
        return account.error ? <Alert severity="warning" sx={{ mb: 3 }}>{account.error}</Alert> : null;
    }
    return (
        <Alert
            severity="info"
            variant="outlined"
            sx={{ mb: 3, alignItems: 'center' }}
            action={<Button color="inherit" onClick={() => void signIn()} sx={{ fontWeight: 800 }}>Sign in</Button>}
        >
            {account.error ?? 'Your progress is saved in this browser. Sign in with Google to keep it on every device.'}
        </Alert>
    );
};

const HomePage = () => {
    const { progress, stats, today, streak } = useGameStats();
    const [selected, setSelected] = useState<Course>(readLastCourse);
    const course = courseById(selected);
    const selectedStats = stats.find(s => s.course.id === selected)!;

    const select = (id: Course) => {
        setSelected(id);
        writeLastCourse(id);
    };

    return (
        <Box sx={{ width: '100%', maxWidth: 940, mx: 'auto' }}>
            <GuestNote />
            <Stack direction={{ xs: 'column', md: 'row' }} spacing={2} sx={{ mb: 4 }}>
                <ContinueCard stats={selectedStats} />
                <DailyGoalCard today={today} streak={streak} activity={progress.activity} />
            </Stack>

            <Typography variant="caption" sx={{ display: 'block', fontWeight: 800, letterSpacing: 1.2, color: 'text.secondary', mb: 1.5 }}>
                YOUR COURSES
            </Typography>
            <CoursePicker stats={stats} selected={selected} onSelect={select} />

            <Box sx={{ maxWidth: 560, mx: 'auto' }}>
                <LearningPath key={course.id} course={course} doc={checksDocOf(progress, course.id)} />
            </Box>
            <Typography variant="body2" color="text.secondary" sx={{ textAlign: 'center', mt: 2 }}>
                Every topic is a full lesson: an animation, the idea step by step, a worked example and four exercises with answers.
                A topic is mastered when you pass all four checks without notes.
            </Typography>
        </Box>
    );
};

export default HomePage;
