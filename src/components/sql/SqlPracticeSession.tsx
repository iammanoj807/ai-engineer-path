// Quick practice for one SQL lesson, one card at a time, the way a Duolingo
// lesson runs: answer, Check, see right or wrong at once, Continue. Queries
// you write run on the practice database and are checked against the answer's
// rows (utils/sqlPractice.ts). At the end, the checks you proved are ticked.

import { useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { Alert, Box, Button, ButtonBase, CircularProgress, Collapse, Dialog, IconButton, LinearProgress, Stack, TextField, Typography, useMediaQuery } from '@mui/material';
import { useTheme } from '@mui/material/styles';
import CloseRoundedIcon from '@mui/icons-material/CloseRounded';
import CheckCircleRoundedIcon from '@mui/icons-material/CheckCircleRounded';
import CancelRoundedIcon from '@mui/icons-material/CancelRounded';
import EmojiEventsRoundedIcon from '@mui/icons-material/EmojiEventsRounded';
import TableChartRoundedIcon from '@mui/icons-material/TableChartRounded';
import VisibilityRoundedIcon from '@mui/icons-material/VisibilityRounded';
import GoogleIcon from '@mui/icons-material/Google';
import { SQL_CHECK_LABELS, type SqlCheckKey, type SqlTopic } from '../../data/sql';
import { loadSqlEngine } from '../../utils/sqlEngine';
import { runOnPracticeDb } from '../../utils/sqlRunner';
import { CARD_LABELS, checksProven, compareResults, type CardOutcome, type PredictCard, type SqlCard, type Verdict, type WriteCard } from '../../utils/sqlPractice';
import { saveSqlChecks, type SqlProgress } from '../../services/progress';
import { useTracksProgress } from '../../services/account';
import { CONFIDENT, TAP } from '../learning/learning';
import { CodeBlock } from '../learning/LearningParts';
import { ProseText } from '../learning/GlossaryText';
import { MONO, QueryError, ResultTable, TableColumns } from './SqlParts';

const WRONG = '#ef9a9a';
const PANEL = '#0f131b';

type Feedback = { tone: 'right' | 'wrong' | 'shown'; title: string; detail?: string } | null;

/** The bar along the bottom: what happened, and the next button. Green when right, red when not. */
const Footer = ({ feedback, children }: { feedback: Feedback; children: ReactNode }) => {
    const colour = feedback?.tone === 'right' ? CONFIDENT : feedback?.tone === 'wrong' ? WRONG : undefined;
    return (
        <Box
            sx={{
                borderTop: '1px solid',
                borderColor: colour ? `${colour}55` : 'rgba(255,255,255,0.08)',
                bgcolor: colour ? `${colour}14` : PANEL,
                px: { xs: 2, sm: 4 },
                py: 2,
                transition: 'background-color 0.2s',
            }}
        >
            <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2} alignItems={{ xs: 'stretch', sm: 'center' }} justifyContent="space-between" sx={{ maxWidth: 760, mx: 'auto' }}>
                <Box role="status" aria-live="polite" sx={{ minWidth: 0, flex: 1 }}>
                    {feedback && (
                        <Stack direction="row" spacing={1.25} alignItems="flex-start">
                            {feedback.tone === 'right' && <CheckCircleRoundedIcon sx={{ color: CONFIDENT, fontSize: 30, flexShrink: 0 }} />}
                            {feedback.tone === 'wrong' && <CancelRoundedIcon sx={{ color: WRONG, fontSize: 30, flexShrink: 0 }} />}
                            {feedback.tone === 'shown' && <VisibilityRoundedIcon sx={{ color: 'text.secondary', fontSize: 28, flexShrink: 0 }} />}
                            <Box>
                                <Typography sx={{ fontWeight: 800, color: colour ?? 'text.primary', fontSize: '1.1rem' }}>{feedback.title}</Typography>
                                {feedback.detail && <Typography variant="body2" sx={{ color: 'text.primary' }}>{feedback.detail}</Typography>}
                            </Box>
                        </Stack>
                    )}
                </Box>
                <Stack direction="row" spacing={1} justifyContent="flex-end" flexShrink={0}>
                    {children}
                </Stack>
            </Stack>
        </Box>
    );
};

const bigButton = { minHeight: 48, px: 3.5, fontWeight: 800, fontSize: '1rem' } as const;

