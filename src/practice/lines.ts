// What the guide says: the words in the speech bubble, and out loud. One place
// for them, used by the cards (src/components/practice) and by the script that
// records the guides' voices (scripts/voice), so what is heard always matches
// what is shown.

import type { PracticeCard } from './cards';
import type { Guide } from '../components/practice/guides';
import type { LessonSlot } from './lesson';

/** What the coach says before each part of a step-by-step lesson. */
export const READ_LINES: Record<LessonSlot, string> = {
    why: 'First, why does this matter?',
    idea: "Here's the idea.",
    steps: "Here's how it works, one step at a time.",
    analogy: 'Think of it like this.',
    example: "Let's work through an example.",
    facts: 'These are the points to remember.',
    mistakes: 'Watch out for these common mistakes.',
};

const NUMBER_WORDS = ['No', 'One', 'Two', 'Three', 'Four', 'Five', 'Six'];
const counted = (n: number) => NUMBER_WORDS[n] ?? String(n);

/** A card's line. Fill the gap has two: typing, or choosing the word. */
export const cardLine = (card: PracticeCard, options: { choosing?: boolean } = {}): string => {
    switch (card.kind) {
        case 'read':
            return READ_LINES[card.part.slot];
        case 'idea':
            return `Let's learn something new: ${card.title}`;
        case 'words': {
            const n = card.words.length;
            return `${counted(n)} ${n === 1 ? 'word' : 'words'} you'll meet in this lesson. Read ${n === 1 ? 'it' : 'them'}, then we'll practise.`;
        }
        case 'match':
            return 'Tap a word, then tap what it means.';
        case 'blank':
            return options.choosing ? 'Choose the missing word.' : 'Type the missing word, letter by letter.';
        case 'order':
            return 'Tap the steps in the order they happen. Tap a placed step to take it back.';
        case 'mistake':
            return `${counted(card.options.length - 1)} of these are true. Which one is false?`;
        case 'recall':
            return card.question;
        case 'predict':
            return 'How many rows does this query return?';
        case 'write':
            return card.prompt;
        case 'fix':
            return `This query has one small bug. Fix it so it does this: ${card.prompt}`;
    }
};

/** What each guide says when tapped on the front page. */
export const GREETING_LINES: Record<Guide, string> = {
    ada: "Hi! I'm Ada. Let's learn together, one small step at a time.",
    alan: "Hey, I'm Alan. Ready for your first lesson? It only takes a few minutes.",
};

/** Full-screen moments in a session, and the end. */
export const MOMENT_LINES = {
    failed: "Practice didn't load",
    leave: 'Leave this practice?',
    out: 'Out of hearts',
    mistakes: "Let's fix your mistakes",
    perfect: 'Perfect lesson!',
    complete: 'Lesson complete!',
    reviewed: 'Review complete!',
} as const;
