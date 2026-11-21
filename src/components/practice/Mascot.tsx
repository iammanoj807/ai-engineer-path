// The guides: Pia and Hamish, who ask the questions in practice, cheer when
// you're right, and look a little sad (never cross) when you're not. Drawn
// here as plain SVG with CSS movement, so they cost no images and keep still
// for anyone who asks their device for less motion. Who guides which lesson:
// guides.ts.

import { useEffect, useState } from 'react';
import { Box } from '@mui/material';
import type { Guide } from './guides';
import { useTalk } from './voice';

export type Mood = 'idle' | 'think' | 'happy' | 'sad' | 'cheer';

/** How each guide looks: the same face and moods, their own hair, clothes and colours. */
interface Look {
    skin: string;
    skinShade: string;
    hair: string;
    top: string;
    topDark: string;
}

const LOOKS: Record<Guide, Look> = {
    pia: { skin: '#c68863', skinShade: '#a96f4e', hair: '#2b1d16', top: '#7c8cff', topDark: '#5d6ce8' },
    hamish: { skin: '#f1c4a0', skinShade: '#d39a74', hair: '#a4512b', top: '#26a69a', topDark: '#1b7d73' },
};

const EYE = '#1f1a17';
const CHEEK = '#f48fb1';
const MOUTH = '#7a2e2e';
const TONGUE = '#ef7d8a';
const GOLD = '#ffca28';

const Eye = ({ x, y }: { x: number; y: number }) => (
    <g>
        <ellipse cx={x} cy={y} rx="3.3" ry="4.2" fill={EYE} />
        <circle cx={x + 1.1} cy={y - 1.5} r="1.2" fill="#fff" />
    </g>
);

const eyes: Record<Mood, React.ReactNode> = {
    idle: (
        <g className="guide-blink">
            <Eye x={50} y={55} />
            <Eye x={70} y={55} />
        </g>
    ),
    think: (
        <g>
            <Eye x={52} y={53} />
            <Eye x={72} y={53} />
        </g>
    ),
    happy: (
        <g fill="none" stroke={EYE} strokeWidth="2.6" strokeLinecap="round">
            <path d="M46 56 q4 -5 8 0" />
            <path d="M66 56 q4 -5 8 0" />
        </g>
    ),
    sad: (
        <g>
            <Eye x={50} y={57} />
            <Eye x={70} y={57} />
        </g>
    ),
    cheer: (
        <g fill="none" stroke={EYE} strokeWidth="2.8" strokeLinecap="round">
            <path d="M45 56 q5 -6 10 0" />
            <path d="M65 56 q5 -6 10 0" />
        </g>
    ),
};

const brows: Record<Mood, string> = {
    idle: 'M45 46 q5 -3 9 -1 M66 45 q4 -2 9 1',
    think: 'M47 44 q5 -4 10 -1 M67 45 q4 -1 9 1',
    happy: 'M45 45 q5 -3 9 -1 M66 44 q4 -2 9 1',
    // Raised in the middle: sad, not cross.
    sad: 'M45 49 q5 -1 9 -4 M66 45 q4 3 9 4',
    cheer: 'M45 43 q5 -4 9 -2 M66 41 q4 -2 9 2',
};

const mouths: Record<Mood, React.ReactNode> = {
    idle: <path d="M54 68 q6 4.5 12 0" fill="none" stroke={MOUTH} strokeWidth="2.3" strokeLinecap="round" />,
    think: <path d="M56 69.5 q5 -1.5 9 0.5" fill="none" stroke={MOUTH} strokeWidth="2.3" strokeLinecap="round" />,
    happy: (
        <g>
            <path d="M51 66 q9 11 18 0 Z" fill={MOUTH} />
            <path d="M55 71 q5 3 10 0 q-5 -3 -10 0 Z" fill={TONGUE} />
        </g>
    ),
    sad: <path d="M54 72 q6 -5 12 0" fill="none" stroke={MOUTH} strokeWidth="2.3" strokeLinecap="round" />,
    cheer: (
        <g>
            <path d="M49 65 q11 15 22 0 Z" fill={MOUTH} />
            <path d="M54 72 q6 4 12 0 q-6 -3 -12 0 Z" fill={TONGUE} />
        </g>
    ),
};

/** The mouth while talking, one shape per moment of the recording: closed, open by degrees, or rounded. */
const TALKING: Record<string, React.ReactNode> = {
    '0': <path d="M54.5 69 q5.5 2.4 11 0" fill="none" stroke={MOUTH} strokeWidth="2.3" strokeLinecap="round" />,
    '1': <ellipse cx="60" cy="69" rx="5.2" ry="2.3" fill={MOUTH} />,
    '2': (
        <g>
            <path d="M53 66.6 q7 9.4 14 0 Z" fill={MOUTH} />
            <path d="M56 70.8 q4 2.2 8 0 q-4 -2 -8 0 Z" fill={TONGUE} />
        </g>
    ),
    '3': (
        <g>
            <path d="M51.5 66 q8.5 12.4 17 0 Z" fill={MOUTH} />
            <path d="M55 72.2 q5 3 10 0 q-5 -2.6 -10 0 Z" fill={TONGUE} />
        </g>
    ),
    o: <ellipse cx="60" cy="69" rx="3.3" ry="3.5" fill={MOUTH} />,
    O: (
        <g>
            <ellipse cx="60" cy="69.6" rx="4.3" ry="5.3" fill={MOUTH} />
            <ellipse cx="60" cy="72.8" rx="2.6" ry="1.4" fill={TONGUE} />
        </g>
    ),
};

