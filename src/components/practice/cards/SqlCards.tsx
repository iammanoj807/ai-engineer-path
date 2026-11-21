// SQL cards: predict how many rows a query returns; write a query, which runs
// on the practice database and is checked against the answer's rows; and fix
// a query that has one small bug in it.

import { useEffect, useState } from 'react';
import { Alert, Box, Button, ButtonBase, CircularProgress, Collapse, TextField, Typography } from '@mui/material';
import TableChartRoundedIcon from '@mui/icons-material/TableChartRounded';
import type { FixCard, PredictCard, WriteCard } from '../../../practice/cards';
import { cardLine } from '../../../practice/lines';
import { compareResults, type RowOrder, type Verdict } from '../../../practice/sql';
import type { SqlResultTable } from '../../../data/sql';
import { loadSqlEngine } from '../../../utils/sqlEngine';
import { runOnPracticeDb } from '../../../utils/sqlRunner';
import { CodeBlock } from '../../learning/LearningParts';
import { ProseText } from '../../learning/GlossaryText';
import { MONO, QueryError, ResultTable, TableColumns } from '../../sql/SqlParts';
import { Body, CardHeader, Footer } from '../parts';
import { RIGHT, WRONG, bigButton, moodFor, praiseFor, type CardProps, type Feedback } from '../style';

const Label = ({ children, colour = 'text.secondary' }: { children: React.ReactNode; colour?: string }) => (
    <Typography variant="caption" sx={{ display: 'block', fontWeight: 800, letterSpacing: 1, color: colour, mb: 1 }}>
        {children}
    </Typography>
);

// ============ PREDICT THE ROWS ============

