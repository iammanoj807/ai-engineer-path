// The front page's guides, teaching at a chalkboard. Ada and Alan take turns:
// as each one talks (mouth moving, arm up to the board), their point is written
// on the board in chalk. Then both cheer, the board is wiped, and it starts again.
//
// It tells its story without sound (browsers only play sound after a tap), but
// tapping a guide still plays their hello. Anyone who asks their device for
// less motion sees the whole board at once, with the guides still.

import { useEffect, useState } from 'react';
import { Box, ButtonBase, Stack, Typography } from '@mui/material';
import CheckRoundedIcon from '@mui/icons-material/CheckRounded';
import Mascot, { type Mood } from '../practice/Mascot';
import { GUIDE_NAMES, type Guide } from '../practice/guides';
import { mouthOnly, primeVoice, say, stopSpeaking } from '../practice/voice';
import { GREETING_LINES } from '../../practice/lines';

/** Each point on the board, and who teaches it. */
const POINTS: { guide: Guide; text: string }[] = [
    { guide: 'ada', text: 'Watch the idea move' },
    { guide: 'alan', text: 'Read it, step by step' },
    { guide: 'ada', text: 'Practise for five minutes' },
    { guide: 'alan', text: 'Earn XP, keep your streak' },
];
const FINALE = POINTS.length;

const WRITE_MS = 1100;
const HOLD_MS = 1500;
const CHEER_MS = 2800;
const WIPE_MS = 600;

const CHALK = '#f4f1e8';
const CHALK_YELLOW = '#ffe082';
const BOARD = '#1f3a30';
const FRAME = '#8d6e4e';

const lessMotion = () => typeof window !== 'undefined' && !!window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;

/** Chalk appearing left to right, as if written. */
const writing = {
    animation: `chalkWrite ${WRITE_MS}ms ease-out both`,
    '@keyframes chalkWrite': { from: { clipPath: 'inset(0 100% 0 0)' }, to: { clipPath: 'inset(0 0 0 0)' } },
};

