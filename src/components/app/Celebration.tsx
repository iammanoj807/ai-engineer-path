// The moments that pull you on to the next step: a topic mastered (all four
// checks), a unit finished, and today's goal reached. Each one shows what
// comes next and why it matters, with one button to go straight there.

import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Confetti from 'react-confetti';
import { Alert, Box, Button, Dialog, DialogContent, Snackbar, Stack, Typography } from '@mui/material';
import BoltRoundedIcon from '@mui/icons-material/BoltRounded';
import IosShareRoundedIcon from '@mui/icons-material/IosShareRounded';
import LocalFireDepartmentRoundedIcon from '@mui/icons-material/LocalFireDepartmentRounded';
import { allTopicsOf, courseById, unitOf, type CourseInfo, type PathTopic, type PathUnit } from '../../game/courses';
import { SITE_URL, topicPath, unitPath } from '../../game/addresses';
import { checksDocOf, useGameStats } from '../../game/useProgress';
import { XP_PER_CHECK, XP_TOPIC_BONUS, checksPassedIn, readDailyGoal } from '../../game/xp';
import { onCelebrate, onDayXp, type Celebration as CelebrationEvent } from '../../services/progress';
import { FLAME, XP_GOLD } from './colours';
import Mascot from '../practice/Mascot';

interface Shown {
    course: CourseInfo;
    topic: PathTopic;
    unit?: PathUnit;
    unitComplete: boolean;
    next: PathTopic | null;
}

const useWindowSize = () => {
    const [size, setSize] = useState({ width: window.innerWidth, height: window.innerHeight });
    useEffect(() => {
        const onResize = () => setSize({ width: window.innerWidth, height: window.innerHeight });
        window.addEventListener('resize', onResize);
        return () => window.removeEventListener('resize', onResize);
    }, []);
    return size;
};

