// Fill the gap, letter by letter: a sentence from the lesson with one word
// missing. Each letter is checked the moment it is typed; a wrong one shakes
// and isn't kept. Spaces and hyphens are already there, and capitals don't
// matter. A hidden text box takes the typing, so a phone shows its keyboard.

import { useEffect, useRef, useState } from 'react';
import { Box, Button, Stack, Typography } from '@mui/material';
import type { BlankCard } from '../../../practice/cards';
import { nextSlot, sameLetter, slotsFor } from '../../../practice/typing';
import { ProseText } from '../../learning/GlossaryText';
import { Body, CardHeader, Footer } from '../parts';
import { RIGHT, WRONG, bigButton, moodFor, praiseFor, shakeSx, type CardProps, type Feedback } from '../style';

/** Wrong letters allowed before the card no longer counts as right first time. */
const SLIPS = 2;

export const BlankCardView = ({ card, accent, onDone }: CardProps<BlankCard>) => {
    const slots = slotsFor(card.answer);
    /** Slot indexes grouped into words (split at spaces), so a word never breaks across lines. */
    const words = slots.reduce<number[][]>((groups, slot, i) => {
        if (slot.char === ' ') groups.push([]);
        else groups[groups.length - 1].push(i);
        return groups;
    }, [[]]).filter(word => word.length > 0);
    const [at, setAt] = useState(() => nextSlot(slots, 0));
    const [wrong, setWrong] = useState(0);
    const [hints, setHints] = useState(0);
    const [gaveUp, setGaveUp] = useState(false);
    /** The last wrong letter, shown in red for a moment, and a counter that restarts the shake. */
    const [miss, setMiss] = useState<{ letter: string; n: number } | null>(null);
    const input = useRef<HTMLInputElement>(null);
    const done = at >= slots.length;
    const firstTry = done && !gaveUp && hints === 0 && wrong <= SLIPS;

    useEffect(() => {
        // Desktop: type straight away. (A phone opens its keyboard on the first tap.)
        if (window.matchMedia?.('(hover: hover)').matches) input.current?.focus();
    }, []);

    const type = (letter: string) => {
        if (done || !letter.trim()) return;
        if (sameLetter(letter, slots[at].char)) {
            setAt(nextSlot(slots, at + 1));
            setMiss(null);
        } else {
            setWrong(n => n + 1);
            setMiss(m => ({ letter, n: (m?.n ?? 0) + 1 }));
        }
    };

    const hint = () => {
        setHints(n => n + 1);
        setAt(nextSlot(slots, at + 1));
        setMiss(null);
        input.current?.focus();
    };

    const feedback: Feedback = done
        ? firstTry
            ? { tone: 'right', title: praiseFor(card.id), detail: wrong > 0 ? `“${card.answer}”, with ${wrong} small slip${wrong === 1 ? '' : 's'}.` : `“${card.answer}”.` }
            : { tone: 'wrong', title: gaveUp ? `The word is “${card.answer}”` : `“${card.answer}”: you got there`, detail: 'It comes back at the end, so it sticks.' }
        : null;

    return (
        <>
            <Body>
                <CardHeader title="Fill the gap" accent={accent} mood={done ? moodFor(feedback) : miss ? 'sad' : 'think'}>
                    Type the missing word, letter by letter.
                </CardHeader>
                <Box
                    onClick={() => input.current?.focus()}
                    sx={{ p: { xs: 2, sm: 2.5 }, borderRadius: 3, border: '1px solid rgba(255,255,255,0.12)', bgcolor: 'rgba(255,255,255,0.03)', cursor: 'text' }}
                >
                    <Typography component="div" sx={{ fontSize: { xs: '1.1rem', sm: '1.2rem' }, lineHeight: 2.1 }}>
                        <ProseText value={card.before} />
                        <Box
                            key={miss?.n ?? 0}
                            component="span"
                            aria-label={done ? card.answer : `${slots.length} letter gap, ${slots.slice(0, at).map(s => s.char).join('')} typed so far`}
                            sx={{ display: 'inline-flex', flexWrap: 'wrap', columnGap: '12px', rowGap: '6px', verticalAlign: 'middle', mx: 0.5, ...(miss ? shakeSx : {}) }}
                        >
                            {words.map(word => (
                                // Each word's slots stay together on one line; the gap wraps only between words.
                                <Box key={word[0]} component="span" sx={{ display: 'inline-flex', gap: '3px', whiteSpace: 'nowrap' }}>
                                    {word.map(i => {
                                        const slot = slots[i];
                                        const filled = i < at;
                                        const current = i === at && !done;
                                        if (slot.given) return <Box key={i} component="span" sx={{ width: 12, textAlign: 'center', fontWeight: 800 }}>{slot.char}</Box>;
                                        return (
                                            <Box
                                                key={i}
                                                component="span"
                                                sx={{
                                                    width: { xs: 22, sm: 26 },
                                                    height: { xs: 32, sm: 36 },
                                                    display: 'inline-flex',
                                                    alignItems: 'center',
                                                    justifyContent: 'center',
                                                    fontWeight: 800,
                                                    fontFamily: 'ui-monospace, SFMono-Regular, Menlo, Consolas, monospace',
                                                    fontSize: { xs: '1rem', sm: '1.1rem' },
                                                    borderRadius: 1.5,
                                                    borderBottom: '3px solid',
                                                    borderColor: filled ? RIGHT : current ? (miss ? WRONG : accent) : 'rgba(255,255,255,0.25)',
                                                    bgcolor: filled ? `${RIGHT}1f` : current ? `${miss ? WRONG : accent}1f` : 'rgba(255,255,255,0.04)',
                                                    color: filled ? RIGHT : WRONG,
                                                    lineHeight: 1,
                                                }}
                                            >
                                                {filled ? slot.char : current && miss ? miss.letter : ''}
                                            </Box>
                                        );
                                    })}
                                </Box>
                            ))}
                        </Box>
                        <ProseText value={card.after} />
                    </Typography>
                    <input
                        ref={input}
                        value=""
                        onChange={event => type(event.target.value.slice(-1))}
                        aria-label="Type the missing word"
                        autoCapitalize="off"
                        autoCorrect="off"
                        autoComplete="off"
                        spellCheck={false}
                        disabled={done}
                        // 16px, so iPhones don't zoom the page when it gets focus.
                        style={{ position: 'absolute', opacity: 0, width: 1, height: 1, pointerEvents: 'none', fontSize: 16 }}
                    />
                </Box>
                <Typography color="text.secondary" sx={{ mt: 2, lineHeight: 1.55 }}>
                    <Box component="span" sx={{ fontWeight: 800, color: '#ffca28' }}>Clue: </Box>
                    {card.clue}
                </Typography>
                {!done && (
                    <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
                        {wrong > 0 ? `${wrong} wrong letter${wrong === 1 ? '' : 's'}. ` : ''}Tap the sentence if your keyboard is hidden.
                    </Typography>
                )}
            </Body>
            <Footer feedback={feedback}>
                {done ? (
                    <Button variant="contained" color={firstTry ? 'success' : 'primary'} onClick={() => onDone({ firstTry, solved: !gaveUp, revealed: gaveUp })} sx={bigButton} autoFocus disableFocusRipple>
                        Continue
                    </Button>
                ) : (
                    <Stack direction="row" spacing={1}>
                        {wrong > SLIPS && (
                            <Button
                                onClick={() => {
                                    setGaveUp(true);
                                    setAt(slots.length);
                                }}
                                sx={{ minHeight: 48, fontWeight: 700, color: 'text.secondary' }}
                            >
                                Show the word
                            </Button>
                        )}
                        <Button variant="outlined" onClick={hint} sx={{ ...bigButton, px: 2.5 }}>
                            Show a letter
                        </Button>
                    </Stack>
                )}
            </Footer>
        </>
    );
};
