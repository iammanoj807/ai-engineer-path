// A practice session for one lesson, the way a Duolingo lesson runs: learn the
// idea and its words, then answer a short mix of cards. Each answer is checked
// at once; a miss costs a heart and the card comes back at the end. Finishing
// earns XP and keeps the streak. Cards: src/practice/build.ts.

import { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Box, Button, CircularProgress, Dialog, IconButton, LinearProgress, Link, Stack, Typography, useMediaQuery } from '@mui/material';
import { useTheme } from '@mui/material/styles';
import CloseRoundedIcon from '@mui/icons-material/CloseRounded';
import FavoriteRoundedIcon from '@mui/icons-material/FavoriteRounded';
import BoltRoundedIcon from '@mui/icons-material/BoltRounded';
import LocalFireDepartmentRoundedIcon from '@mui/icons-material/LocalFireDepartmentRounded';
import GoogleIcon from '@mui/icons-material/Google';
import StarRoundedIcon from '@mui/icons-material/StarRounded';
import VolumeUpRoundedIcon from '@mui/icons-material/VolumeUpRounded';
import VolumeOffRoundedIcon from '@mui/icons-material/VolumeOffRounded';
import RecordVoiceOverRoundedIcon from '@mui/icons-material/RecordVoiceOverRounded';
import VoiceOverOffRoundedIcon from '@mui/icons-material/VoiceOverOffRounded';
import IosShareRoundedIcon from '@mui/icons-material/IosShareRounded';
import { courseById } from '../../game/courses';
import { SITE_URL, topicPath } from '../../game/addresses';
import { useGameStats } from '../../game/useProgress';
import { SQL_CHECK_LABELS, type SqlCheckKey } from '../../data/sql';
import { buildSession, withFixCard } from '../../practice/build';
import { isChecked, type PracticeCard } from '../../practice/cards';
import { loadPracticeSources, type PracticeSources } from '../../practice/load';
import { checksProven, type CardOutcome, type SqlCard } from '../../practice/sql';
import { loadSqlEngine } from '../../utils/sqlEngine';
import { runOnPracticeDb } from '../../utils/sqlRunner';
import { savePracticeResult, type Course } from '../../services/progress';
import { useTracksProgress } from '../../services/account';
import { GlossaryProvider, GlossaryTopic } from '../learning/GlossaryText';
import { FLAME, XP_GOLD } from '../app/colours';
import { PracticeContext } from './context';
import Mascot from './Mascot';
import { GUIDE_NAMES, guideFor, type Guide } from './guides';
import { Body, Footer } from './parts';
import { PANEL, RIGHT, WRONG, bigButton } from './style';
import { playComplete, playOut, setSoundOn, useSoundOn } from './sound';
import { canSpeak, say, setVoiceOn, stopSpeaking, useVoiceOn } from './voice';
import { IdeaCardView, WordsCardView } from './cards/TeachCards';
import { MatchCardView, MistakeCardView, OrderCardView, RecallCardView } from './cards/ChoiceCards';
import { BlankCardView } from './cards/BlankCard';
import { FixCardView, PredictCardView, WriteCardView } from './cards/SqlCards';

export const HEARTS = 5;
const REPO = 'https://github.com/iammanoj807/ai-engineer-path';

/** XP: 2 for each card right first time, 1 for a recalled answer or a fixed mistake, 5 for finishing, 5 more with every heart left. */
const xpFor = (cards: PracticeCard[], outcomes: Record<string, CardOutcome>, fixed: number, hearts: number) =>
    cards.reduce((sum, card) => sum + (outcomes[card.id]?.firstTry ? (card.kind === 'recall' ? 1 : isChecked(card) ? 2 : 0) : 0), 0) + fixed + 5 + (hearts === HEARTS ? 5 : 0);

/** The share of checked cards right first time, 0–100. */
const scoreFor = (cards: PracticeCard[], outcomes: Record<string, CardOutcome>) => {
    const checked = cards.filter(isChecked);
    return checked.length ? Math.round((100 * checked.filter(card => outcomes[card.id]?.firstTry).length) / checked.length) : 100;
};

