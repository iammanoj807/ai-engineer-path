// The pieces every practice card shares: the guide and the question at the top, the
// scrolling body, and the bar along the bottom that turns green or red with
// the result and holds the next button. (Colours and helpers: style.ts.)

import { useEffect, type ReactNode } from 'react';
import { Box, Stack, Typography } from '@mui/material';
import CheckCircleRoundedIcon from '@mui/icons-material/CheckCircleRounded';
import CancelRoundedIcon from '@mui/icons-material/CancelRounded';
import VisibilityRoundedIcon from '@mui/icons-material/VisibilityRounded';
import Mascot, { SpeechBubble, type Mood } from './Mascot';
import { usePractice } from './context';
import { PANEL, RIGHT, WRONG, type Feedback } from './style';
import { playRight, playWrong } from './sound';

/** The card's title, then the lesson's guide saying the question in a speech bubble. */
export const CardHeader = ({ title, accent, mood = 'idle', children }: { title: string; accent: string; mood?: Mood; children: ReactNode }) => {
    const { guide } = usePractice();
    return (
    <Box sx={{ mb: 2.5 }}>
        <Typography variant="caption" sx={{ display: 'block', fontWeight: 800, letterSpacing: 1.2, color: accent, mb: 1.25 }}>
            {title.toUpperCase()}
        </Typography>
        <Stack direction="row" spacing={2} alignItems="flex-start">
            <Box sx={{ display: { xs: 'none', sm: 'block' } }}>
                <Mascot mood={mood} size={84} who={guide} />
            </Box>
            <Box sx={{ display: { xs: 'block', sm: 'none' } }}>
                <Mascot mood={mood} size={58} who={guide} />
            </Box>
            <SpeechBubble>
                <Typography id="practice-question" component="h2" sx={{ fontWeight: 700, fontSize: { xs: '1.05rem', sm: '1.2rem' }, color: '#fff', lineHeight: 1.45 }}>
                    {children}
                </Typography>
            </SpeechBubble>
        </Stack>
    </Box>
    );
};

export const Body = ({ children }: { children: ReactNode }) => (
    <Box sx={{ flex: 1, overflowY: 'auto', px: { xs: 2, sm: 4 }, py: { xs: 2.5, sm: 3.5 } }}>
        <Box sx={{ maxWidth: 760, mx: 'auto' }}>{children}</Box>
    </Box>
);

/** The bar along the bottom: what happened, and the next button. Green when right, red when not. */
export const Footer = ({ feedback, children }: { feedback: Feedback; children: ReactNode }) => {
    const colour = feedback?.tone === 'right' ? RIGHT : feedback?.tone === 'wrong' ? WRONG : undefined;
    const tone = feedback?.tone;
    // A chime when an answer is right, a soft bonk when it isn't: once, as the result appears.
    useEffect(() => {
        if (tone === 'right') playRight();
        else if (tone === 'wrong') playWrong();
    }, [tone]);
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
                            {feedback.tone === 'right' && <CheckCircleRoundedIcon sx={{ color: RIGHT, fontSize: 30, flexShrink: 0 }} />}
                            {feedback.tone === 'wrong' && <CancelRoundedIcon sx={{ color: WRONG, fontSize: 30, flexShrink: 0 }} />}
                            {feedback.tone === 'shown' && <VisibilityRoundedIcon sx={{ color: 'text.secondary', fontSize: 28, flexShrink: 0 }} />}
                            <Box sx={{ minWidth: 0 }}>
                                <Typography sx={{ fontWeight: 800, color: colour ?? 'text.primary', fontSize: '1.1rem' }}>{feedback.title}</Typography>
                                {feedback.detail && <Typography component="div" variant="body2" sx={{ color: 'text.primary' }}>{feedback.detail}</Typography>}
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
