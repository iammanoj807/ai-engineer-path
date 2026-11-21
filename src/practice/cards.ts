// The cards of a practice session, for every course. A session teaches first
// (the idea, then its new words), then practises with a mix of exercises. Every
// card is made from what a lesson already has (src/practice/build.ts): nothing
// here is written twice, and nothing is invented.

import type { SqlResultTable } from '../data/sql';
import type { PredictCard, RowOrder, WriteCard } from './sql';

export type { PredictCard, WriteCard } from './sql';

/** Teaching: the lesson's one-line idea, its picture, and an everyday comparison. */
export interface IdeaCard {
    kind: 'idea';
    id: string;
    title: string;
    definition: string;
    analogy?: string;
}

/** Teaching: the words this lesson uses for the first time, with their meanings. */
export interface WordsCard {
    kind: 'words';
    id: string;
    words: { term: string; meaning: string }[];
}

/** Tap a word, then its meaning, until every pair is matched. */
export interface MatchCard {
    kind: 'match';
    id: string;
    pairs: { key: string; term: string; meaning: string }[];
    /** The order the words and the meanings are shown in (keys), each shuffled. */
    termOrder: string[];
    meaningOrder: string[];
}

/** A sentence from the lesson with one word missing, typed letter by letter. */
export interface BlankCard {
    kind: 'blank';
    id: string;
    before: string;
    answer: string;
    after: string;
    /** What the missing word means: the clue. */
    clue: string;
    /** For anyone who finds typing hard: the word among three others from the lesson, to tap instead. */
    choices: string[];
}

/** Steps of "How it works", shuffled, to put back in order. */
export interface OrderCard {
    kind: 'order';
    id: string;
    /** In the right order. */
    steps: string[];
    /** The order they are shown in, as indexes into steps. Never already right. */
    shown: number[];
}

/** One common mistake among true key points: find the mistake. */
export interface MistakeCard {
    kind: 'mistake';
    id: string;
    options: { text: string; mistake: boolean }[];
}

/** A follow-up question: think, see the answer, say honestly whether you knew it. */
export interface RecallCard {
    kind: 'recall';
    id: string;
    question: string;
    answer: string;
}

/** SQL: a working query with one small bug put in, to find and fix. */
export interface FixCard {
    kind: 'fix';
    id: string;
    prompt: string;
    brokenSql: string;
    answerSql: string;
    expected: SqlResultTable;
    order: RowOrder;
    /** Where to look, shown only when asked for. */
    hint: string;
}

export type PracticeCard = IdeaCard | WordsCard | MatchCard | BlankCard | OrderCard | MistakeCard | RecallCard | PredictCard | WriteCard | FixCard;

/** Cards that teach rather than ask: they can't be got wrong. */
export const isTeaching = (card: PracticeCard) => card.kind === 'idea' || card.kind === 'words';

/** Cards that ask and are checked: these cost a heart when missed, and come back once at the end. */
export const isChecked = (card: PracticeCard) => !isTeaching(card) && card.kind !== 'recall';

export const CARD_TITLES: Record<PracticeCard['kind'], string> = {
    idea: 'New idea',
    words: 'New words',
    match: 'Match the pairs',
    blank: 'Fill the gap',
    order: 'Put the steps in order',
    mistake: 'Spot the mistake',
    recall: 'Remember it',
    predict: 'Predict the rows',
    write: 'Write the query',
    fix: 'Fix the query',
};

/** A card's title; a SQL problem's own question is "Solve the problem". */
export const cardTitle = (card: PracticeCard) => (card.kind === 'write' ? card.label.charAt(0) + card.label.slice(1).toLowerCase() : CARD_TITLES[card.kind]);
