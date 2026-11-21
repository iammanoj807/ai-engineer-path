// Bit: the site's own small robot, who asks the questions in practice, cheers
// when you're right, and is a little sad (never cross) when you're not. Drawn
// here as plain SVG with CSS movement, so it costs no images and keeps still
// for anyone who asks their device for less motion.

import { Box } from '@mui/material';

export const MASCOT_NAME = 'Bit';

export type Mood = 'idle' | 'think' | 'happy' | 'sad' | 'cheer';

const BODY = '#dbe4ff';
const EDGE = '#9fb3ff';
const SCREEN = '#121a2b';
const EYE = '#4dd0e1';
const CHEEK = '#f48fb1';
const LIGHT = '#ffca28';

const eyes: Record<Mood, React.ReactNode> = {
    idle: (
        <g className="bit-blink">
            <ellipse cx="48" cy="52" rx="5" ry="6" fill={EYE} />
            <ellipse cx="72" cy="52" rx="5" ry="6" fill={EYE} />
        </g>
    ),
    think: (
        <g>
            <ellipse cx="51" cy="49" rx="4.5" ry="5.5" fill={EYE} />
            <ellipse cx="75" cy="49" rx="4.5" ry="5.5" fill={EYE} />
        </g>
    ),
    happy: (
        <g fill="none" stroke={EYE} strokeWidth="3.5" strokeLinecap="round">
            <path d="M43 54 q5 -8 10 0" />
            <path d="M67 54 q5 -8 10 0" />
        </g>
    ),
    sad: (
        <g>
            <ellipse cx="48" cy="54" rx="4.5" ry="5" fill={EYE} />
            <ellipse cx="72" cy="54" rx="4.5" ry="5" fill={EYE} />
            {/* Brows raised in the middle: sad, not cross. */}
            <path d="M42 48 l11 -4 M78 48 l-11 -4" stroke={EYE} strokeWidth="2.5" strokeLinecap="round" />
        </g>
    ),
    cheer: (
        <g fill="none" stroke={LIGHT} strokeWidth="3.5" strokeLinecap="round">
            <path d="M43 54 q5 -9 10 0" />
            <path d="M67 54 q5 -9 10 0" />
        </g>
    ),
};

const mouths: Record<Mood, React.ReactNode> = {
    idle: <path d="M54 63 q6 4 12 0" fill="none" stroke={EYE} strokeWidth="3" strokeLinecap="round" />,
    think: <path d="M55 64 h9" fill="none" stroke={EYE} strokeWidth="3" strokeLinecap="round" />,
    happy: <path d="M50 61 q10 10 20 0" fill="none" stroke={EYE} strokeWidth="3" strokeLinecap="round" />,
    sad: <path d="M52 67 q8 -6 16 0" fill="none" stroke={EYE} strokeWidth="3" strokeLinecap="round" />,
    cheer: <ellipse cx="60" cy="64" rx="7" ry="5" fill={EYE} />,
};

const arms: Record<Mood, React.ReactNode> = {
    idle: <path d="M38 92 q-9 6 -10 14 M82 92 q9 6 10 14" />,
    think: <path d="M38 92 q-9 6 -10 14 M82 92 q10 -2 6 -14" />,
    happy: <path d="M38 93 q-12 1 -18 -6 M82 93 q12 1 18 -6" />,
    sad: <path d="M38 94 q-6 8 -6 16 M82 94 q6 8 6 16" />,
    // Out to the sides and up, clear of the head, so they show.
    cheer: <path d="M38 92 q-16 -2 -24 -16 M82 92 q16 -2 24 -16" />,
};

/** How Bit moves in each mood. Nothing moves for a reader who prefers less motion. */
const motion: Record<Mood, string> = {
    idle: 'bitFloat 3.2s ease-in-out infinite',
    think: 'bitTilt 2.4s ease-in-out infinite',
    happy: 'bitHop 0.5s ease-out 2',
    sad: 'bitDroop 0.6s ease-out forwards',
    cheer: 'bitJump 0.7s ease-in-out infinite',
};

