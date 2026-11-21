// Cards answered by tapping: match the pairs, spot the mistake, put the steps
// in order, and remember it (honest self-check for a free-text answer).

import { useState } from 'react';
import { Box, Button, ButtonBase, Stack, Typography } from '@mui/material';
import { cardTitle, type MatchCard, type MistakeCard, type OrderCard, type RecallCard } from '../../../practice/cards';
import { cardLine } from '../../../practice/lines';
import { ProseText } from '../../learning/GlossaryText';
import { usePractice } from '../context';
import { Body, CardHeader, Footer } from '../parts';
import { RIGHT, WRONG, bigButton, choiceSx, moodFor, praiseFor, shakeSx, type CardProps, type Feedback } from '../style';
import { playPop, playWrong } from '../sound';

// ============ MATCH THE PAIRS ============

export const MatchCardView = ({ card, accent, onDone }: CardProps<MatchCard>) => {
    const [term, setTerm] = useState<string | null>(null);
    const [meaning, setMeaning] = useState<string | null>(null);
    const [matched, setMatched] = useState<string[]>([]);
    const [wrong, setWrong] = useState<{ term: string; meaning: string; at: number } | null>(null);
    const [misses, setMisses] = useState(0);
    const byKey = new Map(card.pairs.map(pair => [pair.key, pair]));
    const done = matched.length === card.pairs.length;

    const tryPair = (nextTerm: string | null, nextMeaning: string | null) => {
        setTerm(nextTerm);
        setMeaning(nextMeaning);
        if (!nextTerm || !nextMeaning) return;
        if (nextTerm === nextMeaning) {
            setMatched(m => [...m, nextTerm]);
            // The last pair gets the "right" chime from the footer instead.
            if (matched.length + 1 < card.pairs.length) playPop();
        } else {
            playWrong();
            setMisses(misses + 1);
            // `at` changes with every miss, so the shake plays again even on the same pair.
            setWrong({ term: nextTerm, meaning: nextMeaning, at: misses + 1 });
        }
        setTerm(null);
        setMeaning(null);
    };

    const feedback: Feedback = done
        ? misses === 0
            ? { tone: 'right', title: praiseFor(card.id), detail: 'Every pair matched first time.' }
            : { tone: 'wrong', title: 'All matched', detail: `${misses} wrong ${misses === 1 ? 'try' : 'tries'}: these words come back at the end, so they stick.` }
        : null;

    const colourOf = (key: string, chosen: boolean, isWrong: boolean) => (matched.includes(key) ? RIGHT : isWrong ? WRONG : chosen ? accent : undefined);

    return (
        <>
            <Body>
                <CardHeader title="Match the pairs" accent={accent} mood={done ? moodFor(feedback) : 'think'} speak={cardLine(card)}>
                    Tap a word, then tap what it means.
                </CardHeader>
                <Stack direction="row" flexWrap="wrap" useFlexGap spacing={1} sx={{ mb: 2.5 }} role="group" aria-label="Words">
                    {card.termOrder.map(key => {
                        const isWrong = wrong?.term === key;
                        return (
                            <ButtonBase
                                key={`${key}-${isWrong ? wrong?.at : 0}`}
                                onClick={() => tryPair(term === key ? null : key, meaning)}
                                disabled={matched.includes(key)}
                                aria-pressed={term === key}
                                sx={{ ...choiceSx(colourOf(key, term === key, isWrong), matched.includes(key)), width: 'auto', fontWeight: 800, px: 2.25, ...(isWrong ? shakeSx : {}) }}
                            >
                                {byKey.get(key)?.term}
                            </ButtonBase>
                        );
                    })}
                </Stack>
                <Stack spacing={1.25} role="group" aria-label="Meanings">
                    {card.meaningOrder.map(key => {
                        const isWrong = wrong?.meaning === key;
                        return (
                            <ButtonBase
                                key={`${key}-${isWrong ? wrong?.at : 0}`}
                                onClick={() => tryPair(term, meaning === key ? null : key)}
                                disabled={matched.includes(key)}
                                aria-pressed={meaning === key}
                                sx={{ ...choiceSx(colourOf(key, meaning === key, isWrong), matched.includes(key)), ...(isWrong ? shakeSx : {}) }}
                            >
                                {byKey.get(key)?.meaning}
                            </ButtonBase>
                        );
                    })}
                </Stack>
            </Body>
            <Footer feedback={feedback}>
                {done && (
                    <Button variant="contained" color={misses === 0 ? 'success' : 'primary'} onClick={() => onDone({ firstTry: misses === 0, solved: true, revealed: false })} sx={bigButton} autoFocus disableFocusRipple>
                        Continue
                    </Button>
                )}
            </Footer>
        </>
    );
};

