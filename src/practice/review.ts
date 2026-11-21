// The cards of a review: a few lessons that are due (src/game/review.ts), two
// cards from each, mixed together so the learner has to recognise which idea
// each question is about (interleaving: Rohrer & Taylor, 2007).
//
// Reviews get harder each time a lesson comes back, from beginner to interview
// level: first recognising (match the pairs, fill the gap, spot the mistake),
// then recalling from memory (the lesson's own question, writing the query),
// then the interview question about it. Cards missed last time always come first.

import { isTeaching, type PracticeCard } from './cards';
import { shuffle } from './build';
import { LESSONS_PER_REVIEW, type DueLesson } from '../game/review';

export const CARDS_PER_LESSON = 2;

/** A card's kind for choosing, with interview questions apart from the other recall cards. */
type Kind = PracticeCard['kind'] | 'interview';
const kindOf = (card: PracticeCard): Kind => (card.kind === 'recall' && card.interview ? 'interview' : card.kind);

/** The kinds of card for each stage of a lesson, by its review step. */
const LEVELS: { upToStep: number; kinds: Kind[] }[] = [
    // Days 1 and 3: recognise it.
    { upToStep: 1, kinds: ['match', 'blank', 'mistake', 'order', 'predict'] },
    // Days 7 and 14: recall it from memory, and use it.
    { upToStep: 3, kinds: ['recall', 'write', 'fix', 'mistake', 'blank'] },
    // Day 30 and after: explain it as in an interview.
    { upToStep: Infinity, kinds: ['interview', 'write', 'fix', 'recall'] },
];

export const levelOf = (step: number) => LEVELS.findIndex(level => step <= level.upToStep);

/** Up to two cards for one lesson: missed ones first, then the kinds its stage asks for (a different mix each day). */
export const pickForLesson = (lesson: DueLesson, cards: PracticeCard[], today: string): PracticeCard[] => {
    const seed = `${lesson.topicId}:${today}`;
    const asks = cards.filter(card => !isTeaching(card));
    const picked = asks.filter(card => lesson.missed.includes(card.id)).slice(0, CARDS_PER_LESSON);
    for (const kind of shuffle(LEVELS[levelOf(lesson.step)].kinds, seed)) {
        if (picked.length >= CARDS_PER_LESSON) break;
        const card = asks.find(c => kindOf(c) === kind && !picked.includes(c));
        if (card && !picked.some(c => kindOf(c) === kind)) picked.push(card);
    }
    // A short lesson without those kinds: any other card.
    for (const card of shuffle(asks, seed)) {
        if (picked.length >= CARDS_PER_LESSON) break;
        if (!picked.includes(card)) picked.push(card);
    }
    return picked;
};

export interface ReviewItem {
    topicId: string;
    card: PracticeCard;
}

/**
 * The review: the first few due lessons, their cards taken in turns (one from
 * each lesson, then the second from each). `cardsFor` gives a lesson's cards,
 * its interview question included.
 */
export const buildReview = (due: DueLesson[], cardsFor: (topicId: string) => PracticeCard[], today: string): ReviewItem[] => {
    const lessons = due
        .slice(0, LESSONS_PER_REVIEW)
        .map(lesson => ({ topicId: lesson.topicId, cards: pickForLesson(lesson, cardsFor(lesson.topicId), today) }))
        .filter(lesson => lesson.cards.length > 0);
    const items: ReviewItem[] = [];
    for (let turn = 0; turn < CARDS_PER_LESSON; turn++) {
        for (const lesson of lessons) {
            const card = lesson.cards[turn];
            if (card) items.push({ topicId: lesson.topicId, card });
        }
    }
    return items;
};