/** "WRITE THE QUERY" → "Write the query", for lists where capitals would shout. */
const sentenceCase = (label: string) => label.charAt(0) + label.slice(1).toLowerCase();

const CardLabel = ({ text, accent }: { text: string; accent: string }) => (
    <Typography variant="caption" sx={{ display: 'block', fontWeight: 800, letterSpacing: 1.2, color: accent, mb: 1 }}>
        {text}
    </Typography>
);

const Body = ({ children }: { children: ReactNode }) => (
    <Box sx={{ flex: 1, overflowY: 'auto', px: { xs: 2, sm: 4 }, py: { xs: 2.5, sm: 3.5 } }}>
        <Box sx={{ maxWidth: 760, mx: 'auto' }}>{children}</Box>
    </Box>
);

// ============ PREDICT THE ROWS ============

const PredictCardView = ({ card, accent, onDone }: { card: PredictCard; accent: string; onDone: (outcome: CardOutcome) => void }) => {
    const [chosen, setChosen] = useState<number | null>(null);
    const [checked, setChecked] = useState(false);
    const rows = card.result.rows.length;
    const right = chosen === rows;
    const outcome = (): CardOutcome => ({ firstTry: right, solved: right, revealed: false });

    const check = () => {
        if (chosen !== null) setChecked(true);
    };

    // 1–4 pick a choice; Enter checks, then continues. A focused button handles its own Enter.
    useEffect(() => {
        const onKey = (event: KeyboardEvent) => {
            const target = event.target;
            if (target instanceof HTMLTextAreaElement || target instanceof HTMLInputElement) return;
            const pick = Number(event.key) - 1;
            if (!checked && pick >= 0 && pick < card.options.length) setChosen(card.options[pick]);
            if (event.key === 'Enter' && !(target instanceof HTMLButtonElement)) {
                event.preventDefault();
                if (!checked && chosen !== null) setChecked(true);
                else if (checked) onDone({ firstTry: chosen === rows, solved: chosen === rows, revealed: false });
            }
        };
        window.addEventListener('keydown', onKey);
        return () => window.removeEventListener('keydown', onKey);
    }, [card.options, checked, chosen, onDone, rows]);

    return (
        <>
            <Body>
                <CardLabel text={CARD_LABELS.predict} accent={accent} />
                <Typography id="practice-question" component="h2" sx={{ fontWeight: 800, fontSize: { xs: '1.3rem', sm: '1.5rem' }, color: '#fff', mb: 2 }}>
                    How many rows does this query return?
                </Typography>
                <CodeBlock code={card.sql} language="sql" />
                <Box role="radiogroup" aria-label="Number of rows" sx={{ display: 'grid', gridTemplateColumns: { xs: 'repeat(2, 1fr)', sm: 'repeat(4, 1fr)' }, gap: 1.5, mt: 2.5 }}>
                    {card.options.map((option, i) => {
                        const isChosen = chosen === option;
                        const isAnswer = checked && option === rows;
                        const isWrongPick = checked && isChosen && option !== rows;
                        const colour = isAnswer ? CONFIDENT : isWrongPick ? WRONG : isChosen ? accent : undefined;
                        return (
                            <ButtonBase
                                key={option}
                                role="radio"
                                aria-checked={isChosen}
                                disabled={checked}
                                onClick={() => setChosen(option)}
                                sx={{
                                    minHeight: 72,
                                    borderRadius: 3,
                                    border: '2px solid',
                                    borderColor: colour ?? 'rgba(255,255,255,0.14)',
                                    borderBottomWidth: 4,
                                    bgcolor: colour ? `${colour}1f` : 'rgba(255,255,255,0.03)',
                                    flexDirection: 'column',
                                    transition: 'border-color 0.15s, background-color 0.15s, transform 0.1s',
                                    '&:hover': { bgcolor: colour ? `${colour}29` : 'rgba(255,255,255,0.07)' },
                                    '&:active': { transform: 'translateY(2px)' },
                                    '&.Mui-disabled': { opacity: isAnswer || isWrongPick ? 1 : 0.55 },
                                }}
                            >
                                <Typography sx={{ fontWeight: 800, fontSize: '1.6rem', color: colour ?? 'text.primary', lineHeight: 1.1 }}>{option}</Typography>
                                <Typography variant="caption" sx={{ color: 'text.secondary' }}>
                                    {option === 1 ? 'row' : 'rows'} <Box component="span" sx={{ display: { xs: 'none', sm: 'inline' }, opacity: 0.6 }}>· {i + 1}</Box>
                                </Typography>
                            </ButtonBase>
                        );
                    })}
                </Box>
                {checked && (
                    <Box sx={{ mt: 3 }}>
                        <Typography variant="caption" sx={{ display: 'block', fontWeight: 800, letterSpacing: 1, color: 'text.secondary', mb: 1 }}>
                            WHAT IT RETURNS
                        </Typography>
                        <ResultTable result={card.result} />
                    </Box>
                )}
            </Body>
            <Footer
                feedback={
                    checked
                        ? right
                            ? { tone: 'right', title: 'Correct!' }
                            : { tone: 'wrong', title: `Not quite: it returns ${rows} ${rows === 1 ? 'row' : 'rows'}.`, detail: 'Look at the rows above and find the ones you missed or added.' }
                        : null
                }
            >
                {checked ? (
                    <Button variant="contained" onClick={() => onDone(outcome())} sx={bigButton} color={right ? 'success' : 'primary'}>
                        Continue
                    </Button>
                ) : (
                    <Button variant="contained" onClick={check} disabled={chosen === null} sx={bigButton}>
                        Check
                    </Button>
                )}
            </Footer>
        </>
    );
};

