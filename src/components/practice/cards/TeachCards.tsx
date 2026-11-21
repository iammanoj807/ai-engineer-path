// Teaching cards: a guess first (from the path), then the idea in one line with
// its picture and an everyday comparison, then the new words it uses. The guess
// is only a guess: no hearts, no score. Wrong or right, it makes the answer
// stick when the lesson shows it (the pretesting effect).

import { useEffect, useRef, useState } from 'react';
import { Box, Button, ButtonBase, Stack, Typography } from '@mui/material';
import type { GuessCard, IdeaCard, ReadCard, WordsCard } from '../../../practice/cards';
import { LessonPartBody } from '../LessonPart';
import { cardLine } from '../../../practice/lines';
import { ANIMATIONS } from '../../../practice/load';
import { AnimatedScene } from '../../learning/anim/AnimatedScene';
import { useTopicAnimation } from '../../learning/anim/useTopicAnimation';
import { ProseText } from '../../learning/GlossaryText';
import { usePractice } from '../context';
import { Body, CardHeader, Footer } from '../parts';
import { RIGHT, bigButton, choiceSx, type CardProps, type Feedback } from '../style';
import { playPop } from '../sound';

/** A guess that was off: amber, not red. It's a guess, not a mistake. */
const GUESSED_OFF = '#ffb74d';

const DONE = { firstTry: true, solved: true, revealed: false };

const Section = ({ label, accent, children }: { label: string; accent: string; children: React.ReactNode }) => (
    <Box sx={{ p: { xs: 2, sm: 2.5 }, borderRadius: 3, bgcolor: `${accent}12`, borderLeft: `3px solid ${accent}` }}>
        <Typography variant="caption" sx={{ display: 'block', fontWeight: 800, letterSpacing: 1, color: accent, mb: 0.75 }}>
            {label}
        </Typography>
        <Typography sx={{ fontSize: { xs: '1.02rem', sm: '1.1rem' }, lineHeight: 1.6 }}>{children}</Typography>
    </Box>
);

export const GuessCardView = ({ card, accent, onDone }: CardProps<GuessCard>) => {
    const { prose } = usePractice();
    const [answers, setAnswers] = useState<(boolean | null)[]>(() => card.statements.map(() => null));
    const done = answers.every(answer => answer !== null);
    const allRight = answers.every((answer, i) => answer === card.statements[i].isTrue);
    const feedback: Feedback = !done
        ? null
        : allRight
          ? { tone: 'right', title: 'Great guesses!', detail: "Now let's see why." }
          : { tone: 'shown', title: 'Good try: keep these in mind', detail: 'The lesson shows why. Guessing first helps it stick.' };
    const guess = (i: number, value: boolean) => {
        playPop();
        setAnswers(previous => previous.map((answer, j) => (j === i ? value : answer)));
    };
    return (
        <>
            <Body>
                <CardHeader title="Take a guess" accent={accent} mood={done ? 'happy' : 'think'} speak={cardLine(card)}>
                    {cardLine(card)}
                </CardHeader>
                <Typography color="text.secondary" sx={{ mb: 2 }}>
                    No hearts to lose: a guess is just a guess.
                </Typography>
                <Stack spacing={2}>
                    {card.statements.map((statement, i) => {
                        const answer = answers[i];
                        const shown = answer !== null;
                        return (
                            <Box key={statement.text} sx={{ p: { xs: 2, sm: 2.25 }, borderRadius: 3, border: '1px solid rgba(255,255,255,0.12)', bgcolor: 'rgba(255,255,255,0.03)' }}>
                                <Typography sx={{ fontSize: { xs: '1.02rem', sm: '1.08rem' }, lineHeight: 1.55, mb: 1.5 }}>
                                    <ProseText value={prose(statement.text)} />
                                </Typography>
                                <Stack direction="row" spacing={1.25} role="radiogroup" aria-label="True or false">
                                    {[true, false].map(value => {
                                        const isAnswer = shown && value === statement.isTrue;
                                        const pickedOff = shown && answer === value && !isAnswer;
                                        return (
                                            <ButtonBase
                                                key={String(value)}
                                                role="radio"
                                                aria-checked={answer === value}
                                                disabled={shown}
                                                onClick={() => guess(i, value)}
                                                sx={{ ...choiceSx(isAnswer ? RIGHT : pickedOff ? GUESSED_OFF : undefined, shown && !isAnswer && !pickedOff), justifyContent: 'center', fontWeight: 800 }}
                                            >
                                                {value ? 'True' : 'False'}
                                            </ButtonBase>
                                        );
                                    })}
                                </Stack>
                                {shown && (
                                    <Typography sx={{ mt: 1.25, fontWeight: 700, color: statement.isTrue ? RIGHT : GUESSED_OFF }}>
                                        {statement.isTrue ? "True. You'll see why in a moment." : "False: it's a common mistake. The lesson shows why."}
                                    </Typography>
                                )}
                            </Box>
                        );
                    })}
                </Stack>
            </Body>
            <Footer feedback={feedback}>
                {done ? (
                    <Button variant="contained" onClick={() => onDone(DONE)} sx={bigButton} autoFocus disableFocusRipple>
                        Let&apos;s learn
                    </Button>
                ) : null}
            </Footer>
        </>
    );
};

