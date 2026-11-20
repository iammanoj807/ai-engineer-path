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
    Stack,
    Tooltip,
    Typography,
} from '@mui/material';
import CheckRoundedIcon from '@mui/icons-material/CheckRounded';
import PlayArrowRoundedIcon from '@mui/icons-material/PlayArrowRounded';
import EmojiEventsRoundedIcon from '@mui/icons-material/EmojiEventsRounded';
import LocalFireDepartmentRoundedIcon from '@mui/icons-material/LocalFireDepartmentRounded';
import TuneRoundedIcon from '@mui/icons-material/TuneRounded';
import { courseById, readLastCourse, topicLink, unitOf, writeLastCourse } from '../../game/courses';
import { checksDocOf, useGameStats, type CourseStats } from '../../game/useProgress';
import { DAILY_GOALS, lastDays, readDailyGoal, writeDailyGoal } from '../../game/xp';
import type { Course } from '../../services/progress';
import { FLAME, MASTERED, XP_GOLD } from './colours';
import CoursePath, { CARD, CheckDots } from './CoursePath';
import GuestNote from './GuestNote';
import { signIn, useAccount, useTracksProgress } from '../../services/account';
import GoogleIcon from '@mui/icons-material/Google';
import LockRoundedIcon from '@mui/icons-material/LockRounded';

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

// ============ SIGNED OUT ============

/** In place of the daily goal: progress (streak, goal, XP, ticks) starts at sign-in. */
const TrackProgressCard = () => {
    const account = useAccount();
    return (
        <Box sx={{ ...CARD, flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
            <Stack direction="row" spacing={1} alignItems="center" sx={{ mb: 1 }}>
                <LockRoundedIcon sx={{ fontSize: 18, color: 'primary.main' }} />
                <Typography variant="caption" sx={{ fontWeight: 800, letterSpacing: 1.2, color: 'text.secondary' }}>
                    TRACK YOUR PROGRESS
                </Typography>
            </Stack>
            <Typography sx={{ fontWeight: 700, mb: 0.5 }}>
                Sign in to tick off topics, keep a streak, set a daily goal and earn XP.
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                Reading every lesson is free without an account.
            </Typography>
            {account.error && <Alert severity="warning" sx={{ mb: 2 }}>{account.error}</Alert>}
            <Button
                variant="contained"
                startIcon={<GoogleIcon />}
                onClick={() => void signIn()}
                disabled={account.status === 'loading'}
                sx={{ fontWeight: 800, minHeight: 44, alignSelf: 'flex-start' }}
            >
                Sign in with Google
            </Button>
        </Box>
    );
};

// ============ CONTINUE ============

const ContinueCard = ({ stats, tracking }: { stats: CourseStats; tracking: boolean }) => {
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
                {tracking && <CheckDots passed={nextPassed} names={course.checkNames} colour={course.colour} />}
            </Stack>
        </Box>
    );
};

// ============ COURSE PICKER ============

const CoursePicker = ({ stats, selected, tracking, onSelect }: { stats: CourseStats[]; selected: Course; tracking: boolean; onSelect: (id: Course) => void }) => (
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
                        <Typography variant="body2" color="text.secondary">{tracking ? `${mastered}/${total}` : `${total} topics`}</Typography>
                    </Stack>
                    <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5, mb: 1.25, minHeight: { sm: 40 } }}>
                        {course.tagline}
                    </Typography>
                    {tracking && (
                        <LinearProgress
                            variant="determinate"
                            value={total ? (mastered / total) * 100 : 0}
                            sx={{ height: 8, borderRadius: 4, bgcolor: 'rgba(255,255,255,0.08)', '& .MuiLinearProgress-bar': { bgcolor: course.colour, borderRadius: 4 } }}
                        />
                    )}
                </ButtonBase>
            );
        })}
    </Stack>
);

// ============ PAGE ============

const HomePage = () => {
    const navigate = useNavigate();
    const { progress, stats, today, streak } = useGameStats();
    const tracking = useTracksProgress();
    const [selected, setSelected] = useState<Course>(readLastCourse);
    const course = courseById(selected);
    const selectedStats = stats.find(s => s.course.id === selected)!;

    const select = (id: Course) => {
        setSelected(id);
        writeLastCourse(id);
    };

    return (
        <Box sx={{ width: '100%', maxWidth: 940, mx: 'auto' }}>
            {tracking && <GuestNote />}
            <Stack direction={{ xs: 'column', md: 'row' }} spacing={2} sx={{ mb: 4 }}>
                <ContinueCard stats={selectedStats} tracking={tracking} />
                {tracking ? <DailyGoalCard today={today} streak={streak} activity={progress.activity} /> : <TrackProgressCard />}
            </Stack>

            <Typography variant="caption" sx={{ display: 'block', fontWeight: 800, letterSpacing: 1.2, color: 'text.secondary', mb: 1.5 }}>
                YOUR COURSES
            </Typography>
            <CoursePicker stats={stats} selected={selected} tracking={tracking} onSelect={select} />

            <Box sx={{ maxWidth: 560, mx: 'auto' }}>
                <CoursePath
                    key={course.id}
                    course={course}
                    doc={checksDocOf(progress, course.id)}
                    onOpenTopic={topicId => navigate(topicLink(course, topicId))}
                    onOpenUnit={unitId => navigate(`${course.route}?unit=${encodeURIComponent(unitId)}`)}
                />
            </Box>
            <Typography variant="body2" color="text.secondary" sx={{ textAlign: 'center', mt: 2 }}>
                Every topic is a full lesson: an animation, the idea step by step, a worked example and four exercises with answers.
                A topic is mastered when you pass all four checks without notes.
            </Typography>
        </Box>
    );
};

export default HomePage;