const Celebration = () => {
    const navigate = useNavigate();
    const { progress, streak } = useGameStats();
    const { width, height } = useWindowSize();
    const [shown, setShown] = useState<Shown | null>(null);
    const [goalToast, setGoalToast] = useState(false);

    // The listener needs the latest progress without re-subscribing on every tick.
    const latest = useRef(progress);
    useEffect(() => {
        latest.current = progress;
    });

    useEffect(() => onCelebrate((event: CelebrationEvent) => {
        const course = courseById(event.course);
        const topics = allTopicsOf(course);
        const topic = topics.find(t => t.id === event.topicId);
        if (!topic) return;
        const doc = checksDocOf(latest.current, course.id);
        const done = (id: string) => id === topic.id || checksPassedIn(doc, id) >= 4;
        const unit = unitOf(course, topic.id);
        const position = topics.indexOf(topic);
        // The next topic after this one that isn't mastered yet, wrapping round to any earlier gap.
        const next = [...topics.slice(position + 1), ...topics.slice(0, position)].find(t => !done(t.id)) ?? null;
        setShown({
            course,
            topic,
            unit,
            unitComplete: !!unit && unit.topics.every(t => done(t.id)),
            next,
        });
    }), []);

    // Today's goal: celebrate the tick that reaches it.
    useEffect(() => onDayXp((xpToday, added) => {
        // XP comes in steps (10 for a check, more for a practice session), so look for crossing the goal.
        const goal = readDailyGoal();
        if (xpToday >= goal && xpToday - added < goal) setGoalToast(true);
    }), []);

    const close = () => {
        setShown(null);
        setCopied(false);
    };
    const [copied, setCopied] = useState(false);

    /** Share a finished unit: the phone's own share sheet, or the link copied. */
    const shareUnit = async (course: CourseInfo, unit: PathUnit) => {
        const text = `I just finished Unit ${unit.number}, "${unit.title}", of ${course.title} on AI Engineer Path: free lessons on ML, SQL and system design.`;
        const url = `${SITE_URL}${unitPath(course, unit.id)}`;
        try {
            if (navigator.share) await navigator.share({ title: 'AI Engineer Path', text, url });
            else {
                await navigator.clipboard.writeText(`${text} ${url}`);
                setCopied(true);
            }
        } catch {
            // Closed the share sheet, or the clipboard is blocked: nothing to do.
        }
    };

    return (
        <>
            {shown && (
                <Box sx={{ position: 'fixed', inset: 0, zIndex: 1400, pointerEvents: 'none' }}>
                    <Confetti width={width} height={height} recycle={false} numberOfPieces={shown.unitComplete ? 500 : 260} />
                </Box>
            )}
            <Dialog open={!!shown} onClose={close} maxWidth="xs" fullWidth slotProps={{ paper: { sx: { borderRadius: 4, border: `1px solid ${XP_GOLD}55` } } }}>
                {shown && (
                    <DialogContent sx={{ textAlign: 'center', p: { xs: 3, sm: 4 } }}>
                        <Box sx={{ display: 'flex', justifyContent: 'center' }}>
                            <Mascot mood="cheer" size={104} />
                        </Box>
                        <Typography variant="h5" sx={{ fontWeight: 800, mt: 1 }}>
                            {shown.unitComplete && shown.unit ? `Unit ${shown.unit.number} complete!` : 'Topic mastered!'}
                        </Typography>
                        <Typography color="text.secondary" sx={{ mt: 0.5 }}>
                            {shown.unitComplete && shown.unit
                                ? `You passed every check in “${shown.unit.title}”.`
                                : `You passed all four checks for “${shown.topic.name}”.`}
                        </Typography>

                        <Stack direction="row" spacing={3} justifyContent="center" sx={{ my: 2.5 }}>
                            <Stack direction="row" alignItems="center" spacing={0.5}>
                                <BoltRoundedIcon sx={{ color: XP_GOLD }} />
                                <Typography sx={{ fontWeight: 800, color: XP_GOLD }}>+{4 * XP_PER_CHECK + XP_TOPIC_BONUS} XP</Typography>
                            </Stack>
                            <Stack direction="row" alignItems="center" spacing={0.5}>
                                <LocalFireDepartmentRoundedIcon sx={{ color: FLAME }} />
                                <Typography sx={{ fontWeight: 800, color: FLAME }}>
                                    {streak} day streak
                                </Typography>
                            </Stack>
                        </Stack>

                        {shown.next ? (
                            <Box sx={{ textAlign: 'left', p: 2, borderRadius: 3, bgcolor: `${shown.course.colour}14`, border: `1px solid ${shown.course.colour}44` }}>
                                <Typography variant="caption" sx={{ fontWeight: 800, letterSpacing: 1.2, color: shown.course.colour }}>
                                    UP NEXT
                                </Typography>
                                <Typography sx={{ fontWeight: 800, mb: 0.5 }}>{shown.next.name}</Typography>
                                <Typography variant="body2" color="text.secondary" sx={{ display: '-webkit-box', WebkitLineClamp: 4, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
                                    {shown.next.problem}
                                </Typography>
                            </Box>
                        ) : (
                            <Typography sx={{ fontWeight: 700 }}>That was the last one: every {shown.course.title} topic is mastered.</Typography>
                        )}

                        <Stack spacing={1} sx={{ mt: 3 }}>
                            {shown.next && (
                                <Button
                                    variant="contained"
                                    size="large"
                                    onClick={() => {
                                        const target = topicPath(shown.course, shown.next!.id);
                                        close();
                                        navigate(target);
                                    }}
                                    sx={{ fontWeight: 800, minHeight: 48 }}
                                >
                                    Keep going
                                </Button>
                            )}
                            {shown.unitComplete && shown.unit && (
                                <Button
                                    variant="outlined"
                                    startIcon={<IosShareRoundedIcon />}
                                    onClick={() => void shareUnit(shown.course, shown.unit!)}
                                    sx={{ fontWeight: 700, minHeight: 44, color: 'text.primary', borderColor: 'rgba(255,255,255,0.25)' }}
                                >
                                    {copied ? 'Link copied' : 'Share it'}
                                </Button>
                            )}
                            <Button onClick={close} sx={{ color: 'text.secondary' }}>
                                {shown.next ? 'Later' : 'Close'}
                            </Button>
                        </Stack>
                    </DialogContent>
                )}
            </Dialog>
            <Snackbar
                open={goalToast && !shown}
                autoHideDuration={5000}
                onClose={() => setGoalToast(false)}
                anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
            >
                <Alert
                    onClose={() => setGoalToast(false)}
                    icon={<LocalFireDepartmentRoundedIcon sx={{ color: FLAME }} />}
                    sx={{ fontWeight: 700, bgcolor: '#2a1d0e', color: '#ffe0b2', border: `1px solid ${FLAME}` }}
                >
                    Daily goal reached! {streak} day streak. Come back tomorrow to keep it going.
                </Alert>
            </Snackbar>
        </>
    );
};

export default Celebration;