/** Bit, at `size` pixels wide, in a mood. Decorative: what Bit says is always in the text beside it. */
const Mascot = ({ mood = 'idle', size = 64 }: { mood?: Mood; size?: number }) => (
    <Box
        component="svg"
        viewBox="0 0 120 120"
        aria-hidden
        sx={{
            width: size,
            height: size,
            flexShrink: 0,
            overflow: 'visible',
            animation: motion[mood],
            transformOrigin: '50% 90%',
            '& .bit-blink': { transformBox: 'fill-box', transformOrigin: 'center', animation: 'bitBlink 4.5s infinite' },
            '& .bit-light': { animation: mood === 'sad' ? 'none' : 'bitGlow 1.8s ease-in-out infinite' },
            '@keyframes bitFloat': { '0%, 100%': { transform: 'translateY(0)' }, '50%': { transform: 'translateY(-3px)' } },
            '@keyframes bitTilt': { '0%, 100%': { transform: 'rotate(0deg)' }, '50%': { transform: 'rotate(-5deg)' } },
            '@keyframes bitHop': { '0%, 100%': { transform: 'translateY(0)' }, '40%': { transform: 'translateY(-10px)' } },
            '@keyframes bitDroop': { to: { transform: 'translateY(3px) rotate(-3deg)' } },
            '@keyframes bitJump': { '0%, 100%': { transform: 'translateY(0) rotate(0)' }, '30%': { transform: 'translateY(-12px) rotate(-4deg)' }, '60%': { transform: 'translateY(-6px) rotate(4deg)' } },
            '@keyframes bitBlink': { '0%, 92%, 100%': { transform: 'scaleY(1)' }, '95%': { transform: 'scaleY(0.1)' } },
            '@keyframes bitGlow': { '0%, 100%': { opacity: 1 }, '50%': { opacity: 0.55 } },
            '@media (prefers-reduced-motion: reduce)': { animation: 'none', '& *': { animation: 'none !important' } },
        }}
    >
        {/* Antenna */}
        <line x1="60" y1="24" x2="60" y2="12" stroke={EDGE} strokeWidth="4" strokeLinecap="round" />
        <circle className="bit-light" cx="60" cy="9" r="6" fill={mood === 'sad' ? '#6b7380' : LIGHT} />
        {/* Ears */}
        <rect x="12" y="44" width="11" height="20" rx="5" fill={EDGE} />
        <rect x="97" y="44" width="11" height="20" rx="5" fill={EDGE} />
        {/* Arms, behind the body */}
        <g fill="none" stroke={EDGE} strokeWidth="6" strokeLinecap="round">{arms[mood]}</g>
        {/* Body */}
        <rect x="38" y="84" width="44" height="26" rx="11" fill={BODY} stroke={EDGE} strokeWidth="3" />
        <circle cx="60" cy="97" r="4.5" fill={mood === 'sad' ? '#6b7380' : CHEEK} />
        {/* Head and its screen */}
        <rect x="20" y="22" width="80" height="64" rx="22" fill={BODY} stroke={EDGE} strokeWidth="3" />
        <rect x="30" y="33" width="60" height="42" rx="14" fill={SCREEN} />
        {eyes[mood]}
        {mouths[mood]}
        {(mood === 'happy' || mood === 'cheer' || mood === 'idle') && (
            <g fill={CHEEK} opacity="0.75">
                <circle cx="38" cy="64" r="3.2" />
                <circle cx="82" cy="64" r="3.2" />
            </g>
        )}
    </Box>
);

export default Mascot;

/** A speech bubble for Bit: what Bit says, with a tail pointing back at Bit. */
export const SpeechBubble = ({ children }: { children: React.ReactNode }) => (
    <Box
        sx={{
            position: 'relative',
            flex: 1,
            minWidth: 0,
            px: 2,
            py: 1.5,
            borderRadius: 3,
            border: '1.5px solid rgba(255,255,255,0.14)',
            bgcolor: 'rgba(255,255,255,0.04)',
            '&::before': {
                content: '""',
                position: 'absolute',
                left: -9,
                top: 22,
                width: 14,
                height: 14,
                bgcolor: '#191c24',
                borderLeft: '1.5px solid rgba(255,255,255,0.14)',
                borderBottom: '1.5px solid rgba(255,255,255,0.14)',
                transform: 'rotate(45deg)',
            },
        }}
    >
        {children}
    </Box>
);