/** For anyone who asks for less motion: the mouth still moves, but only a little. */
const GENTLE: Record<string, string> = { '2': '1', '3': '1', O: 'o' };

const lessMotion = () => typeof window !== 'undefined' && !!window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;

/** The mood's mouth, or, while this guide is talking, the shape for this moment of their line. */
const Mouth = ({ who, mood }: { who: Guide; mood: Mood }) => {
    const talk = useTalk(who);
    const [shape, setShape] = useState('0');
    useEffect(() => {
        if (!talk) return;
        const gentle = lessMotion();
        let frame = 0;
        const tick = () => {
            const at = Math.floor((talk.clock() - talk.start) * talk.fps);
            const next = at < 0 ? '0' : talk.frames[at] ?? '0';
            setShape(gentle ? GENTLE[next] ?? next : next);
            frame = requestAnimationFrame(tick);
        };
        frame = requestAnimationFrame(tick);
        return () => cancelAnimationFrame(frame);
    }, [talk]);
    // Talking mouths are drawn a little larger than the resting ones: lively, and easy to see.
    return talk ? <g transform="translate(60 69) scale(1.2) translate(-60 -69)">{TALKING[shape] ?? TALKING['0']}</g> : <>{mouths[mood]}</>;
};

/** Sleeves and hands, drawn in front of the body. */
const Arm = ({ d, hand, look }: { d: string; hand: [number, number]; look: Look }) => (
    <g>
        <path d={d} fill="none" stroke={look.top} strokeWidth="9" strokeLinecap="round" />
        <circle cx={hand[0]} cy={hand[1]} r="5" fill={look.skin} />
    </g>
);

const arms = (mood: Mood, look: Look): React.ReactNode => {
    switch (mood) {
        // A hand resting by the chin.
        case 'think': return <Arm d="M33 114 Q31 96 40 86" hand={[43, 82]} look={look} />;
        // A small wave.
        case 'happy': return <Arm d="M90 108 Q98 94 100 82" hand={[100, 77]} look={look} />;
        case 'cheer':
            return (
                <>
                    <Arm d="M32 106 Q20 92 18 76" hand={[17, 71]} look={look} />
                    <Arm d="M88 106 Q100 92 102 76" hand={[103, 71]} look={look} />
                </>
            );
        default: return null;
    }
};

/** Pia: a bun, a side-swept fringe, small gold earrings and a periwinkle hoodie. */
const PiaHair = { back: (look: Look) => (
    <>
        <circle cx="60" cy="19" r="11" fill={look.hair} />
        <ellipse cx="60" cy="50" rx="29" ry="31" fill={look.hair} />
    </>
), front: (look: Look) => <path d="M35 47 C34 29 47 23 60 23 C75 23 87 31 85 48 C79 39 70 35 59 37 C50 38 42 41 35 47 Z" fill={look.hair} /> };

/** Hamish: curly auburn hair, freckles, round glasses and a teal hoodie. */
const HamishHair = { back: (look: Look) => (
    <g fill={look.hair}>
        <ellipse cx="60" cy="42" rx="27" ry="21" />
        <circle cx="43" cy="28" r="9" />
        <circle cx="54" cy="21" r="10" />
        <circle cx="67" cy="21" r="10" />
        <circle cx="78" cy="29" r="9" />
    </g>
), front: (look: Look) => (
    <path d="M34 49 C31 31 44 21 60 21 C67 21 74 23 79 27 C86 32 89 40 86 50 C83 42 78 38 71 37 C72 34 70 32 67 32 C59 34 50 35 43 39 C38 42 36 45 34 49 Z" fill={look.hair} />
) };