// ============ WRITE THE QUERY ============

type Ran = { result: { columns: string[]; rows: (string | number | null)[][] } } | { error: string };

const WriteCardView = ({ card, accent, onDone }: { card: WriteCard; accent: string; onDone: (outcome: CardOutcome) => void }) => {
    const [sql, setSql] = useState('');
    const [running, setRunning] = useState(false);
    const [ran, setRan] = useState<Ran | null>(null);
    const [verdict, setVerdict] = useState<Verdict | null>(null);
    const [engineError, setEngineError] = useState<string | null>(null);
    const [revealed, setRevealed] = useState(false);
    const [showTables, setShowTables] = useState(false);
    const [tries, setTries] = useState(0);
    /** The try that first got it right. */
    const [solvedOnTry, setSolvedOnTry] = useState<number | null>(null);
    const solved = verdict?.ok === true;

    const outcome = (): CardOutcome => ({ firstTry: solvedOnTry === 1, solved: solvedOnTry !== null, revealed });

    const check = async () => {
        if (!sql.trim() || running) return;
        setRunning(true);
        setEngineError(null);
        try {
            const engine = await loadSqlEngine();
            const attempt = tries + 1;
            setTries(attempt);
            try {
                const result = runOnPracticeDb(engine, sql);
                const next = compareResults(result, card.expected, card.order);
                setRan({ result });
                setVerdict(next);
                if (next.ok && solvedOnTry === null) setSolvedOnTry(attempt);
            } catch (error) {
                setRan({ error: error instanceof Error ? error.message : String(error) });
                setVerdict({ ok: false, reason: 'values', message: 'The database could not run it. Read the error below.' });
            }
        } catch {
            setEngineError('The SQL engine did not load. Check your connection, then press Check again.');
        } finally {
            setRunning(false);
        }
    };

    const feedback: Feedback = solved
        ? { tone: 'right', title: 'Correct!', detail: verdict.note ?? 'Your query returns the same rows as the answer.' }
        : verdict && !verdict.ok
            ? { tone: 'wrong', title: 'Not yet', detail: verdict.message }
            : revealed
                ? { tone: 'shown', title: 'Here is one good answer.', detail: 'Type it yourself and run it, so your hands learn it too.' }
                : null;

    return (
        <>
            <Body>
                <CardLabel text={card.label} accent={accent} />
                <Typography id="practice-question" component="h2" sx={{ fontWeight: 700, fontSize: { xs: '1.1rem', sm: '1.25rem' }, color: '#fff', mb: 2, lineHeight: 1.45 }}>
                    <ProseText value={card.prompt} />
                </Typography>
                <Typography variant="body2" sx={{ color: 'text.secondary', mb: 1 }}>
                    Return {card.expected.columns.length === 1 ? '1 column' : `${card.expected.columns.length} columns`}:{' '}
                    <Box component="span" sx={{ fontFamily: MONO, color: 'text.primary' }}>{card.expected.columns.join(', ')}</Box>{' '}
                    (your names and column order can differ).
                </Typography>
                <Button
                    size="small"
                    startIcon={<TableChartRoundedIcon />}
                    onClick={() => setShowTables(open => !open)}
                    aria-expanded={showTables}
                    sx={{ mb: 1, color: 'text.secondary', textTransform: 'none', fontWeight: 700, minHeight: 36 }}
                >
                    {showTables ? 'Hide the tables' : 'Show the tables'}
                </Button>
                <Collapse in={showTables} unmountOnExit>
                    <TableColumns />
                </Collapse>
                <TextField
                    multiline
                    fullWidth
                    minRows={5}
                    value={sql}
                    placeholder={'SELECT …\nFROM …'}
                    onChange={event => setSql(event.target.value)}
                    onKeyDown={event => {
                        if (event.key === 'Enter' && (event.metaKey || event.ctrlKey)) {
                            event.preventDefault();
                            if (solved) onDone(outcome());
                            else void check();
                        }
                    }}
                    slotProps={{
                        htmlInput: {
                            spellCheck: false,
                            autoCapitalize: 'off',
                            autoCorrect: 'off',
                            'aria-label': 'Your SQL query',
                            style: { fontFamily: MONO, fontSize: '0.95rem', lineHeight: 1.55 },
                        },
                    }}
                    sx={{ '& .MuiInputBase-root': { bgcolor: '#000' } }}
                />
                <Typography variant="caption" sx={{ display: 'block', color: 'text.secondary', mt: 0.75 }}>
                    It runs on the practice database. Ctrl or ⌘ + Enter checks it.
                </Typography>
                {engineError && <Alert severity="warning" sx={{ mt: 2 }}>{engineError}</Alert>}
                {ran && (
                    <Box sx={{ mt: 2.5 }}>
                        <Typography variant="caption" sx={{ display: 'block', fontWeight: 800, letterSpacing: 1, color: 'text.secondary', mb: 1 }}>
                            YOUR RESULT
                        </Typography>
                        {'error' in ran ? <QueryError message={ran.error} /> : <ResultTable result={ran.result} />}
                    </Box>
                )}
                {revealed && (
                    <Box sx={{ mt: 3 }}>
                        <Typography variant="caption" sx={{ display: 'block', fontWeight: 800, letterSpacing: 1, color: accent, mb: 1 }}>
                            ONE GOOD ANSWER
                        </Typography>
                        <CodeBlock code={card.answerSql} language="sql" />
                        <Box sx={{ mt: 1.5 }}>
                            <ResultTable result={card.expected} />
                        </Box>
                    </Box>
                )}
            </Body>
            <Footer feedback={feedback}>
                {!solved && !revealed && (
                    <Button onClick={() => setRevealed(true)} sx={{ minHeight: 48, fontWeight: 700, color: 'text.secondary' }}>
                        Show answer
                    </Button>
                )}
                {(solved || revealed) && (
                    <Button variant="contained" onClick={() => onDone(outcome())} sx={bigButton} color={solved ? 'success' : 'primary'}>
                        Continue
                    </Button>
                )}
                {!solved && (
                    <Button
                        variant={revealed ? 'outlined' : 'contained'}
                        onClick={() => void check()}
                        disabled={!sql.trim() || running}
                        startIcon={running ? <CircularProgress size={16} color="inherit" /> : undefined}
                        sx={bigButton}
                    >
                        {tries > 0 ? 'Check again' : 'Check'}
                    </Button>
                )}
            </Footer>
        </>
    );
};

