// Fill the gap: a sentence from the lesson with one word missing.
//
// Typing: each letter is checked the moment it is typed; a wrong one shakes and
// isn't kept. Backspace takes letters off again. Spaces and hyphens are already
// there, and capitals don't matter. A hidden text box holds the letters typed
// so far, so deleting works on every keyboard, and a phone shows its keyboard.
//
// For anyone who finds typing hard: "Choose the word" shows it among three
// other words from the lesson, to tap instead. The choice is remembered.

import { useEffect, useRef, useState } from 'react';
import { Box, Button, ButtonBase, Stack, Typography } from '@mui/material';
import KeyboardRoundedIcon from '@mui/icons-material/KeyboardRounded';
import TouchAppRoundedIcon from '@mui/icons-material/TouchAppRounded';
import type { BlankCard } from '../../../practice/cards';
import { cardLine } from '../../../practice/lines';
import { nextSlot, sameLetter, slotsFor } from '../../../practice/typing';
import { ProseText } from '../../learning/GlossaryText';
import { Body, CardHeader, Footer } from '../parts';
import { RIGHT, WRONG, bigButton, choiceSx, moodFor, praiseFor, shakeSx, type CardProps, type Feedback } from '../style';
import { playSlip } from '../sound';

/** Wrong letters allowed before the card no longer counts as right first time. */
const SLIPS = 2;
const CHOOSE_KEY = 'aep:v1:choose-words';

const readChoose = () => {
    try {
        return localStorage.getItem(CHOOSE_KEY) === '1';
    } catch {
        return false;
    }
};

const writeChoose = (on: boolean) => {
    try {
        if (on) localStorage.setItem(CHOOSE_KEY, '1');
        else localStorage.removeItem(CHOOSE_KEY);
    } catch {
        // Remembered for this card only.
    }
};