// ============ SPOT THE MISTAKE ============

export const MistakeCardView = ({ card, accent, onDone }: CardProps<MistakeCard>) => {
    const { prose } = usePractice();
    const [chosen, setChosen] = useState<number | null>(null);
    const [checked, setChecked] = useState(false);
    const right = chosen !== null && card.options[chosen].mistake;
    const feedback: Feedback = checked
        ? right
            ? { tone: 'right', title: praiseFor(card.id), detail: 'That is a common mistake. The others are true.' }
            : { tone: 'wrong', title: 'Not quite: that one is true', detail: 'The mistake is the one in green.' }
        : null;

    return (
        <>
            <Body>
                <CardHeader title="Spot the mistake" accent={accent} mood={moodFor(feedback)} speak={cardLine(card)}>
                    {cardLine(card)}
                </CardHeader>
                <Stack spacing={1.25} role="radiogroup" aria-label="Statements">
                    {card.options.map((option, i) => {
                        const colour = checked ? (option.mistake ? RIGHT : chosen === i ? WRONG : undefined) : chosen === i ? accent : undefined;
                        return (
                            <ButtonBase key={option.text} role="radio" aria-checked={chosen === i} disabled={checked} onClick={() => setChosen(i)} sx={choiceSx(colour, checked && !option.mistake && chosen !== i)}>
                                <Box component="span">
                                    <ProseText value={prose(option.text)} />
                                </Box>
                            </ButtonBase>
                        );
                    })}
                </Stack>
            </Body>
            <Footer feedback={feedback}>
                {checked ? (
                    <Button variant="contained" color={right ? 'success' : 'primary'} onClick={() => onDone({ firstTry: right, solved: right, revealed: false })} sx={bigButton} autoFocus disableFocusRipple>
                        Continue
                    </Button>
                ) : (
                    <Button variant="contained" disabled={chosen === null} onClick={() => setChecked(true)} sx={bigButton}>
                        Check
                    </Button>
                )}
            </Footer>
        </>
    );
};

// ============ PUT THE STEPS IN ORDER ============

export const OrderCardView = ({ card, accent, onDone }: CardProps<OrderCard>) => {
    /** Indexes into card.steps, in the order the learner put them. */
    const [placed, setPlaced] = useState<number[]>([]);
    const [checked, setChecked] = useState(false);
    const right = placed.every((step, i) => step === i);
    const left = card.shown.filter(step => !placed.includes(step));
    const feedback: Feedback = checked
        ? right
            ? { tone: 'right', title: praiseFor(card.id), detail: 'That is the order they happen in.' }
            : { tone: 'wrong', title: 'Not quite', detail: 'The right order is shown below your answer.' }
        : null;

    return (
        <>
            <Body>
                <CardHeader title="Put the steps in order" accent={accent} mood={moodFor(feedback)} speak={cardLine(card)}>
                    Tap the steps in the order they happen. Tap a placed step to take it back.
                </CardHeader>
                <Stack spacing={1} sx={{ mb: 2.5, minHeight: 60 }} role="list" aria-label="Your order">
                    {placed.length === 0 && (
                        <Box sx={{ p: 2, borderRadius: 3, border: '2px dashed rgba(255,255,255,0.14)', color: 'text.secondary', textAlign: 'center' }}>
                            Your order appears here.
                        </Box>
                    )}
                    {placed.map((step, i) => {
                        const colour = checked ? (step === i ? RIGHT : WRONG) : accent;
                        return (
                            <ButtonBase key={step} role="listitem" disabled={checked} onClick={() => setPlaced(p => p.filter(s => s !== step))} sx={choiceSx(colour)}>
                                <Box component="span" sx={{ fontWeight: 800, color: colour, mr: 1.5, minWidth: 18 }}>{i + 1}</Box>
                                <Box component="span">{card.steps[step]}</Box>
                            </ButtonBase>
                        );
                    })}
                </Stack>
                {!checked && left.length > 0 && (
                    <>
                        <Typography variant="caption" sx={{ display: 'block', fontWeight: 800, letterSpacing: 1, color: 'text.secondary', mb: 1 }}>
                            STEPS TO PLACE
                        </Typography>
                        <Stack spacing={1}>
                            {left.map(step => (
                                <ButtonBase key={step} onClick={() => setPlaced(p => [...p, step])} sx={choiceSx(undefined)}>
                                    {card.steps[step]}
                                </ButtonBase>
                            ))}
                        </Stack>
                    </>
                )}
                {checked && !right && (
                    <Box sx={{ mt: 1 }}>
                        <Typography variant="caption" sx={{ display: 'block', fontWeight: 800, letterSpacing: 1, color: RIGHT, mb: 1 }}>
                            THE RIGHT ORDER
                        </Typography>
                        <Stack component="ol" spacing={0.75} sx={{ m: 0, pl: 3 }}>
                            {card.steps.map(step => (
                                <Typography key={step} component="li" sx={{ lineHeight: 1.5 }}>{step}</Typography>
                            ))}
                        </Stack>
                    </Box>
                )}
            </Body>
            <Footer feedback={feedback}>
                {checked ? (
                    <Button variant="contained" color={right ? 'success' : 'primary'} onClick={() => onDone({ firstTry: right, solved: right, revealed: false })} sx={bigButton} autoFocus disableFocusRipple>
                        Continue
                    </Button>
                ) : (
                    <Button variant="contained" disabled={left.length > 0} onClick={() => setChecked(true)} sx={bigButton}>
                        Check
                    </Button>
                )}
            </Footer>
        </>
    );
};