// ============ THE END ============

const Summary = ({
    topic,
    cards,
    outcomes,
    progress,
    accent,
    onAgain,
    onClose,
}: {
    topic: SqlTopic;
    cards: SqlCard[];
    outcomes: Record<string, CardOutcome>;
    progress: SqlProgress;
    accent: string;
    onAgain: () => void;
    onClose: () => void;
}) => {
    const tracking = useTracksProgress();
    // Both as they were when this summary opened: what was ticked already, and
    // whether progress was being saved. Signing in from here saves through the
    // sign-in flow (which waits for the account's progress), never through the
    // effect below as well.
    const [alreadyTicked] = useState<SqlCheckKey[]>(() =>
        (['explain', 'write', 'predict', 'edge'] as const).filter(check => progress.checks[topic.id]?.[check] === true)
    );
    const [trackingAtStart] = useState(tracking);
    const proven = useMemo(() => checksProven(cards, outcomes), [cards, outcomes]);
    const toSave = useMemo(() => proven.filter(check => !alreadyTicked.includes(check)), [proven, alreadyTicked]);
    const firstTry = cards.filter(card => outcomes[card.id]?.firstTry).length;
    const perfect = firstTry === cards.length;
    const [saved, setSaved] = useState(false);
    const [askedToSignIn, setAskedToSignIn] = useState(false);
    const savedOnce = useRef(false);

    // Signed in (or no sign-in on this site): tick what was proved, straight away.
    useEffect(() => {
        if (!trackingAtStart || toSave.length === 0 || savedOnce.current) return;
        savedOnce.current = true;
        saveSqlChecks(topic.id, toSave)
            .then(() => setSaved(true))
            .catch(error => console.error('Could not save the practice ticks:', error));
    }, [trackingAtStart, toSave, topic.id]);

    const signInToSave = () => {
        if (savedOnce.current) return;
        savedOnce.current = true;
        setAskedToSignIn(true);
        // Signed out, this only asks for sign-in; the save itself runs after it (progress.ts).
        void saveSqlChecks(topic.id, toSave);
    };
    // Saved after signing in shows up in the progress itself.
    const nowTicked = toSave.length > 0 && toSave.every(check => progress.checks[topic.id]?.[check] === true);

    return (
        <>
            <Body>
                <Stack alignItems="center" textAlign="center" spacing={1.5} sx={{ pt: { xs: 2, sm: 4 } }}>
                    <EmojiEventsRoundedIcon sx={{ fontSize: 72, color: perfect ? '#ffca28' : accent }} />
                    <Typography id="practice-question" component="h2" sx={{ fontWeight: 800, fontSize: { xs: '1.6rem', sm: '2rem' }, color: '#fff' }}>
                        {perfect ? 'Perfect practice!' : 'Practice done'}
                    </Typography>
                    <Typography color="text.secondary">
                        {firstTry} of {cards.length} right first time · {topic.name}
                    </Typography>
                </Stack>
                <Stack spacing={1} sx={{ mt: 3.5, maxWidth: 460, mx: 'auto' }}>
                    {cards.map(card => {
                        const outcome = outcomes[card.id];
                        const good = outcome?.solved && !outcome.revealed;
                        return (
                            <Stack key={card.id} direction="row" spacing={1.25} alignItems="center" sx={{ px: 1.75, py: 1, borderRadius: 2, bgcolor: 'rgba(255,255,255,0.04)' }}>
                                {good ? <CheckCircleRoundedIcon sx={{ color: CONFIDENT }} /> : <CancelRoundedIcon sx={{ color: WRONG }} />}
                                <Typography sx={{ fontWeight: 700, flex: 1 }}>{sentenceCase(card.kind === 'predict' ? CARD_LABELS.predict : card.label)}</Typography>
                                <Typography variant="body2" color="text.secondary">
                                    {!outcome?.solved ? (outcome?.revealed ? 'answer shown' : 'missed') : outcome.firstTry ? 'first try' : 'after another try'}
                                </Typography>
                            </Stack>
                        );
                    })}
                </Stack>
                <Box sx={{ mt: 3.5, maxWidth: 460, mx: 'auto', p: 2.25, borderRadius: 3, border: `1px solid ${proven.length ? `${CONFIDENT}55` : 'rgba(255,255,255,0.1)'}`, bgcolor: proven.length ? `${CONFIDENT}0f` : 'transparent' }}>
                    {proven.length > 0 ? (
                        <>
                            <Typography sx={{ fontWeight: 800 }}>
                                Proved: {proven.map(check => SQL_CHECK_LABELS[check]).join(', ')}
                            </Typography>
                            <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
                                {toSave.length === 0
                                    ? 'These checks were already ticked.'
                                    : saved || (askedToSignIn && nowTicked)
                                        ? 'Ticked for you, with the XP.'
                                        : trackingAtStart
                                            ? 'Ticking them for you…'
                                            : askedToSignIn
                                                ? `${toSave.length === 1 ? 'It is' : 'They are'} saved as soon as you sign in.`
                                                : `Sign in to tick ${toSave.length === 1 ? 'it' : 'them'} and keep your progress.`}{' '}
                                Explain and Edge cases are yours to tick: do them from memory, with no notes.
                            </Typography>
                            {!trackingAtStart && !askedToSignIn && toSave.length > 0 && (
                                <Button
                                    variant="contained"
                                    startIcon={tracking ? undefined : <GoogleIcon />}
                                    onClick={signInToSave}
                                    sx={{ mt: 1.5, fontWeight: 800, minHeight: TAP }}
                                >
                                    {tracking ? 'Save to my progress' : 'Sign in to save'}
                                </Button>
                            )}
                        </>
                    ) : (
                        <>
                            <Typography sx={{ fontWeight: 800 }}>No checks proved this time</Typography>
                            <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
                                Read the lesson's examples again, then practise once more. Tomorrow is a good time: remembering after a gap is what makes it stick.
                            </Typography>
                        </>
                    )}
                </Box>
            </Body>
            <Footer feedback={null}>
                <Button onClick={onAgain} sx={{ minHeight: 48, fontWeight: 700 }}>
                    Practise again
                </Button>
                <Button variant="contained" onClick={onClose} sx={bigButton}>
                    Done
                </Button>
            </Footer>
        </>
    );
};