/** A guide, at `size` pixels wide, in a mood. Decorative: what they say is always in the text beside them. */
const Mascot = ({ mood = 'idle', size = 64, who = 'pia' }: { mood?: Mood; size?: number; who?: Guide }) => {
    const look = LOOKS[who];
    const hair = who === 'pia' ? PiaHair : HamishHair;
    return (
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
                transformOrigin: '50% 95%',
                '& .guide-blink': { transformBox: 'fill-box', transformOrigin: 'center', animation: 'guideBlink 4.5s infinite' },
                '& .guide-sparkle': { transformBox: 'fill-box', transformOrigin: 'center', animation: 'guideTwinkle 1.2s ease-in-out infinite' },
                '@keyframes guideFloat': { '0%, 100%': { transform: 'translateY(0)' }, '50%': { transform: 'translateY(-2px)' } },
                '@keyframes guideTilt': { '0%, 100%': { transform: 'rotate(0deg)' }, '50%': { transform: 'rotate(-4deg)' } },
                '@keyframes guideHop': { '0%, 100%': { transform: 'translateY(0)' }, '40%': { transform: 'translateY(-8px)' } },
                '@keyframes guideDroop': { to: { transform: 'translateY(2px) rotate(-3deg)' } },
                '@keyframes guideJump': { '0%, 100%': { transform: 'translateY(0)' }, '35%': { transform: 'translateY(-9px)' } },
                '@keyframes guideBlink': { '0%, 92%, 100%': { transform: 'scaleY(1)' }, '95%': { transform: 'scaleY(0.1)' } },
                '@keyframes guideTwinkle': { '0%, 100%': { transform: 'scale(1)', opacity: 1 }, '50%': { transform: 'scale(0.6)', opacity: 0.6 } },
                '@media (prefers-reduced-motion: reduce)': { animation: 'none', '& *': { animation: 'none !important' } },
            }}
        >
            {hair.back(look)}
            {/* Hoodie and neck */}
            <path d="M22 120 C22 98 40 87 60 87 C80 87 98 98 98 120 Z" fill={look.top} />
            <rect x="53" y="75" width="14" height="15" rx="4" fill={look.skinShade} />
            <path d="M44 89 Q60 103 76 89" fill="none" stroke={look.topDark} strokeWidth="6" strokeLinecap="round" />
            {who === 'pia' && <path d="M55 96 v9 M65 96 v9" stroke="#fff" strokeWidth="2" strokeLinecap="round" />}
            {/* Ears */}
            <circle cx="34" cy="55" r="5" fill={look.skin} />
            <circle cx="86" cy="55" r="5" fill={look.skin} />
            {who === 'pia' && (
                <>
                    <circle cx="34" cy="62" r="1.9" fill={GOLD} />
                    <circle cx="86" cy="62" r="1.9" fill={GOLD} />
                </>
            )}
            {/* Face */}
            <ellipse cx="60" cy="53" rx="25" ry="27" fill={look.skin} />
            {hair.front(look)}
            <path d={brows[mood]} fill="none" stroke={look.hair} strokeWidth={who === 'hamish' ? 3 : 2.4} strokeLinecap="round" />
            {who === 'hamish' && (
                <g fill="#b9683f" opacity="0.6">
                    <circle cx="44" cy="62" r="1" />
                    <circle cx="48" cy="64" r="1" />
                    <circle cx="43" cy="66" r="1" />
                    <circle cx="76" cy="62" r="1" />
                    <circle cx="72" cy="64" r="1" />
                    <circle cx="77" cy="66" r="1" />
                </g>
            )}
            {eyes[mood]}
            {who === 'hamish' && (
                <g fill="rgba(255,255,255,0.1)" stroke="#1c1c1c" strokeWidth="2.2">
                    <circle cx="50" cy="55" r="7.5" />
                    <circle cx="70" cy="55" r="7.5" />
                    <path d="M57.5 55 q2.5 -2 5 0 M42.5 54 L36 52 M77.5 54 L84 52" fill="none" />
                </g>
            )}
            <path d="M60 58 q-2.5 5 1 6.5" fill="none" stroke={look.skinShade} strokeWidth="1.8" strokeLinecap="round" />
            <Mouth who={who} mood={mood} />
            {mood !== 'sad' && (
                <g fill={CHEEK} opacity="0.45">
                    <circle cx="44" cy="65" r="4" />
                    <circle cx="76" cy="65" r="4" />
                </g>
            )}
            {arms(mood, look)}
            {mood === 'think' && (
                <g fill="rgba(255,255,255,0.75)">
                    <circle cx="94" cy="34" r="2.2" />
                    <circle cx="101" cy="25" r="3.2" />
                </g>
            )}
            {mood === 'cheer' && (
                <g fill={GOLD}>
                    <path className="guide-sparkle" d="M12 40 l2 5 l5 2 l-5 2 l-2 5 l-2 -5 l-5 -2 l5 -2 Z" />
                    <path className="guide-sparkle" d="M106 36 l1.6 4 l4 1.6 l-4 1.6 l-1.6 4 l-1.6 -4 l-4 -1.6 l4 -1.6 Z" />
                </g>
            )}
        </Box>
    );
};

/** How the guides move in each mood. Nothing moves for a reader who prefers less motion. */
const motion: Record<Mood, string> = {
    idle: 'guideFloat 3.2s ease-in-out infinite',
    think: 'guideTilt 2.6s ease-in-out infinite',
    happy: 'guideHop 0.5s ease-out 2',
    sad: 'guideDroop 0.6s ease-out forwards',
    cheer: 'guideJump 0.7s ease-in-out infinite',
};

export default Mascot;

/** A speech bubble for the guide: what they say, with a tail pointing back at them. */
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