const CardView = ({ card, accent, onDone }: { card: PracticeCard; accent: string; onDone: (outcome: CardOutcome) => void }) => {
    switch (card.kind) {
        case 'idea': return <IdeaCardView card={card} accent={accent} onDone={onDone} />;
        case 'words': return <WordsCardView card={card} accent={accent} onDone={onDone} />;
        case 'match': return <MatchCardView card={card} accent={accent} onDone={onDone} />;
        case 'blank': return <BlankCardView card={card} accent={accent} onDone={onDone} />;
        case 'order': return <OrderCardView card={card} accent={accent} onDone={onDone} />;
        case 'mistake': return <MistakeCardView card={card} accent={accent} onDone={onDone} />;
        case 'recall': return <RecallCardView card={card} accent={accent} onDone={onDone} />;
        case 'predict': return <PredictCardView card={card} accent={accent} onDone={onDone} />;
        case 'write': return <WriteCardView card={card} accent={accent} onDone={onDone} />;
        case 'fix': return <FixCardView card={card} accent={accent} onDone={onDone} />;
    }
};

/** A full-card message from the guide: getting ready, out of hearts, fix your mistakes, leaving. */
const Moment = ({ guide, mood, title, children, actions, quiet = false }: { guide: Guide; mood: 'think' | 'sad' | 'happy' | 'cheer' | 'idle'; title: string; children?: React.ReactNode; actions: React.ReactNode; quiet?: boolean }) => {
    // The guide says the message out loud (not "getting ready": the first card follows at once).
    useEffect(() => {
        if (!quiet) say(title, guide);
    }, [title, guide, quiet]);
    return (
    <>
        <Body>
            <Stack alignItems="center" textAlign="center" spacing={2} sx={{ pt: { xs: 4, sm: 8 } }}>
                <Mascot mood={mood} size={128} who={guide} />
                <Typography id="practice-question" component="h2" sx={{ fontWeight: 800, fontSize: { xs: '1.5rem', sm: '1.9rem' }, color: '#fff' }}>
                    {title}
                </Typography>
                {children && <Typography color="text.secondary" sx={{ maxWidth: 480, lineHeight: 1.6 }}>{children}</Typography>}
            </Stack>
        </Body>
        <Footer feedback={null}>{actions}</Footer>
    </>
    );
};

// ============ THE END ============