// ============ THE SESSION ============

const SqlPracticeSession = ({
    topic,
    cards,
    progress,
    accent,
    onClose,
}: {
    topic: SqlTopic;
    cards: SqlCard[];
    progress: SqlProgress;
    accent: string;
    onClose: () => void;
}) => {
    const theme = useTheme();
    const fullScreen = useMediaQuery(theme.breakpoints.down('sm'));
    const [round, setRound] = useState(0);
    const [index, setIndex] = useState(0);
    const [outcomes, setOutcomes] = useState<Record<string, CardOutcome>>({});
    const card = cards[index];

    // Start loading the SQL engine now, so the first Check is quick.
    useEffect(() => {
        loadSqlEngine().catch(() => undefined);
    }, []);

    const done = (outcome: CardOutcome) => {
        setOutcomes(previous => ({ ...previous, [card.id]: outcome }));
        setIndex(i => i + 1);
    };

    return (
        <Dialog
            open
            onClose={onClose}
            fullScreen={fullScreen}
            fullWidth
            maxWidth="md"
            aria-labelledby="practice-question"
            slotProps={{ paper: { sx: { bgcolor: PANEL, backgroundImage: 'none', height: { sm: 'min(860px, 92vh)' }, display: 'flex', flexDirection: 'column', borderRadius: { sm: 3 } } } }}
        >
            <Stack direction="row" spacing={2} alignItems="center" sx={{ px: { xs: 1, sm: 2 }, py: 1.25, borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
                <IconButton onClick={onClose} aria-label="Close practice">
                    <CloseRoundedIcon />
                </IconButton>
                <LinearProgress
                    variant="determinate"
                    value={(Math.min(index, cards.length) / cards.length) * 100}
                    aria-label={`Card ${Math.min(index + 1, cards.length)} of ${cards.length}`}
                    sx={{ flex: 1, height: 12, borderRadius: 6, bgcolor: 'rgba(255,255,255,0.08)', '& .MuiLinearProgress-bar': { bgcolor: accent, borderRadius: 6 } }}
                />
                <Typography sx={{ fontWeight: 800, color: 'text.secondary', minWidth: 44, textAlign: 'right', pr: 1, fontVariantNumeric: 'tabular-nums' }}>
                    {Math.min(index + 1, cards.length)}/{cards.length}
                </Typography>
            </Stack>
            {card ? (
                card.kind === 'predict' ? (
                    <PredictCardView key={`${round}-${card.id}`} card={card} accent={accent} onDone={done} />
                ) : (
                    <WriteCardView key={`${round}-${card.id}`} card={card} accent={accent} onDone={done} />
                )
            ) : (
                <Summary
                    key={round}
                    topic={topic}
                    cards={cards}
                    outcomes={outcomes}
                    progress={progress}
                    accent={accent}
                    onAgain={() => {
                        setOutcomes({});
                        setIndex(0);
                        setRound(r => r + 1);
                    }}
                    onClose={onClose}
                />
            )}
        </Dialog>
    );
};

export default SqlPracticeSession;