export const PredictCardView = ({ card, accent, onDone }: CardProps<PredictCard>) => {
    const [chosen, setChosen] = useState<number | null>(null);
    const [checked, setChecked] = useState(false);
    const rows = card.result.rows.length;
    const right = chosen === rows;
    const done = () => onDone({ firstTry: right, solved: right, revealed: false });

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

    const feedback: Feedback = checked
        ? right
            ? { tone: 'right', title: praiseFor(card.id) }
            : { tone: 'wrong', title: `Not quite: it returns ${rows} ${rows === 1 ? 'row' : 'rows'}`, detail: 'Look at the rows above and find the ones you missed or added.' }
        : null;

    return (
        <>
            <Body>
                <CardHeader title="Predict the rows" accent={accent} mood={moodFor(feedback)} speak={cardLine(card)}>
                    How many rows does this query return?
                </CardHeader>
                <CodeBlock code={card.sql} language="sql" />
                <Box role="radiogroup" aria-label="Number of rows" sx={{ display: 'grid', gridTemplateColumns: { xs: 'repeat(2, 1fr)', sm: 'repeat(4, 1fr)' }, gap: 1.5, mt: 2.5 }}>
                    {card.options.map((option, i) => {
                        const isChosen = chosen === option;
                        const isAnswer = checked && option === rows;
                        const isWrongPick = checked && isChosen && option !== rows;
                        const colour = isAnswer ? RIGHT : isWrongPick ? WRONG : isChosen ? accent : undefined;
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
                        <Label>WHAT IT RETURNS</Label>
                        <ResultTable result={card.result} />
                    </Box>
                )}
            </Body>
            <Footer feedback={feedback}>
                {checked ? (
                    <Button variant="contained" onClick={done} sx={bigButton} color={right ? 'success' : 'primary'}>
                        Continue
                    </Button>
                ) : (
                    <Button variant="contained" onClick={() => setChecked(true)} disabled={chosen === null} sx={bigButton}>
                        Check
                    </Button>
                )}
            </Footer>
        </>
    );
};

// ============ WRITE AND FIX ============

type Ran = { result: SqlResultTable } | { error: string };

/** The editor, the run-and-compare check, and showing one good answer: shared by Write and Fix. */
const QueryCard = ({
    id,
    title,
    prompt,
    speak,
    start,
    answerSql,
    expected,
    order,
    hint,
    accent,
    onDone,
}: {
    id: string;
    title: string;
    prompt: React.ReactNode;
    /** The prompt's words, for the guide to say. */
    speak: string;
    start: string;
    answerSql: string;
    expected: SqlResultTable;
    order: RowOrder;
    hint?: string;
    accent: string;
    onDone: CardProps<unknown>['onDone'];
}) => {
    const [sql, setSql] = useState(start);
    const [running, setRunning] = useState(false);
    const [ran, setRan] = useState<Ran | null>(null);
    const [verdict, setVerdict] = useState<Verdict | null>(null);
    const [engineError, setEngineError] = useState<string | null>(null);
    const [revealed, setRevealed] = useState(false);
    const [showTables, setShowTables] = useState(false);
    const [showHint, setShowHint] = useState(false);
    const [tries, setTries] = useState(0);
    /** The try that first got it right. */
    const [solvedOnTry, setSolvedOnTry] = useState<number | null>(null);
    const solved = verdict?.ok === true;
    const outcome = () => ({ firstTry: solvedOnTry === 1, solved: solvedOnTry !== null, revealed });

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
                const next = compareResults(result, expected, order);
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
        ? { tone: 'right', title: praiseFor(id), detail: verdict.note ?? 'Your query returns the same rows as the answer.' }
        : verdict && !verdict.ok
            ? { tone: 'wrong', title: 'Not yet', detail: verdict.message }
            : revealed
                ? { tone: 'shown', title: 'Here is one good answer', detail: 'Type it yourself and run it, so your hands learn it too.' }
                : null;

    return (
        <>
            <Body>
                <CardHeader title={title} accent={accent} mood={moodFor(feedback)} speak={speak}>
                    {prompt}
                </CardHeader>
                <Typography variant="body2" sx={{ color: 'text.secondary', mb: 1 }}>
                    Return {expected.columns.length === 1 ? '1 column' : `${expected.columns.length} columns`}:{' '}
                    <Box component="span" sx={{ fontFamily: MONO, color: 'text.primary' }}>{expected.columns.join(', ')}</Box>{' '}
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
                            // At least 16px, so iPhones don't zoom the page when typing.
                            style: { fontFamily: MONO, fontSize: '1rem', lineHeight: 1.55 },
                        },
                    }}
                    sx={{ '& .MuiInputBase-root': { bgcolor: '#000' } }}
                />
                <Typography variant="caption" sx={{ display: 'block', color: 'text.secondary', mt: 0.75 }}>
                    It runs on the practice database. Ctrl or ⌘ + Enter checks it.
                </Typography>
                {hint && !solved && (
                    showHint ? (
                        <Alert severity="info" sx={{ mt: 2 }}>{hint}</Alert>
                    ) : (
                        <Button size="small" onClick={() => setShowHint(true)} sx={{ mt: 1, textTransform: 'none', fontWeight: 700 }}>
                            Show a hint
                        </Button>
                    )
                )}
                {engineError && <Alert severity="warning" sx={{ mt: 2 }}>{engineError}</Alert>}
                {ran && (
                    <Box sx={{ mt: 2.5 }}>
                        <Label>YOUR RESULT</Label>
                        {'error' in ran ? <QueryError message={ran.error} /> : <ResultTable result={ran.result} />}
                    </Box>
                )}
                {revealed && (
                    <Box sx={{ mt: 3 }}>
                        <Label colour={accent}>ONE GOOD ANSWER</Label>
                        <CodeBlock code={answerSql} language="sql" />
                        <Box sx={{ mt: 1.5 }}>
                            <ResultTable result={expected} />
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

export const WriteCardView = ({ card, accent, onDone }: CardProps<WriteCard>) => (
    <QueryCard
        id={card.id}
        title={card.label.charAt(0) + card.label.slice(1).toLowerCase()}
        prompt={<ProseText value={card.prompt} />}
        speak={cardLine(card)}
        start=""
        answerSql={card.answerSql}
        expected={card.expected}
        order={card.order}
        accent={accent}
        onDone={onDone}
    />
);

export const FixCardView = ({ card, accent, onDone }: CardProps<FixCard>) => (
    <QueryCard
        id={card.id}
        title="Fix the query"
        prompt={
            <>
                This query has one small bug. Fix it so it does this: <Box component="span" sx={{ fontWeight: 400 }}><ProseText value={card.prompt} /></Box>
            </>
        }
        speak={cardLine(card)}
        start={card.brokenSql}
        answerSql={card.answerSql}
        expected={card.expected}
        order={card.order}
        hint={card.hint}
        accent={accent}
        onDone={onDone}
    />
);