const Summary = ({
    course,
    topicId,
    topicName,
    lessonUrl,
    cards,
    outcomes,
    fixed,
    hearts,
    accent,
    progress,
    streak,
    onAgain,
    onLesson,
    onClose,
}: {
    course: Course;
    topicId: string;
    topicName: string;
    lessonUrl: string;
    cards: PracticeCard[];
    outcomes: Record<string, CardOutcome>;
    fixed: number;
    hearts: number;
    accent: string;
    /** From the session, which has been listening since it opened: loaded by the time the summary shows. */
    progress: ReturnType<typeof useGameStats>['progress'];
    streak: number;
    onAgain: () => void;
    onLesson: () => void;
    onClose: () => void;
}) => {
    const tracking = useTracksProgress();
    const xp = xpFor(cards, outcomes, fixed, hearts);
    const score = scoreFor(cards, outcomes);
    const perfect = score === 100 && hearts === HEARTS;
    // As they were when this summary opened: the checks ticked already, and whether progress
    // was being saved. Signing in from here saves through the sign-in flow (which waits for the
    // account's progress), never through the effect below as well.
    const [alreadyTicked] = useState<SqlCheckKey[]>(() =>
        (['explain', 'write', 'predict', 'edge'] as const).filter(check => progress.sql?.checks[topicId]?.[check] === true)
    );
    const [trackingAtStart] = useState(tracking);
    useEffect(() => playComplete(), []);
    // After the tune, the guide says how it went.
    useEffect(() => {
        const timer = window.setTimeout(() => say(perfect ? 'Perfect lesson!' : 'Lesson complete!', guideFor(topicId)), 1100);
        return () => window.clearTimeout(timer);
    }, [perfect, topicId]);
    const proven = useMemo(
        () => (course === 'sql' ? checksProven(cards.filter((card): card is SqlCard => card.kind === 'predict' || card.kind === 'write'), outcomes) : []),
        [course, cards, outcomes]
    );
    const toTick = useMemo(() => proven.filter(check => !alreadyTicked.includes(check)), [proven, alreadyTicked]);
    const [saved, setSaved] = useState(false);
    const [askedToSignIn, setAskedToSignIn] = useState(false);
    const savedOnce = useRef(false);
    const result = useMemo(() => ({ xp, score, checks: toTick }), [xp, score, toTick]);

    useEffect(() => {
        if (!trackingAtStart || savedOnce.current) return;
        savedOnce.current = true;
        savePracticeResult(course, topicId, result)
            .then(() => setSaved(true))
            .catch(error => console.error('Could not save the practice session:', error));
    }, [trackingAtStart, course, topicId, result]);

    const signInToSave = () => {
        if (savedOnce.current) return;
        savedOnce.current = true;
        setAskedToSignIn(true);
        // Signed out, this asks for sign-in; the save itself runs after it (services/progress.ts).
        void savePracticeResult(course, topicId, result);
    };
    const savedAfterSignIn = askedToSignIn && (progress[course]?.practice?.[topicId]?.times ?? 0) > 0;
    const [copied, setCopied] = useState(false);

    /** Share a perfect lesson: the phone's own share sheet, or the link copied. */
    const share = async () => {
        const text = `I just aced "${topicName}" on AI Engineer Path: free lessons on ML, SQL and system design, practised like a game.`;
        try {
            if (navigator.share) await navigator.share({ title: 'AI Engineer Path', text, url: lessonUrl });
            else {
                await navigator.clipboard.writeText(`${text} ${lessonUrl}`);
                setCopied(true);
            }
        } catch {
            // Closed the share sheet, or the clipboard is blocked: nothing to do.
        }
    };
    const isSaved = saved || savedAfterSignIn;

    return (
        <>
            <Body>
                <Stack alignItems="center" textAlign="center" spacing={1.5} sx={{ pt: { xs: 1, sm: 3 } }}>
                    <Mascot mood="cheer" size={120} who={guideFor(topicId)} />
                    <Typography id="practice-question" component="h2" sx={{ fontWeight: 800, fontSize: { xs: '1.7rem', sm: '2.1rem' }, color: '#fff' }}>
                        {perfect ? 'Perfect lesson!' : 'Lesson complete!'}
                    </Typography>
                    <Typography color="text.secondary">{topicName}</Typography>
                </Stack>
                <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 1.5, mt: 3, maxWidth: 480, mx: 'auto' }}>
                    {[
                        { label: 'XP EARNED', value: `+${xp}`, colour: XP_GOLD, icon: <BoltRoundedIcon /> },
                        { label: 'FIRST TRY', value: `${score}%`, colour: RIGHT, icon: null },
                        { label: 'HEARTS LEFT', value: `${hearts}`, colour: WRONG, icon: <FavoriteRoundedIcon /> },
                    ].map(stat => (
                        <Box key={stat.label} sx={{ borderRadius: 3, border: `2px solid ${stat.colour}`, overflow: 'hidden', textAlign: 'center' }}>
                            <Typography sx={{ bgcolor: stat.colour, color: '#0b0f14', fontWeight: 800, fontSize: '0.7rem', letterSpacing: 0.8, py: 0.4 }}>{stat.label}</Typography>
                            <Stack direction="row" spacing={0.5} alignItems="center" justifyContent="center" sx={{ py: 1.25, color: stat.colour }}>
                                {stat.icon}
                                <Typography sx={{ fontWeight: 800, fontSize: '1.4rem', color: stat.colour }}>{stat.value}</Typography>
                            </Stack>
                        </Box>
                    ))}
                </Box>
                <Box sx={{ mt: 3, maxWidth: 480, mx: 'auto', p: 2.25, borderRadius: 3, bgcolor: 'rgba(255,255,255,0.04)', textAlign: 'center' }}>
                    {isSaved || (trackingAtStart && !saved) ? (
                        <Stack direction="row" spacing={1} alignItems="center" justifyContent="center">
                            <LocalFireDepartmentRoundedIcon sx={{ color: FLAME }} />
                            <Typography sx={{ fontWeight: 800 }}>
                                {isSaved ? `${streak}-day streak. Saved to your progress.` : 'Saving…'}
                            </Typography>
                        </Stack>
                    ) : askedToSignIn ? (
                        <Typography sx={{ fontWeight: 700 }}>Your XP is saved as soon as you sign in.</Typography>
                    ) : (
                        <>
                            <Typography sx={{ fontWeight: 700, mb: 1.25 }}>Keep this XP and your streak</Typography>
                            <Button variant="contained" startIcon={tracking ? undefined : <GoogleIcon />} onClick={signInToSave} sx={{ fontWeight: 800, minHeight: 44 }}>
                                {tracking ? 'Save to my progress' : 'Sign in to save'}
                            </Button>
                        </>
                    )}
                    {proven.length > 0 && (
                        <Typography variant="body2" color="text.secondary" sx={{ mt: 1.25 }}>
                            You proved {proven.map(check => SQL_CHECK_LABELS[check]).join(' and ')}
                            {toTick.length === 0 ? ' (already ticked).' : isSaved ? ': ticked for you.' : ': it is ticked when this is saved.'}
                        </Typography>
                    )}
                </Box>
                {perfect && (
                    <Box sx={{ textAlign: 'center', mt: 2.5 }}>
                        <Button variant="outlined" startIcon={<IosShareRoundedIcon />} onClick={() => void share()} sx={{ fontWeight: 700, minHeight: 44, color: 'text.primary', borderColor: 'rgba(255,255,255,0.25)' }}>
                            {copied ? 'Link copied' : 'Share it'}
                        </Button>
                    </Box>
                )}
                <Typography variant="body2" color="text.secondary" sx={{ mt: 3, textAlign: 'center' }}>
                    Enjoying {GUIDE_NAMES[guideFor(topicId)]} and the lessons?{' '}
                    <Link href={REPO} target="_blank" rel="noopener" sx={{ fontWeight: 700, display: 'inline-flex', alignItems: 'center', gap: 0.25, verticalAlign: 'bottom' }}>
                        <StarRoundedIcon sx={{ fontSize: 18, color: XP_GOLD }} /> Star the project on GitHub
                    </Link>
                </Typography>
            </Body>
            <Footer feedback={null}>
                <Button onClick={onAgain} sx={{ minHeight: 48, fontWeight: 700 }}>
                    Practise again
                </Button>
                <Button onClick={onLesson} sx={{ minHeight: 48, fontWeight: 700, display: { xs: 'none', sm: 'inline-flex' } }}>
                    Read the lesson
                </Button>
                <Button variant="contained" onClick={onClose} sx={bigButton} style={{ backgroundColor: accent, color: '#0b0f14' }}>
                    Done
                </Button>
            </Footer>
        </>
    );
};