const GuidesScene = () => {
    const [still] = useState(lessMotion);
    /** 0 to 3: the point being written; 4: both cheer. */
    const [step, setStep] = useState(still ? FINALE : 0);
    const [wiping, setWiping] = useState(false);

    useEffect(() => {
        if (still) return;
        const timers: number[] = [];
        if (step < FINALE) {
            mouthOnly(POINTS[step].guide, WRITE_MS + 250);
            timers.push(window.setTimeout(() => setStep(step + 1), WRITE_MS + HOLD_MS));
        } else {
            mouthOnly('ada', 1300);
            timers.push(window.setTimeout(() => setWiping(true), CHEER_MS));
            timers.push(
                window.setTimeout(() => {
                    setWiping(false);
                    setStep(0);
                }, CHEER_MS + WIPE_MS),
            );
        }
        return () => timers.forEach(timer => window.clearTimeout(timer));
    }, [step, still]);

    useEffect(() => stopSpeaking, []);

    const hello = (guide: Guide) => {
        // The tap lets the page play sound (browsers need one), then the guide says hello.
        primeVoice();
        say(GREETING_LINES[guide], guide);
    };

    const teacher = step < FINALE ? POINTS[step].guide : null;
    const moodOf = (guide: Guide): Mood => (step === FINALE ? 'cheer' : teacher === guide ? 'happy' : 'idle');
    const written = still ? POINTS.length : Math.min(step + 1, POINTS.length);

    return (
        <Box
            role="group"
            aria-label="Ada and Alan, your coaches, at a chalkboard"
            sx={{
                borderRadius: 5,
                px: { xs: 2, sm: 3 },
                pt: { xs: 2.5, sm: 3 },
                pb: 1.5,
                border: '1px solid rgba(255,255,255,0.08)',
                background: 'radial-gradient(ellipse at 50% 100%, rgba(41,121,255,0.2), transparent 62%), #121722',
            }}
        >
            {/* The chalkboard. */}
            <Box
                sx={{
                    position: 'relative',
                    borderRadius: 2,
                    border: `8px solid ${FRAME}`,
                    boxShadow: 'inset 0 0 30px rgba(0,0,0,0.45), 0 12px 30px -14px rgba(0,0,0,0.8)',
                    background: `radial-gradient(ellipse at 30% 20%, rgba(255,255,255,0.06), transparent 60%), ${BOARD}`,
                    px: { xs: 2, sm: 3 },
                    py: { xs: 1.75, sm: 2.25 },
                    opacity: wiping ? 0 : 1,
                    transition: `opacity ${WIPE_MS}ms`,
                }}
            >
                <Typography sx={{ color: CHALK_YELLOW, fontWeight: 800, fontSize: { xs: '1rem', sm: '1.1rem' }, letterSpacing: 0.5, mb: 1.25 }}>
                    Every lesson:
                </Typography>
                <Box component="ol" sx={{ listStyle: 'none', m: 0, p: 0, display: 'grid', gap: { xs: 1, sm: 1.25 } }}>
                    {/* Every line keeps its place from the start (hidden until written), so nothing below moves. */}
                    {POINTS.map((point, i) => (
                        <Stack
                            key={`${point.text}-${i < written ? 'written' : 'blank'}`}
                            component="li"
                            direction="row"
                            spacing={1.25}
                            alignItems="center"
                            sx={{ visibility: i < written ? 'visible' : 'hidden', ...(still || i !== step ? {} : writing) }}
                        >
                            <Box sx={{ width: 26, height: 26, flexShrink: 0, borderRadius: '50%', border: `2px solid ${CHALK}`, display: 'grid', placeItems: 'center', color: CHALK, fontWeight: 800, fontSize: '0.85rem' }}>
                                {step > i || still ? <CheckRoundedIcon sx={{ fontSize: 17 }} /> : i + 1}
                            </Box>
                            <Typography sx={{ color: CHALK, fontWeight: 700, fontSize: { xs: '1.05rem', sm: '1.15rem' }, textShadow: '0 0 1px rgba(255,255,255,0.4)' }}>
                                {point.text}
                            </Typography>
                            <Typography sx={{ color: point.guide === 'ada' ? '#b6beff' : '#80e3d6', fontSize: '0.8rem', fontWeight: 700, opacity: 0.85, display: { xs: 'none', sm: 'block' } }}>
                                {GUIDE_NAMES[point.guide]}
                            </Typography>
                        </Stack>
                    ))}
                </Box>
                <Typography
                    key={step === FINALE ? 'finale' : 'waiting'}
                    aria-hidden={step !== FINALE && !still}
                    sx={{
                        mt: { xs: 1.25, sm: 1.5 },
                        color: CHALK_YELLOW,
                        fontWeight: 800,
                        fontSize: { xs: '1.2rem', sm: '1.35rem' },
                        visibility: step === FINALE || still ? 'visible' : 'hidden',
                        ...(step === FINALE && !still ? writing : {}),
                    }}
                >
                    Let&apos;s learn together!
                </Typography>
                {/* The chalk tray. */}
                <Box sx={{ position: 'absolute', left: '12%', right: '12%', bottom: -14, height: 6, borderRadius: 1, bgcolor: '#6d5440' }}>
                    <Box sx={{ position: 'absolute', left: '18%', top: -4, width: 22, height: 5, borderRadius: 1, bgcolor: CHALK }} />
                    <Box sx={{ position: 'absolute', left: '30%', top: -4, width: 16, height: 5, borderRadius: 1, bgcolor: CHALK_YELLOW }} />
                </Box>
            </Box>

            {/* The guides, under the board: tap one to hear them say hello. */}
            <Stack direction="row" justifyContent="space-around" alignItems="flex-end" sx={{ mt: { xs: 2.5, sm: 3 } }}>
                {(['ada', 'alan'] as const).map(guide => (
                    <ButtonBase
                        key={guide}
                        onClick={() => hello(guide)}
                        aria-label={`Hear ${GUIDE_NAMES[guide]} say hello`}
                        sx={{ flexDirection: 'column', borderRadius: 4, p: 0.5, '&:focus-visible': { outline: '3px solid #90caf9' } }}
                    >
                        <Box sx={{ display: { xs: 'none', sm: 'block' } }}>
                            <Mascot who={guide} mood={moodOf(guide)} size={150} />
                        </Box>
                        <Box sx={{ display: { xs: 'block', sm: 'none' } }}>
                            <Mascot who={guide} mood={moodOf(guide)} size={118} />
                        </Box>
                        <Typography sx={{ mt: 0.25, fontWeight: 800, color: guide === 'ada' ? '#9aa6ff' : '#4dd0c1' }}>{GUIDE_NAMES[guide]}</Typography>
                    </ButtonBase>
                ))}
            </Stack>
        </Box>
    );
};

export default GuidesScene;
