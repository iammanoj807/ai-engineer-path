// Teaching cards: the parts of the lesson one at a time, the idea in one line
// with its picture and an everyday comparison, and the new words it uses.
// Nothing here is a question: questions come after the part they check.

import { useEffect, useRef, useState } from 'react';
import { Box, Button, Stack, Typography } from '@mui/material';
import type { IdeaCard, ReadCard, WordsCard } from '../../../practice/cards';
import { LessonPartBody } from '../LessonPart';
import { cardLine } from '../../../practice/lines';
import { ANIMATIONS } from '../../../practice/load';
import { AnimatedScene } from '../../learning/anim/AnimatedScene';
import { useTopicAnimation } from '../../learning/anim/useTopicAnimation';
import { ProseText } from '../../learning/GlossaryText';
import { usePractice } from '../context';
import { Body, CardHeader, Footer } from '../parts';
import { bigButton, type CardProps } from '../style';

const DONE = { firstTry: true, solved: true, revealed: false };

const Section = ({ label, accent, children }: { label: string; accent: string; children: React.ReactNode }) => (
    <Box sx={{ p: { xs: 2, sm: 2.5 }, borderRadius: 3, bgcolor: `${accent}12`, borderLeft: `3px solid ${accent}` }}>
        <Typography variant="caption" sx={{ display: 'block', fontWeight: 800, letterSpacing: 1, color: accent, mb: 0.75 }}>
            {label}
        </Typography>
        <Typography sx={{ fontSize: { xs: '1.02rem', sm: '1.1rem' }, lineHeight: 1.6 }}>{children}</Typography>
    </Box>
);

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
