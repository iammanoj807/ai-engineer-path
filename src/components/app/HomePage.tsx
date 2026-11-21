// The home page. Signed out, it is the front page (Landing.tsx): what the site
// is, the courses, and the path. Signed in, it is the dashboard: today's goal
// and streak, the one thing to do next, and each course drawn as a path of
// topics to walk, one step at a time.

import { useEffect, useRef, useState } from 'react';
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
import LocalFireDepartmentRoundedIcon from '@mui/icons-material/LocalFireDepartmentRounded';
import TuneRoundedIcon from '@mui/icons-material/TuneRounded';
import { courseById, writeHomeCourse } from '../../game/courses';
import { topicPath, unitPath } from '../../game/addresses';
import { checksDocOf, useGameStats, type CourseStats } from '../../game/useProgress';
import { DAILY_GOALS, lastDays, readDailyGoal, writeDailyGoal } from '../../game/xp';
import type { Course } from '../../services/progress';
import { FLAME, MASTERED } from './colours';
import CoursePath, { CARD } from './CoursePath';
import GuestNote from './GuestNote';
import ReviewCard from './ReviewCard';
import { signIn, useAccount, useTracksProgress, wasSignedIn } from '../../services/account';
import { CourseShowcase, Hero, LessonAnatomy, PathSection, StartBand } from './Landing';
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
        <Box sx={{ ...CARD, flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', gap: 2 }}>
            <Stack direction="row" justifyContent="space-between" alignItems="center">
                <Typography variant="caption" sx={{ fontWeight: 800, letterSpacing: 1.2, color: 'text.secondary' }}>
                    DAILY GOAL
                </Typography>
                <Tooltip title="Change your daily goal">
                    <Button size="small" startIcon={<TuneRoundedIcon />} onClick={event => setAnchor(event.currentTarget)} sx={{ color: 'text.secondary', minHeight: 32 }}>
                        {DAILY_GOALS.find(g => g.xp === goal)?.label}
                    </Button>
                </Tooltip>
                <Menu anchorEl={anchor} open={!!anchor} onClose={() => setAnchor(null)}>
                    {DAILY_GOALS.map(option => (
                        <MenuItem
                            key={option.xp}
                            selected={option.xp === goal}
                            onClick={() => {
                                setGoal(option.xp);
                                writeDailyGoal(option.xp);
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

            {/* Full width: today on the left, the streak and the week on the right (stacked on a phone). */}
            <Box sx={{ display: 'grid', gridTemplateColumns: { xs: 'minmax(0, 1fr)', md: 'minmax(0, 1fr) auto' }, gap: { xs: 2.5, md: 5 }, alignItems: 'center' }}>
                {/* Today: the ring, and what it means. */}
                <Stack direction="row" spacing={{ xs: 2.5, md: 3.5 }} alignItems="center">
                    <Box sx={{ position: 'relative', display: 'inline-flex', flexShrink: 0 }}>
                        <CircularProgress variant="determinate" value={100} size={116} thickness={5} sx={{ color: 'rgba(255,255,255,0.08)', position: 'absolute' }} />
                        <CircularProgress
                            variant="determinate"
                            value={Math.min(100, (today / goal) * 100)}
                            size={116}
                            thickness={5}
                            sx={{ color: done ? MASTERED : 'primary.main', '& circle': { strokeLinecap: 'round' } }}
                            aria-label={`${today} of ${goal} XP today`}
                        />
                        <Box sx={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column' }}>
                            {done ? (
                                <CheckRoundedIcon sx={{ color: MASTERED, fontSize: 48 }} />
                            ) : (
                                <>
                                    <Typography sx={{ fontWeight: 800, fontSize: '1.6rem', lineHeight: 1.1 }}>
                                        {today}/{goal}
                                    </Typography>
                                    <Typography sx={{ fontSize: '0.85rem', fontWeight: 700, color: 'text.secondary' }}>XP today</Typography>
                                </>
                            )}
                        </Box>
                    </Box>
                    <Typography sx={{ fontWeight: 800, fontSize: { xs: '1.15rem', md: '1.35rem' }, lineHeight: 1.4 }}>
                        {done ? 'Goal done for today. Nice work!' : today === 0 ? 'Practise a lesson or tick a check to earn your first XP today.' : `${goal - today} more XP to hit today's goal.`}
                    </Typography>
                </Stack>

                {/* The streak, and the last seven days. */}
                <Stack
                    spacing={1.5}
                    sx={{
                        pt: { xs: 2.5, md: 0 },
                        pl: { md: 5 },
                        borderTop: { xs: '1px solid rgba(255,255,255,0.08)', md: 'none' },
                        borderLeft: { md: '1px solid rgba(255,255,255,0.08)' },
                    }}
                >
                    <Stack direction="row" alignItems="center" spacing={0.75}>
                        <LocalFireDepartmentRoundedIcon sx={{ color: streak > 0 ? FLAME : 'text.disabled', fontSize: 28 }} />
                        <Typography sx={{ fontWeight: 800, fontSize: '1.2rem', whiteSpace: 'nowrap', color: streak > 0 ? FLAME : 'text.secondary' }}>
                            {streak}-day streak
                        </Typography>
                    </Stack>
                    <Box aria-label="The last 7 days" sx={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: { xs: 0.75, md: 1.25 }, maxWidth: 340 }}>
                        {week.map(({ day, xp }, index) => {
                            const isToday = index === week.length - 1;
                            return (
                                <Tooltip key={day} title={`${isToday ? 'Today' : day}: ${xp} XP`}>
                                    <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 0.75 }}>
                                        <Box
                                            sx={{
                                                width: 32,
                                                height: 32,
                                                borderRadius: '50%',
                                                display: 'flex',
                                                alignItems: 'center',
                                                justifyContent: 'center',
                                                bgcolor: xp > 0 ? FLAME : 'rgba(255,255,255,0.1)',
                                                boxShadow: isToday ? `0 0 0 2px #0f131b, 0 0 0 4px ${xp > 0 ? FLAME : 'rgba(255,255,255,0.35)'}` : 'none',
                                            }}
                                        >
                                            {xp > 0 && <CheckRoundedIcon sx={{ fontSize: 20, color: '#1b1206' }} />}
                                        </Box>
                                        <Typography sx={{ fontSize: '0.85rem', fontWeight: 700, lineHeight: 1, color: isToday ? 'text.primary' : 'text.secondary' }}>
                                            {dayLetter(day)}
                                        </Typography>
                                    </Box>
                                </Tooltip>
                            );
                        })}
                    </Box>
                </Stack>
            </Box>
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

const scrollToSection = (id: string) => {
    const reduced = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
    document.getElementById(id)?.scrollIntoView({ behavior: reduced ? 'auto' : 'smooth', block: 'start' });
};

const SECTION_GAP = { xs: 9, md: 13 };

/**
 * Signed out: the front page (Landing.tsx). Signed in: the dashboard, with
 * today's goal and the next topic. Until sign-in has loaded, the browser's
 * last state decides, so a signed-in learner does not see the front page flash.
 */
const HomePage = () => {
    const navigate = useNavigate();
    const { progress, stats, today, streak } = useGameStats();
    const tracking = useTracksProgress();
    const account = useAccount();
    const frontPage = account.status === 'guest' || (account.status === 'loading' && !wasSignedIn());
    // The front page starts on ML Foundations every time; browsing its tabs is not a choice to remember.
    // The dashboard shows the course picked on it, ML Foundations until then.
    const [frontPageCourse, setFrontPageCourse] = useState<Course>('foundations');
    // The home page always opens on ML Foundations, the start of the path.
    const [homeCourse, setHomeCourse] = useState<Course>('foundations');
    const selected = frontPage ? frontPageCourse : homeCourse;
    const course = courseById(selected);

    // Signing in from far down the front page swaps it for the much shorter
    // dashboard; start that at the top, at the welcome and the next topic.
    const wasFrontPage = useRef(frontPage);
    useEffect(() => {
        if (wasFrontPage.current && !frontPage) window.scrollTo(0, 0);
        wasFrontPage.current = frontPage;
    }, [frontPage]);

    const select = (id: Course) => {
        if (frontPage) {
            setFrontPageCourse(id);
            return;
        }
        setHomeCourse(id);
        writeHomeCourse(id);
    };

    const path = (
        <CoursePath
            key={course.id}
            course={course}
            doc={checksDocOf(progress, course.id)}
            onOpenTopic={topicId => navigate(topicPath(course, topicId))}
            onOpenUnit={unitId => navigate(unitPath(course, unitId))}
        />
    );

    if (frontPage) {
        return (
            <Box sx={{ width: '100%', maxWidth: 1120, mx: 'auto' }}>
                <Hero course={course} onSeeCourses={() => scrollToSection('courses')} />
                <Box sx={{ mt: SECTION_GAP }}>
                    <CourseShowcase
                        onShowPath={id => {
                            select(id);
                            scrollToSection('path');
                        }}
                    />
                </Box>
                <Box sx={{ mt: SECTION_GAP }}>
                    <LessonAnatomy />
                </Box>
                <Box sx={{ mt: SECTION_GAP }}>
                    <PathSection selected={selected} onSelect={select}>
                        {path}
                    </PathSection>
                </Box>
                <Box sx={{ mt: SECTION_GAP, mb: { xs: 2, md: 4 } }}>
                    <StartBand course={course} onSeeCourses={() => scrollToSection('courses')} />
                </Box>
            </Box>
        );
    }

    const firstName = account.status === 'signed-in' ? account.name?.split(' ')[0] : undefined;

    return (
        <Box sx={{ width: '100%', maxWidth: 940, mx: 'auto' }}>
            {/* The page's main heading, for screen readers and search engines; the cards below say the same visually. */}
            <Typography
                component="h1"
                sx={{ position: 'absolute', width: '1px', height: '1px', p: 0, m: '-1px', overflow: 'hidden', clip: 'rect(0 0 0 0)', whiteSpace: 'nowrap', border: 0 }}
            >
                AI Engineer Path: learn ML foundations, SQL and system design for free
            </Typography>
            {account.status === 'signed-in' && (
                <Typography sx={{ fontWeight: 800, color: '#fff', fontSize: { xs: '1.45rem', sm: '1.75rem' }, mb: 2.5 }}>
                    Welcome back{firstName ? `, ${firstName}` : ''}
                </Typography>
            )}
            {tracking && <GuestNote />}
            <Box sx={{ mb: 4 }}>
                {tracking ? <DailyGoalCard today={today} streak={streak} activity={progress.activity} /> : <TrackProgressCard />}
            </Box>
            {/* Lessons practised before, back for a short review just as they would fade. */}
            {tracking && <ReviewCard progress={progress} />}

            <Typography variant="caption" sx={{ display: 'block', fontWeight: 800, letterSpacing: 1.2, color: 'text.secondary', mb: 1.5 }}>
                YOUR COURSES
            </Typography>
            <CoursePicker stats={stats} selected={selected} tracking={tracking} onSelect={select} />

            <Box sx={{ maxWidth: 560, mx: 'auto' }}>{path}</Box>
        </Box>
    );
};

export default HomePage;