// ============ REMEMBER IT ============

export const RecallCardView = ({ card, accent, onDone }: CardProps<RecallCard>) => {
    const { prose } = usePractice();
    const [shown, setShown] = useState(false);
    const [knew, setKnew] = useState<boolean | null>(null);
    const feedback: Feedback =
        knew === true ? { tone: 'right', title: 'Great memory!' } : knew === false ? { tone: 'shown', title: 'That is fine', detail: 'Reading the answer now is how it sticks. It will come back another day.' } : null;

    return (
        <>
            <Body>
                <CardHeader title={cardTitle(card)} accent={accent} mood={knew === null ? 'think' : knew ? 'happy' : 'idle'} speak={cardLine(card)}>
                    <ProseText value={prose(card.question)} />
                </CardHeader>
                {!shown ? (
                    <Typography color="text.secondary" sx={{ mb: 2 }}>
                        {card.interview
                            ? 'As if in an interview: say your answer out loud, in your own words, then compare it with a strong answer.'
                            : 'Say your answer out loud or in your head, then look.'}
                    </Typography>
                ) : (
                    <Box sx={{ p: { xs: 2, sm: 2.5 }, borderRadius: 3, bgcolor: `${accent}12`, borderLeft: `3px solid ${accent}` }}>
                        <Typography variant="caption" sx={{ display: 'block', fontWeight: 800, letterSpacing: 1, color: accent, mb: 0.75 }}>
                            {card.interview ? 'A STRONG ANSWER' : 'THE ANSWER'}
                        </Typography>
                        <Typography sx={{ lineHeight: 1.6 }}>
                            <ProseText value={prose(card.answer)} />
                        </Typography>
                    </Box>
                )}
            </Body>
            <Footer feedback={feedback}>
                {!shown && (
                    <Button variant="contained" onClick={() => setShown(true)} sx={bigButton} autoFocus disableFocusRipple>
                        Show answer
                    </Button>
                )}
                {shown && knew === null && (
                    <>
                        <Button variant="outlined" onClick={() => setKnew(false)} sx={{ ...bigButton, px: 2.5 }}>
                            Not yet
                        </Button>
                        <Button variant="contained" color="success" onClick={() => setKnew(true)} sx={{ ...bigButton, px: 2.5 }}>
                            I knew it
                        </Button>
                    </>
                )}
                {knew !== null && (
                    <Button variant="contained" onClick={() => onDone({ firstTry: knew, solved: knew, revealed: false })} sx={bigButton} autoFocus disableFocusRipple>
                        Continue
                    </Button>
                )}
            </Footer>
        </>
    );
};
