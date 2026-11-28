import { C } from '../learning/anim/kit';
import { allTopicsOf, courseById } from '../../game/courses';

// What the Lab's pieces share: its colour, its cards and the course it belongs to.

export const ACCENT = C.violet;
export const ACCENT_HOVER = '#c5b3e6';

/** How long each hour of the day stays on screen while it plays. */
export const HOUR_MS = 380;

export const CARD = { p: { xs: 2, sm: 2.5 }, borderRadius: 3, bgcolor: '#0d1117', border: '1px solid rgba(255,255,255,0.08)' } as const;

/** Leaves room for the sticky top bar when the page scrolls to a card. */
export const SCROLL_MARGIN = 76;

export const SD = courseById('system_design');
export const LESSON_NAMES = new Map(allTopicsOf(SD).map(t => [t.id, t.name]));

export const prefersReducedMotion = () => typeof window !== 'undefined' && window.matchMedia?.('(prefers-reduced-motion: reduce)').matches === true;
