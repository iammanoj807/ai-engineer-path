// Colours, sizes and small helpers shared by the practice cards (parts.tsx
// holds the shared components).

import type { ReactNode } from 'react';
import { CONFIDENT } from '../learning/learning';
import type { Mood } from './Mascot';
import type { CardOutcome } from '../../practice/sql';

export type { CardOutcome } from '../../practice/sql';

export const WRONG = '#ef9a9a';
export const PANEL = '#0f131b';
export const RIGHT = CONFIDENT;

export const bigButton = {
    minHeight: 48,
    px: 3.5,
    fontWeight: 800,
    fontSize: '1rem',
    // A clear outline for keyboard focus, instead of MUI's pulsing ripple.
    '&.Mui-focusVisible': { outline: '3px solid rgba(255,255,255,0.75)', outlineOffset: 2 },
} as const;

/** What every card is given: its colour, and what to call when it is finished. */
export interface CardProps<C> {
    card: C;
    accent: string;
    onDone: (outcome: CardOutcome) => void;
}

export type Feedback = { tone: 'right' | 'wrong' | 'shown'; title: string; detail?: ReactNode } | null;

const PRAISE = ['Correct!', 'Nice!', 'You got it!', 'Great work!', 'Spot on!', 'Exactly right!'];

/** A word of praise, the same for a card every time (no randomness while drawing). */
export const praiseFor = (id: string) => PRAISE[[...id].reduce((sum, ch) => sum + ch.charCodeAt(0), 0) % PRAISE.length];

/** Bit's mood for a card: thinking until answered, then happy or sad. */
export const moodFor = (feedback: Feedback): Mood => (feedback?.tone === 'right' ? 'happy' : feedback?.tone === 'wrong' ? 'sad' : 'think');

/** A tappable choice: a word, a meaning, an answer. Coloured by its state. */
export const choiceSx = (colour: string | undefined, faded = false) => ({
    width: '100%',
    justifyContent: 'flex-start',
    textAlign: 'left',
    px: 2,
    py: 1.5,
    minHeight: 52,
    borderRadius: 3,
    border: '2px solid',
    borderColor: colour ?? 'rgba(255,255,255,0.14)',
    borderBottomWidth: 4,
    bgcolor: colour ? `${colour}1f` : 'rgba(255,255,255,0.03)',
    color: 'text.primary',
    fontSize: '1rem',
    lineHeight: 1.4,
    opacity: faded ? 0.4 : 1,
    transition: 'border-color 0.15s, background-color 0.15s, transform 0.1s, opacity 0.2s',
    '&:hover': { bgcolor: colour ? `${colour}29` : 'rgba(255,255,255,0.07)' },
    '&:active': { transform: 'translateY(2px)' },
    '&.Mui-disabled': { color: 'text.primary' },
});

/** Little shake for a wrong choice or letter. Still for anyone who prefers less motion. */
export const shakeSx = {
    animation: 'practiceShake 0.35s',
    '@keyframes practiceShake': {
        '0%, 100%': { transform: 'translateX(0)' },
        '25%': { transform: 'translateX(-6px)' },
        '75%': { transform: 'translateX(6px)' },
    },
    '@media (prefers-reduced-motion: reduce)': { animation: 'none' },
} as const;
