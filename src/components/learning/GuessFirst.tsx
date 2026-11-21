// "Before you read, take a guess": one or two statements from the lesson to
// mark true or false, at the top of its Step 1. A guess, even a wrong one,
// makes the answer stick when the lesson shows it (the pretesting effect,
// Richland, Kornell and Kao, 2009). No score is kept.

import { useMemo, useState } from 'react';
import { Box, ButtonBase, Stack, Typography } from '@mui/material';
import HelpOutlineRoundedIcon from '@mui/icons-material/HelpOutlineRounded';
import { guessCard, lessonText, type AnyTopic } from '../../practice/build';
import { ProseText } from './GlossaryText';
import type { PageGlossary } from './glossaryContext';

const RIGHT = '#81c784';
const OFF = '#ffb74d';

const GuessFirst = ({ topic, accent, glossary }: { topic: AnyTopic; accent: string; glossary: PageGlossary }) => {
    const statements = useMemo(() => guessCard(lessonText(topic))[0]?.statements ?? [], [topic]);
    const [answers, setAnswers] = useState<Record<number, boolean>>({});
    if (statements.length === 0) return null;
    return (
        <Box sx={{ p: { xs: 2, sm: 2.5 }, borderRadius: 3, border: `1px dashed ${accent}88`, bgcolor: `${accent}0d`, maxWidth: 760 }}>
            <Stack direction="row" spacing={1} alignItems="center" sx={{ mb: 0.5 }}>
                <HelpOutlineRoundedIcon sx={{ color: accent }} />
                <Typography sx={{ fontWeight: 800, color: accent }}>Before you read: take a guess</Typography>
            </Stack>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                True or false? A guess, even a wrong one, helps you remember the answer when you reach it. No score.
            </Typography>
            <Stack spacing={1.75}>
                {statements.map((statement, i) => {
                    const answer = answers[i];
                    const shown = answer !== undefined;
                    return (
                        <Box key={statement.text}>
                            <Typography sx={{ lineHeight: 1.55, mb: 1 }}>
                                <ProseText value={glossary.segmentText(statement.text)} />
                            </Typography>
                            <Stack direction="row" spacing={1} role="radiogroup" aria-label="True or false">
                                {[true, false].map(value => {
                                    const isAnswer = shown && value === statement.isTrue;
                                    const pickedOff = shown && answer === value && !isAnswer;
                                    const colour = isAnswer ? RIGHT : pickedOff ? OFF : undefined;
                                    return (
                                        <ButtonBase
                                            key={String(value)}
                                            role="radio"
                                            aria-checked={answer === value}
                                            disabled={shown}
                                            onClick={() => setAnswers(previous => ({ ...previous, [i]: value }))}
                                            sx={{
                                                minWidth: 92,
                                                minHeight: 40,
                                                px: 2,
                                                borderRadius: 2,
                                                fontWeight: 800,
                                                border: '2px solid',
                                                borderColor: colour ?? 'rgba(255,255,255,0.18)',
                                                bgcolor: colour ? `${colour}1f` : 'rgba(255,255,255,0.04)',
                                                color: colour ?? 'text.primary',
                                                opacity: shown && !colour ? 0.45 : 1,
                                            }}
                                        >
                                            {value ? 'True' : 'False'}
                                        </ButtonBase>
                                    );
                                })}
                            </Stack>
                            {shown && (
                                <Typography variant="body2" sx={{ mt: 0.75, fontWeight: 700, color: statement.isTrue ? RIGHT : OFF }}>
                                    {statement.isTrue ? 'True. See why under Must-know points below.' : "False: it's a common mistake. See why under Common mistakes below."}
                                </Typography>
                            )}
                        </Box>
                    );
                })}
            </Stack>
        </Box>
    );
};

export default GuessFirst;