/**
 * One part of the lesson, in "Learn it step by step". The steps of "how it
 * works" come one at a time (Next step), so each is read before the next.
 */
export const ReadCardView = ({ card, accent, onDone }: CardProps<ReadCard>) => {
    const { prose } = usePractice();
    const { part } = card;
    const steps = part.slot === 'steps' ? (part.items?.length ?? 0) : 0;
    const [shown, setShown] = useState(1);
    const end = useRef<HTMLDivElement>(null);
    const allShown = steps <= 1 || shown >= steps;
    // Each new step slides in at the bottom: keep it in view.
    useEffect(() => {
        if (shown > 1) end.current?.scrollIntoView({ behavior: 'smooth', block: 'end' });
    }, [shown]);
    return (
        <>
            <Body>
                <CardHeader title={part.title} accent={accent} mood="happy" speak={cardLine(card)}>
                    {cardLine(card)}
                </CardHeader>
                <LessonPartBody part={part} prose={prose} accent={accent} shown={steps > 1 ? shown : undefined} />
                <Box ref={end} />
            </Body>
            <Footer feedback={null}>
                {allShown ? (
                    <Button variant="contained" onClick={() => onDone(DONE)} sx={bigButton} autoFocus disableFocusRipple>
                        Continue
                    </Button>
                ) : (
                    <Button variant="contained" onClick={() => setShown(n => n + 1)} sx={bigButton} autoFocus disableFocusRipple>
                        Next step · {shown + 1} of {steps}
                    </Button>
                )}
            </Footer>
        </>
    );
};

export const IdeaCardView = ({ card, accent, onDone }: CardProps<IdeaCard>) => {
    const { course, topicId, prose } = usePractice();
    const animation = useTopicAnimation(ANIMATIONS[course], topicId);
    return (
        <>
            <Body>
                <CardHeader title="New idea" accent={accent} mood="happy" speak={cardLine(card)}>
                    Let's learn something new: <Box component="span" sx={{ color: accent }}>{card.title}</Box>
                </CardHeader>
                <Stack spacing={2}>
                    <Section label="IN ONE LINE" accent={accent}>
                        <ProseText value={prose(card.definition)} />
                    </Section>
                    {animation && <AnimatedScene spec={animation} accent={accent} />}
                    {card.analogy && (
                        <Section label="THINK OF IT LIKE THIS" accent="#ffca28">
                            <ProseText value={prose(card.analogy)} />
                        </Section>
                    )}
                </Stack>
            </Body>
            <Footer feedback={null}>
                <Button variant="contained" onClick={() => onDone(DONE)} sx={bigButton} autoFocus disableFocusRipple>
                    Got it
                </Button>
            </Footer>
        </>
    );
};

export const WordsCardView = ({ card, accent, onDone }: CardProps<WordsCard>) => {
    const { prose } = usePractice();
    return (
        <>
            <Body>
                <CardHeader title="New words" accent={accent} mood="happy" speak={cardLine(card)}>
                    {cardLine(card)}
                </CardHeader>
                <Stack spacing={1.5}>
                    {card.words.map(word => (
                        <Box key={word.term} sx={{ p: { xs: 1.75, sm: 2 }, borderRadius: 3, border: '1px solid rgba(255,255,255,0.1)', bgcolor: 'rgba(255,255,255,0.03)' }}>
                            <Typography sx={{ fontWeight: 800, color: '#fff', fontSize: '1.1rem', mb: 0.25 }}>{word.term}</Typography>
                            <Typography color="text.secondary" sx={{ lineHeight: 1.55 }}>
                                <ProseText value={prose(word.meaning)} />
                            </Typography>
                        </Box>
                    ))}
                </Stack>
            </Body>
            <Footer feedback={null}>
                <Button variant="contained" onClick={() => onDone(DONE)} sx={bigButton} autoFocus disableFocusRipple>
                    Continue
                </Button>
            </Footer>
        </>
    );
};