// ============ THE SESSION ============

type Phase = 'play' | 'mistakes' | 'retry' | 'out' | 'done';

const PracticeSession = ({ course, topicId, onClose }: { course: Course; topicId: string; onClose: () => void }) => {
    const theme = useTheme();
    const fullScreen = useMediaQuery(theme.breakpoints.down('sm'));
    const navigate = useNavigate();
    const info = courseById(course);
    const accent = info.colour;
    // Subscribed from the start, so the summary reads progress that has already loaded.
    const { progress, streak } = useGameStats();

    const [sources, setSources] = useState<PracticeSources | null>(null);
    const [cards, setCards] = useState<PracticeCard[] | null>(null);
    const [failed, setFailed] = useState(false);
    const [attempt, setAttempt] = useState(0);

    const [round, setRound] = useState(0);
    const [phase, setPhase] = useState<Phase>('play');
    const [index, setIndex] = useState(0);
    const [outcomes, setOutcomes] = useState<Record<string, CardOutcome>>({});
    const [retry, setRetry] = useState<PracticeCard[]>([]);
    const [retryIndex, setRetryIndex] = useState(0);
    const [fixed, setFixed] = useState(0);
    const [hearts, setHearts] = useState(HEARTS);
    const [leaving, setLeaving] = useState(false);
    const sound = useSoundOn();
    const voice = useVoiceOn();

    // Closing practice stops the guide mid-sentence.
    useEffect(() => stopSpeaking, []);

    useEffect(() => {
        if (phase === 'out') playOut();
    }, [phase]);

    useEffect(() => {
        let live = true;
        (async () => {
            const loaded = await loadPracticeSources(course);
            const topic = loaded.findTopic(topicId);
            if (!topic) throw new Error(`No lesson ${topicId}`);
            let built = buildSession(course, topic, { glossary: loaded.glossary, sqlAnswers: loaded.sqlAnswers });
            if (course === 'sql') {
                const engine = await loadSqlEngine();
                built = withFixCard(built, sql => runOnPracticeDb(engine, sql));
            }
            if (!live) return;
            setSources(loaded);
            setCards(built);
        })().catch(error => {
            console.error('Could not start practice:', error);
            if (live) setFailed(true);
        });
        return () => {
            live = false;
        };
    }, [course, topicId, attempt]);

    const guide = guideFor(topicId);
    const setting = useMemo(
        () => ({ course, topicId, guide: guideFor(topicId), prose: (text: string) => (sources ? sources.glossary.segmentText(text) : text) }),
        [course, topicId, sources]
    );

    const openLesson = (id = topicId) => {
        onClose();
        navigate(topicPath(info, id));
    };

    const restart = () => {
        setRound(r => r + 1);
        setPhase('play');
        setIndex(0);
        setOutcomes({});
        setRetry([]);
        setRetryIndex(0);
        setFixed(0);
        setHearts(HEARTS);
    };

    // Leaving part-way asks first; at the start or the end it just closes.
    const playing = cards !== null && (phase === 'play' || phase === 'retry' || phase === 'mistakes') && (index > 0 || phase !== 'play');
    const askToClose = () => (playing ? setLeaving(true) : onClose());

    const total = (cards?.length ?? 0) + retry.length;
    const doneSoFar = phase === 'done' ? total : phase === 'play' ? index : (cards?.length ?? 0) + retryIndex;

    const finishCard = (card: PracticeCard, outcome: CardOutcome) => {
        const missed = isChecked(card) && !outcome.firstTry;
        const heartsLeft = missed ? hearts - 1 : hearts;
        if (missed) setHearts(heartsLeft);
        if (phase === 'play') {
            setOutcomes(previous => ({ ...previous, [card.id]: outcome }));
            const nextRetry = missed ? [...retry, card] : retry;
            if (missed) setRetry(nextRetry);
            if (heartsLeft <= 0) return setPhase('out');
            if (index + 1 < (cards?.length ?? 0)) return setIndex(index + 1);
            return setPhase(nextRetry.length ? 'mistakes' : 'done');
        }
        // The mistakes round: a card put right now earns a point back.
        if (outcome.solved && !outcome.revealed) setFixed(n => n + 1);
        if (heartsLeft <= 0) return setPhase('out');
        if (retryIndex + 1 < retry.length) return setRetryIndex(retryIndex + 1);
        setPhase('done');
    };

    const current = phase === 'play' ? cards?.[index] : phase === 'retry' ? retry[retryIndex] : undefined;
    const topicName = cards?.[0]?.kind === 'idea' ? cards[0].title : '';

    let content: React.ReactNode;
    if (failed) {
        content = (
            <Moment
                guide={guide}
                mood="sad"
                title="Practice didn't load"
                actions={
                    <Button variant="contained" onClick={() => { setFailed(false); setAttempt(n => n + 1); }} sx={bigButton}>
                        Try again
                    </Button>
                }
            >
                Check your connection, then try again.
            </Moment>
        );
    } else if (!cards || !sources) {
        content = (
            <Moment guide={guide} mood="think" title="Getting your practice ready…" actions={<CircularProgress size={28} />} quiet>
                {GUIDE_NAMES[guide]} is picking the cards for this lesson.
            </Moment>
        );
    } else if (leaving) {
        content = (
            <Moment
                guide={guide}
                mood="sad"
                title="Leave this practice?"
                actions={
                    <>
                        <Button onClick={onClose} sx={{ minHeight: 48, fontWeight: 700, color: 'text.secondary' }}>
                            Leave
                        </Button>
                        <Button variant="contained" onClick={() => setLeaving(false)} sx={bigButton} autoFocus disableFocusRipple>
                            Keep going
                        </Button>
                    </>
                }
            >
                If you leave now, the XP from this session is lost.
            </Moment>
        );
    } else if (phase === 'out') {
        content = (
            <Moment
                guide={guide}
                mood="sad"
                title="Out of hearts"
                actions={
                    <>
                        <Button onClick={() => openLesson()} sx={{ minHeight: 48, fontWeight: 700 }}>
                            Read the lesson
                        </Button>
                        <Button variant="contained" onClick={restart} sx={bigButton} autoFocus disableFocusRipple>
                            Try again
                        </Button>
                    </>
                }
            >
                That's how learning feels: mistakes are where it happens. Read the lesson once more, then try again.
            </Moment>
        );
    } else if (phase === 'mistakes') {
        content = (
            <Moment
                guide={guide}
                mood="think"
                title="Let's fix your mistakes"
                actions={
                    <Button variant="contained" onClick={() => setPhase('retry')} sx={bigButton} autoFocus disableFocusRipple>
                        Continue
                    </Button>
                }
            >
                {retry.length === 1 ? 'One card comes back' : `${retry.length} cards come back`}. Getting them right now is how they stick.
            </Moment>
        );
    } else if (phase === 'done') {
        content = (
            <Summary
                key={round}
                course={course}
                topicId={topicId}
                topicName={topicName}
                lessonUrl={`${SITE_URL}${topicPath(info, topicId)}`}
                cards={cards}
                outcomes={outcomes}
                fixed={fixed}
                hearts={hearts}
                accent={accent}
                progress={progress}
                streak={streak}
                onAgain={restart}
                onLesson={() => openLesson()}
                onClose={onClose}
            />
        );
    } else if (current) {
        content = <CardView key={`${round}-${phase}-${current.id}`} card={current} accent={accent} onDone={outcome => finishCard(current, outcome)} />;
    }

    return (
        <Dialog
            open
            onClose={askToClose}
            fullScreen={fullScreen}
            fullWidth
            maxWidth="md"
            aria-labelledby="practice-question"
            slotProps={{ paper: { sx: { bgcolor: PANEL, backgroundImage: 'none', height: { sm: 'min(880px, 94vh)' }, display: 'flex', flexDirection: 'column', borderRadius: { sm: 3 } } } }}
        >
            <Stack direction="row" spacing={{ xs: 1.25, sm: 2 }} alignItems="center" sx={{ px: { xs: 1, sm: 2 }, py: 1.25, borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
                <IconButton onClick={askToClose} aria-label="Close practice">
                    <CloseRoundedIcon />
                </IconButton>
                <LinearProgress
                    variant="determinate"
                    value={total ? (Math.min(doneSoFar, total) / total) * 100 : 0}
                    aria-label={`${Math.min(doneSoFar, total)} of ${total} cards done`}
                    sx={{ flex: 1, height: 14, borderRadius: 7, bgcolor: 'rgba(255,255,255,0.08)', '& .MuiLinearProgress-bar': { bgcolor: phase === 'retry' ? XP_GOLD : accent, borderRadius: 7 } }}
                />
                {canSpeak() && (
                    <IconButton onClick={() => setVoiceOn(!voice)} aria-label={voice ? "Turn the guide's voice off" : "Turn the guide's voice on"} aria-pressed={voice} sx={{ color: 'text.secondary' }}>
                        {voice ? <RecordVoiceOverRoundedIcon /> : <VoiceOverOffRoundedIcon />}
                    </IconButton>
                )}
                <IconButton onClick={() => setSoundOn(!sound)} aria-label={sound ? 'Turn sound effects off' : 'Turn sound effects on'} aria-pressed={sound} sx={{ color: 'text.secondary' }}>
                    {sound ? <VolumeUpRoundedIcon /> : <VolumeOffRoundedIcon />}
                </IconButton>
                <Stack direction="row" spacing={0.5} alignItems="center" aria-label={`${hearts} ${hearts === 1 ? 'heart' : 'hearts'} left`} sx={{ pr: 1 }}>
                    <FavoriteRoundedIcon key={hearts} sx={{ color: hearts > 0 ? WRONG : 'text.disabled', ...(hearts < HEARTS ? { animation: 'heartLost 0.5s', '@keyframes heartLost': { '0%': { transform: 'scale(1.5)' }, '100%': { transform: 'scale(1)' } } } : {}) }} />
                    <Typography sx={{ fontWeight: 800, color: hearts > 0 ? WRONG : 'text.disabled', minWidth: 12 }}>{hearts}</Typography>
                </Stack>
            </Stack>
            <PracticeContext.Provider value={setting}>
                {sources ? (
                    <GlossaryProvider source={sources.pageGlossary} openTopic={id => openLesson(id)}>
                        <GlossaryTopic topicId={topicId}>{content}</GlossaryTopic>
                    </GlossaryProvider>
                ) : (
                    content
                )}
            </PracticeContext.Provider>
        </Dialog>
    );
};

export default PracticeSession;