const isLetter = (ch: string) => /[\p{L}\p{N}]/u.test(ch);

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
    /** The last wrong letter, shown in red until the next key, and a counter that restarts the shake. */
    const [miss, setMiss] = useState<{ letter: string; n: number } | null>(null);
    const [choosing, setChoosing] = useState(readChoose);
    const [picked, setPicked] = useState<string | null>(null);
    const input = useRef<HTMLInputElement>(null);

    const done = at >= slots.length;
    const pickedWrong = picked !== null && picked !== card.answer;
    const firstTry = done && !gaveUp && !pickedWrong && hints === 0 && wrong <= SLIPS;
    /** The letters typed so far, as the box holds them. */
    const typed = slots.slice(0, at).filter(slot => !slot.given).map(slot => slot.char).join('');

    useEffect(() => {
        // Desktop: type straight away. (A phone opens its keyboard on the first tap.)
        if (!choosing && window.matchMedia?.('(hover: hover)').matches) input.current?.focus();
    }, [choosing]);

    /** The box changed: letters were added (check each) or taken off (step back). */
    const change = (value: string) => {
        if (done) return;
        if (value.length < typed.length) {
            let back = typed.length - value.length;
            let i = at;
            while (back > 0 && i > 0) {
                i--;
                if (!slots[i].given) back--;
            }
            setAt(i);
            setMiss(null);
            return;
        }
        let position = at;
        let missed: string | null = null;
        for (const ch of value.slice(typed.length)) {
            if (!isLetter(ch) || position >= slots.length) continue;
            if (sameLetter(ch, slots[position].char)) {
                position = nextSlot(slots, position + 1);
            } else {
                missed = ch;
                break;
            }
        }
        if (position !== at) setAt(position);
        if (missed) {
            const letter = missed;
            playSlip();
            setWrong(n => n + 1);
            setMiss(m => ({ letter, n: (m?.n ?? 0) + 1 }));
        } else {
            setMiss(null);
        }
    };

    const hint = () => {
        setHints(n => n + 1);
        setAt(nextSlot(slots, at + 1));
        setMiss(null);
        input.current?.focus();
    };

    const pick = (word: string) => {
        setPicked(word);
        setAt(slots.length);
    };

    const switchMode = (on: boolean) => {
        setChoosing(on);
        writeChoose(on);
        setMiss(null);
    };

    const feedback: Feedback = done
        ? firstTry
            ? { tone: 'right', title: praiseFor(card.id), detail: wrong > 0 ? `“${card.answer}”, with ${wrong} small slip${wrong === 1 ? '' : 's'}.` : `“${card.answer}”.` }
            : { tone: 'wrong', title: gaveUp || pickedWrong ? `The word is “${card.answer}”` : `“${card.answer}”: you got there`, detail: 'It comes back at the end, so it sticks.' }
        : null;

    return (
        <>
            <Body>
                <CardHeader title="Fill the gap" accent={accent} mood={done ? moodFor(feedback) : miss ? 'sad' : 'think'} speak={cardLine(card, { choosing })}>
                    {cardLine(card, { choosing })}
                </CardHeader>
                <Box
                    onClick={() => !choosing && input.current?.focus()}
                    sx={{ p: { xs: 2, sm: 2.5 }, borderRadius: 3, border: '1px solid rgba(255,255,255,0.12)', bgcolor: 'rgba(255,255,255,0.03)', cursor: choosing ? 'default' : 'text' }}
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
                                        const colour = pickedWrong ? WRONG : RIGHT;
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
                                                    borderColor: filled ? colour : current ? (miss ? WRONG : accent) : 'rgba(255,255,255,0.25)',
                                                    bgcolor: filled ? `${colour}1f` : current ? `${miss ? WRONG : accent}1f` : 'rgba(255,255,255,0.04)',
                                                    color: filled ? colour : WRONG,
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
                    {!choosing && (
                        <input
                            ref={input}
                            value={typed}
                            onChange={event => change(event.target.value)}
                            onKeyDown={event => {
                                // A red letter is showing: Backspace clears just that.
                                if (event.key === 'Backspace' && miss) {
                                    event.preventDefault();
                                    setMiss(null);
                                }
                            }}
                            aria-label="Type the missing word"
                            autoCapitalize="off"
                            autoCorrect="off"
                            autoComplete="off"
                            spellCheck={false}
                            disabled={done}
                            // 16px, so iPhones don't zoom the page when it gets focus.
                            style={{ position: 'absolute', opacity: 0, width: 1, height: 1, pointerEvents: 'none', fontSize: 16 }}
                        />
                    )}
                </Box>
                <Typography color="text.secondary" sx={{ mt: 2, lineHeight: 1.55 }}>
                    <Box component="span" sx={{ fontWeight: 800, color: '#ffca28' }}>Clue: </Box>
                    {card.clue}
                </Typography>
                {choosing && (
                    <Box role="radiogroup" aria-label="Words to choose from" sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr 1fr', sm: 'repeat(4, 1fr)' }, gap: 1.25, mt: 2.5 }}>
                        {card.choices.map(word => {
                            const isAnswer = done && word === card.answer;
                            const isWrongPick = picked === word && word !== card.answer;
                            return (
                                <ButtonBase
                                    key={word}
                                    role="radio"
                                    aria-checked={picked === word}
                                    disabled={done}
                                    onClick={() => pick(word)}
                                    sx={{ ...choiceSx(isAnswer ? RIGHT : isWrongPick ? WRONG : undefined, done && !isAnswer && !isWrongPick), justifyContent: 'center', textAlign: 'center', fontWeight: 800 }}
                                >
                                    {word}
                                </ButtonBase>
                            );
                        })}
                    </Box>
                )}
                {!done && (
                    <Stack direction="row" alignItems="center" spacing={1} flexWrap="wrap" useFlexGap sx={{ mt: 1.5 }}>
                        {!choosing && (
                            <Typography variant="body2" color="text.secondary">
                                {wrong > 0 ? `${wrong} wrong letter${wrong === 1 ? '' : 's'}. ` : ''}Backspace takes a letter off.
                            </Typography>
                        )}
                        <Button
                            size="small"
                            startIcon={choosing ? <KeyboardRoundedIcon /> : <TouchAppRoundedIcon />}
                            onClick={() => switchMode(!choosing)}
                            sx={{ textTransform: 'none', fontWeight: 700, minHeight: 36 }}
                        >
                            {choosing ? 'Type it instead' : 'Hard to type? Choose the word'}
                        </Button>
                    </Stack>
                )}
            </Body>
            <Footer feedback={feedback}>
                {done ? (
                    <Button variant="contained" color={firstTry ? 'success' : 'primary'} onClick={() => onDone({ firstTry, solved: !gaveUp && !pickedWrong, revealed: gaveUp })} sx={bigButton} autoFocus disableFocusRipple>
                        Continue
                    </Button>
                ) : choosing ? null : (
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
