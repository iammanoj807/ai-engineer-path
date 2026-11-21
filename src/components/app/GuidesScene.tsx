// The front page's guides: Pia and Hamish take turns to say what the site is,
// each line filling their speech bubble while their mouth moves. Tap either to
// hear them say hello in their own voice. Still, with the whole first line
// shown, for anyone who asks their device for less motion.

import { useEffect, useState } from 'react';
import { Box, ButtonBase, Stack, Typography } from '@mui/material';
import VolumeUpRoundedIcon from '@mui/icons-material/VolumeUpRounded';
import Mascot, { type Mood } from '../practice/Mascot';
import { GUIDE_NAMES, type Guide } from '../practice/guides';
import { mouthOnly, primeVoice, say, stopSpeaking } from '../practice/voice';
import { GREETING_LINES } from '../../practice/lines';

const SCRIPT: { guide: Guide; text: string }[] = [
    { guide: 'pia', text: "Hi! I'm Pia." },
    { guide: 'hamish', text: "And I'm Hamish. We're your guides." },
    { guide: 'pia', text: 'Every lesson starts with the idea, one step at a time.' },
    { guide: 'hamish', text: 'Then five minutes of practice. Hearts, XP and a streak!' },
    { guide: 'pia', text: "Ready? Let's learn together!" },
];

const TYPE_MS = 32;
const HOLD_MS = 2200;

const lessMotion = () => typeof window !== 'undefined' && !!window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;

const GuidesScene = () => {
    const [still] = useState(lessMotion);
    const [line, setLine] = useState(0);
    const [shown, setShown] = useState(still ? SCRIPT[0].text.length : 0);
    /** A guide saying hello out loud, after a tap: the bubbles wait. */
    const [greeting, setGreeting] = useState<Guide | null>(null);
    const current = greeting ? { guide: greeting, text: GREETING_LINES[greeting] } : SCRIPT[line];
    const last = !greeting && line === SCRIPT.length - 1;

    // Each line fills in letter by letter while the guide's mouth moves, then waits, then the next.
    useEffect(() => {
        if (still || greeting) return;
        const { guide, text } = SCRIPT[line];
        mouthOnly(guide, text.length * TYPE_MS + 150);
        let count = 0;
        let next = 0;
        const typing = window.setInterval(() => {
            count += 1;
            setShown(count);
            if (count >= text.length) {
                window.clearInterval(typing);
                next = window.setTimeout(() => {
                    setShown(0);
                    setLine(at => (at + 1) % SCRIPT.length);
                }, line === SCRIPT.length - 1 ? HOLD_MS * 2 : HOLD_MS);
            }
        }, TYPE_MS);
        return () => {
            window.clearInterval(typing);
            window.clearTimeout(next);
        };
    }, [line, still, greeting]);

    useEffect(() => stopSpeaking, []);

    const hello = (guide: Guide) => {
        // The tap lets the page play sound (iPhones need it), then the guide says hello.
        primeVoice();
        setGreeting(guide);
        say(GREETING_LINES[guide], guide);
        window.setTimeout(() => setGreeting(at => (at === guide ? null : at)), 5200);
    };

    const moodOf = (guide: Guide): Mood => (last ? 'cheer' : current.guide === guide ? 'happy' : 'idle');
    const text = greeting || still ? current.text : current.text.slice(0, shown);

    return (
        <Box
            role="group"
            aria-label="Pia and Hamish, your guides"
            sx={{
                position: 'relative',
                borderRadius: 5,
                px: { xs: 2, sm: 3 },
                pt: { xs: 2.5, sm: 3 },
                pb: 2,
                border: '1px solid rgba(255,255,255,0.08)',
                background: 'radial-gradient(ellipse at 50% 100%, rgba(41,121,255,0.22), transparent 62%), radial-gradient(circle at 15% 10%, rgba(179,157,219,0.14), transparent 45%), #121722',
                overflow: 'hidden',
            }}
        >
            {/* The speech bubble, its tail pointing at whoever is talking. */}
            <Box
                aria-hidden
                sx={{
                    position: 'relative',
                    minHeight: { xs: 76, sm: 84 },
                    display: 'flex',
                    alignItems: 'center',
                    px: 2.25,
                    py: 1.5,
                    borderRadius: 3,
                    bgcolor: '#fff',
                    color: '#151921',
                    boxShadow: '0 10px 30px -12px rgba(0,0,0,0.6)',
                    '&::after': {
                        content: '""',
                        position: 'absolute',
                        bottom: -9,
                        left: current.guide === 'pia' ? '22%' : 'auto',
                        right: current.guide === 'hamish' ? '22%' : 'auto',
                        width: 18,
                        height: 18,
                        bgcolor: '#fff',
                        transform: 'rotate(45deg)',
                        transition: 'left 0.3s, right 0.3s',
                    },
                }}
            >
                <Typography sx={{ fontWeight: 800, fontSize: { xs: '1.05rem', sm: '1.2rem' }, lineHeight: 1.35 }}>
                    <Box component="span" sx={{ color: current.guide === 'pia' ? '#5d6ce8' : '#1b7d73', mr: 0.75 }}>
                        {GUIDE_NAMES[current.guide]}:
                    </Box>
                    {text}
                    {!greeting && !still && shown < current.text.length && (
                        <Box component="span" sx={{ display: 'inline-block', width: '0.5ch', ml: 0.25, borderBottom: '2px solid #151921', animation: 'caret 0.8s steps(1) infinite', '@keyframes caret': { '50%': { opacity: 0 } } }} />
                    )}
                </Typography>
            </Box>
            {/* For screen readers: who they are, once (the bubbles above change every few seconds). */}
            <Typography sx={{ position: 'absolute', width: 1, height: 1, overflow: 'hidden', clip: 'rect(0 0 0 0)' }}>
                Pia and Hamish are your guides. They teach each lesson's idea, then ask quick practice questions.
            </Typography>

            <Stack direction="row" justifyContent="space-around" alignItems="flex-end" sx={{ mt: { xs: 2, sm: 2.5 } }}>
                {(['pia', 'hamish'] as const).map(guide => (
                    <ButtonBase
                        key={guide}
                        onClick={() => hello(guide)}
                        aria-label={`Hear ${GUIDE_NAMES[guide]} say hello`}
                        sx={{ flexDirection: 'column', borderRadius: 4, p: 0.5, '&:focus-visible': { outline: '3px solid #90caf9' } }}
                    >
                        <Box sx={{ display: { xs: 'none', sm: 'block' } }}>
                            <Mascot who={guide} mood={moodOf(guide)} size={168} />
                        </Box>
                        <Box sx={{ display: { xs: 'block', sm: 'none' } }}>
                            <Mascot who={guide} mood={moodOf(guide)} size={124} />
                        </Box>
                        <Typography sx={{ mt: 0.5, fontWeight: 800, color: guide === 'pia' ? '#9aa6ff' : '#4dd0c1' }}>{GUIDE_NAMES[guide]}</Typography>
                    </ButtonBase>
                ))}
            </Stack>
            <Stack direction="row" spacing={0.75} alignItems="center" justifyContent="center" sx={{ mt: 1, color: 'text.secondary' }}>
                <VolumeUpRoundedIcon sx={{ fontSize: 18 }} />
                <Typography variant="body2">Tap Pia or Hamish to hear them say hello</Typography>
            </Stack>
        </Box>
    );
};

export default GuidesScene;
