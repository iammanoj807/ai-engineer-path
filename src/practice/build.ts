// A practice session for one lesson, in any course: teach first (the idea, the
// new words), then a short mix of exercises. Every card comes from what the
// lesson already has: its definition and comparison, its glossary words, its
// "how it works" steps, its key points and common mistakes, its follow-up
// questions, and (for SQL) its queries with their exact rows. Nothing is
// written twice and nothing is invented; when a lesson has nothing that fits a
// card, that card is left out.

import type { FoundationTopic } from '../data/foundations';
import type { SqlResultTable, SqlTopic, SqlTopicAnswers } from '../data/sql';
import type { SDTopic } from '../data/systemDesign';
import type { Course } from '../services/progress';
import type { GlossaryTerm, TextSegment } from '../utils/glossaryEngine';
import { isTeaching, type BlankCard, type GuessCard, type IdeaCard, type MatchCard, type MistakeCard, type OrderCard, type PracticeCard, type ReadCard, type RecallCard, type WordsCard } from './cards';
import { lessonOutline, type LessonSlot } from './lesson';
import { seedOf, sqlFixCard, sqlPracticeCards, type WriteCard } from './sql';
import { isTypable } from './typing';

export type AnyTopic = FoundationTopic | SqlTopic | SDTopic;

/** What practice needs from a course's glossary, for any of its lessons. */
export interface PracticeGlossary {
    terms: GlossaryTerm[];
    getTerm(id: string): GlossaryTerm | undefined;
    segmentText(text: string): TextSegment[];
    /** Every glossary word the lesson uses, in reading order. */
    termsIn(topic: AnyTopic): string[];
    /** The words this lesson is the first to use (not the one it teaches). */
    newWordsIn(topic: AnyTopic): GlossaryTerm[];
}

export interface SessionSources {
    glossary: PracticeGlossary;
    sqlAnswers?: Record<string, SqlTopicAnswers>;
}

// ============ A LESSON, THE SAME SHAPE IN EVERY COURSE ============

export interface LessonText {
    id: string;
    name: string;
    definition: string;
    analogy?: string;
    /** In order: "how it works", or a problem's approach, or a design's steps. */
    steps: string[];
    /** True statements: key points, edge cases, trade-offs, deep dives. */
    facts: string[];
    mistakes: string[];
    followUps: { q: string; a: string }[];
}

export const lessonText = (topic: AnyTopic): LessonText => {
    const base = { id: topic.id, name: topic.name, definition: topic.definition, mistakes: topic.mistakes, followUps: topic.followUps };
    if ('note' in topic) return { ...base, analogy: topic.note.analogy, steps: topic.howItWorks, facts: topic.keyPoints };
    switch (topic.kind) {
        case 'lesson':
            return { ...base, analogy: topic.analogy, steps: topic.howItWorks, facts: topic.keyPoints };
        case 'problem':
            return { ...base, steps: topic.approach, facts: topic.edgeCases };
        case 'concept':
            return { ...base, analogy: topic.analogy, steps: topic.howItWorks, facts: [...topic.keyPoints, ...(topic.tradeOffs ?? [])] };
        case 'design':
            return { ...base, steps: topic.design.length >= 3 ? topic.design : topic.evolution, facts: topic.deepDives };
    }
};

// ============ SMALL TOOLS ============

/** A seeded random number generator, so a card looks the same every time it is shown. */
const randomFrom = (seed: string) => {
    let a = seedOf(seed) || 1;
    return () => {
        a = (a + 0x6d2b79f5) | 0;
        let t = Math.imul(a ^ (a >>> 15), 1 | a);
        t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
        return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
};

export const shuffle = <T>(items: T[], seed: string): T[] => {
    const out = [...items];
    const random = randomFrom(seed);
    for (let i = out.length - 1; i > 0; i--) {
        const j = Math.floor(random() * (i + 1));
        [out[i], out[j]] = [out[j], out[i]];
    }
    return out;
};

/** Sentences of a text. "e.g." and "i.e." don't end a sentence. */
export const sentencesOf = (text: string): string[] =>
    (text.replace(/\s+/g, ' ').replace(/\b(e\.g|i\.e|etc|vs)\./g, '$1\uE000').match(/[^.!?]+(?:[.!?]+|$)/g) ?? [])
        .map(sentence => sentence.replace(/\uE000/g, '.').trim())
        .filter(Boolean);

const firstSentence = (text: string) => sentencesOf(text)[0] ?? text.trim();

const escapeRegExp = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

/**
 * True when the text gives the word away: any of its spellings as a whole word,
 * or the word itself at the start of a longer one ("dates" gives "DATE" away).
 */
const mentions = (text: string, term: GlossaryTerm) =>
    term.matches.some(spelling => new RegExp(`(?<![A-Za-z0-9_])${escapeRegExp(spelling)}(?![A-Za-z0-9_])`, 'i').test(text)) ||
    new RegExp(`(?<![A-Za-z0-9_])${escapeRegExp(term.term)}`, 'i').test(text);

/** True when the word appears in the text on its own or as part of a hyphenated word ("cross-entropy"). */
const containsWord = (text: string, word: string) => new RegExp(`(?<![A-Za-z0-9])${escapeRegExp(word)}(?![A-Za-z0-9])`, 'i').test(text);

/** Text that would be odd inside a card: a link to another page. */
const hasLink = (text: string) => text.includes('](/');

/** The text a lesson teaches with: its definition, comparison, steps and key points (not side notes). */
const coreText = (lesson: LessonText) => [lesson.definition, lesson.analogy ?? '', ...lesson.steps, ...lesson.facts].join('\n');

/**
 * The lesson's words, most useful first: the one it teaches, the ones it
 * introduces, then the rest it uses. Words the lesson teaches with come before
 * words it only mentions in passing (in a follow-up question, say), and a word
 * only mentioned in passing is never one of its "new words".
 */
const lessonWords = (topic: AnyTopic, glossary: PracticeGlossary): GlossaryTerm[] => {
    const core = coreText(lessonText(topic));
    const seen = new Set<string>();
    const inCore: GlossaryTerm[] = [];
    const inPassing: GlossaryTerm[] = [];
    const add = (term: GlossaryTerm | undefined) => {
        if (!term || seen.has(term.id)) return;
        seen.add(term.id);
        (mentions(core, term) ? inCore : inPassing).push(term);
    };
    glossary.terms.filter(term => term.taughtIn === topic.id).forEach(add);
    glossary.newWordsIn(topic).forEach(add);
    glossary.termsIn(topic).forEach(id => add(glossary.getTerm(id)));
    return [...inCore, ...inPassing];
};

// ============ TEACHING CARDS ============

const ideaCard = (lesson: LessonText): IdeaCard => ({
    kind: 'idea',
    id: `${lesson.id}-idea`,
    title: lesson.name,
    definition: lesson.definition,
    ...(lesson.analogy ? { analogy: lesson.analogy } : {}),
});

/** Two or three words to know before the questions: the lesson's new words first. */
const wordsCard = (topic: AnyTopic, glossary: PracticeGlossary): WordsCard[] => {
    const core = coreText(lessonText(topic));
    const fits = (term: GlossaryTerm) => term.taughtIn !== topic.id && term.definition.length <= 160 && mentions(core, term);
    const words = [...glossary.newWordsIn(topic).filter(fits), ...lessonWords(topic, glossary).filter(fits)]
        .filter((term, i, all) => all.findIndex(other => other.id === term.id) === i)
        .slice(0, 3);
    return words.length >= 2 ? [{ kind: 'words', id: `${topic.id}-words`, words: words.map(term => ({ term: term.term, meaning: term.definition })) }] : [];
};

// ============ EXERCISE CARDS ============

/** Four words and their meanings. A meaning never contains its word, or another word of the card. */
const matchCard = (topic: AnyTopic, glossary: PracticeGlossary): MatchCard[] => {
    const id = `${topic.id}-match`;
    const picked: GlossaryTerm[] = [];
    for (const term of lessonWords(topic, glossary)) {
        if (picked.length === 4) break;
        const meaning = firstSentence(term.definition);
        if (term.term.length > 30 || meaning.length < 12 || meaning.length > 110 || mentions(meaning, term)) continue;
        if (picked.some(other => firstSentence(other.definition) === meaning)) continue;
        if (picked.some(other => mentions(meaning, other) || mentions(firstSentence(other.definition), term))) continue;
        picked.push(term);
    }
    if (picked.length < 3) return [];
    const pairs = picked.map(term => ({ key: term.id, term: term.term, meaning: firstSentence(term.definition) }));
    const keys = pairs.map(pair => pair.key);
    return [{ kind: 'match', id, pairs, termOrder: shuffle(keys, `${id}:words`), meaningOrder: shuffle(keys, `${id}:meanings`) }];
};

/**
 * Sentences from the lesson with one glossary word missing, to type in. The
 * word the lesson teaches comes first, then its new words. A sentence is used
 * only if the word appears in it once, so the rest of the sentence doesn't give
 * it away; the clue is the word's meaning, which never contains the word.
 *
 * No repeats in one session: words already in the match card (`avoid`) are
 * used only if nothing else fits, and the definition the idea card has just
 * shown comes after the lesson's other sentences.
 */
const blankCards = (topic: AnyTopic, lesson: LessonText, glossary: PracticeGlossary, count: number, avoid: ReadonlySet<string> = new Set()): BlankCard[] => {
    const own = new Set(glossary.terms.filter(term => term.taughtIn === topic.id).map(term => term.id));
    const fresh = new Set(glossary.newWordsIn(topic).map(term => term.id));
    const candidates: { rank: number; termId: string; sentence: string; card: Omit<BlankCard, 'id' | 'kind' | 'choices'> }[] = [];
    [lesson.definition, ...lesson.facts, ...lesson.steps].forEach((text, textIndex) => {
        for (const sentence of sentencesOf(text)) {
            if (sentence.length < 30 || sentence.length > 220 || hasLink(sentence)) continue;
            const segments = glossary.segmentText(sentence);
            let at = 0;
            for (const segment of segments) {
                const start = at;
                at += segment.text.length;
                if (!segment.termId) continue;
                const term = glossary.getTerm(segment.termId);
                if (!term || !isTypable(segment.text) || segment.text.length > 24) continue;
                if (segments.filter(other => other.termId === segment.termId).length > 1) continue;
                const clue = firstSentence(term.definition);
                if (mentions(clue, term) || containsWord(clue, segment.text)) continue;
                const before = sentence.slice(0, start);
                const after = sentence.slice(start + segment.text.length);
                if (containsWord(`${before} ${after}`, segment.text)) continue;
                // Inline `code` must stay whole on its side of the gap.
                if ((before.match(/`/g) ?? []).length % 2 === 1) continue;
                candidates.push({
                    rank: (avoid.has(term.id) ? 1000 : 0) + (textIndex === 0 ? 500 : 0) + (own.has(term.id) ? 0 : fresh.has(term.id) ? 100 : 200) + Math.min(textIndex, 99),
                    termId: term.id,
                    sentence,
                    card: { before, answer: segment.text, after, clue },
                });
            }
        }
    });
    const chosen: typeof candidates = [];
    for (const candidate of candidates.sort((a, b) => a.rank - b.rank)) {
        if (chosen.length === count) break;
        if (chosen.some(other => other.termId === candidate.termId || other.sentence === candidate.sentence)) continue;
        chosen.push(candidate);
    }
    // Three other words of the lesson to choose from, none of them the answer or part of it.
    const words = lessonWords(topic, glossary);
    const choicesFor = (answer: string, id: string) => {
        const others = words
            .map(term => term.term)
            .filter(word => isTypable(word) && !answer.toLowerCase().includes(word.toLowerCase()) && !word.toLowerCase().includes(answer.toLowerCase()))
            .filter((word, i, all) => all.findIndex(other => other.toLowerCase() === word.toLowerCase()) === i)
            .slice(0, 3);
        return shuffle([answer, ...others], `${id}:choices`);
    };
    return chosen.map((candidate, i) => {
        const id = `${topic.id}-blank-${i + 1}`;
        return { kind: 'blank', id, ...candidate.card, choices: choicesFor(candidate.card.answer, id) };
    });
};

/** Openings of steps that are alternatives or asides, not the next step of one process. */
const BRANCH = /^(hit|miss|if|otherwise|else|with|without|or|alternatively|example|for example|e\.g\.|note|tip|bonus|optional|instead)\b/i;

/**
 * Three or four consecutive steps of "how it works", shuffled. A run with
 * alternatives in it ("Hit: …", "Miss: …", "With η = 0.9 …") has no single right
 * order, so it is skipped; so are runs where two steps start the same way.
 */
const orderCard = (lesson: LessonText): OrderCard[] => {
    const id = `${lesson.id}-order`;
    const steps = lesson.steps.map(step => step.trim());
    for (const size of [4, 3]) {
        for (let start = 0; start + size <= steps.length; start++) {
            const run = steps.slice(start, start + size);
            if (run.some(step => step.length < 15 || step.length > 200 || BRANCH.test(step) || hasLink(step))) continue;
            const openings = run.map(step => step.split(/\s+/).slice(0, 2).join(' ').toLowerCase());
            if (new Set(openings).size < run.length || new Set(run).size < run.length) continue;
            const inOrder = run.map((_, i) => i);
            let shown = inOrder;
            for (let attempt = 0; shown.every((value, i) => value === i); attempt++) shown = shuffle(inOrder, `${id}:${attempt}`);
            return [{ kind: 'order', id, steps: run, shown }];
        }
    }
    return [];
};

/** One of the lesson's common mistakes among up to three of its true key points. */
const mistakeCard = (lesson: LessonText): MistakeCard[] => {
    const id = `${lesson.id}-mistake`;
    const fits = (text: string) => text.length >= 20 && text.length <= 170 && !hasLink(text);
    const mistake = lesson.mistakes.find(fits);
    const facts = lesson.facts.filter(fits).slice(0, 3);
    if (!mistake || facts.length < 2) return [];
    return [{ kind: 'mistake', id, options: shuffle([{ text: mistake, mistake: true }, ...facts.map(text => ({ text, mistake: false }))], id) }];
};

/**
 * The warm-up before learning: the lesson's second common mistake (false) and
 * a key point (true), never the statements the "spot the mistake" card shows.
 */
export const guessCard = (lesson: LessonText): GuessCard[] => {
    const id = `${lesson.id}-guess`;
    const fits = (text: string) => text.length >= 20 && text.length <= 170 && !hasLink(text);
    // mistakeCard uses the first mistake that fits and the first three facts.
    const mistake = lesson.mistakes.filter(fits)[1];
    const fact = lesson.facts.filter(fits)[3];
    const statements = [...(mistake ? [{ text: mistake, isTrue: false }] : []), ...(fact ? [{ text: fact, isTrue: true }] : [])];
    return statements.length ? [{ kind: 'guess', id, statements: shuffle(statements, id) }] : [];
};

/** A question an interviewer would ask about the lesson, with its model answer. */
export interface InterviewSource {
    q: string;
    answer: string;
    /** The lessons the answer is built on; the first is the main one. */
    topicIds: string[];
}

/**
 * A lesson's interview-level question, for its later reviews: the course's
 * interview question about it when there is one, else a follow-up question the
 * "Remember it" card doesn't use.
 */
export const interviewCard = (lesson: LessonText, questions: InterviewSource[] = []): RecallCard[] => {
    const id = `${lesson.id}-interview`;
    const asked = questions.find(question => question.topicIds[0] === lesson.id && question.q.length <= 260);
    if (asked) return [{ kind: 'recall', id, question: asked.q, answer: asked.answer, interview: true }];
    const fits = (f: { q: string; a: string }) => f.q.length <= 220 && f.a.length <= 360 && !hasLink(f.q) && !hasLink(f.a);
    const followUp = lesson.followUps.filter(fits)[1];
    return followUp ? [{ kind: 'recall', id, question: followUp.q, answer: followUp.a, interview: true }] : [];
};

const recallCard = (lesson: LessonText): RecallCard[] => {
    const followUp = lesson.followUps.find(f => f.q.length <= 220 && f.a.length <= 360 && !hasLink(f.q) && !hasLink(f.a));
    return followUp ? [{ kind: 'recall', id: `${lesson.id}-recall`, question: followUp.q, answer: followUp.a }] : [];
};

// ============ THE SESSION ============

/** Exercises after the teaching cards, at most. */
export const MAX_EXERCISES = 8;

/**
 * The cards for one lesson, in the order they are played: the idea and its
 * words first, then exercises from recognising (match, spot the mistake) to
 * producing (order, type the word, write SQL), with one question to recall.
 */
/**
 * A lesson's quick practice: the idea and its new words, then the questions.
 * (The guess before learning is part of "Learn it step by step", below.)
 */
export const buildSession = (course: Course, topic: AnyTopic, sources: SessionSources): PracticeCard[] => {
    const lesson = lessonText(topic);
    const teach: PracticeCard[] = [ideaCard(lesson), ...wordsCard(topic, sources.glossary)];
    const match = matchCard(topic, sources.glossary);
    const matched = new Set(match.flatMap(card => card.pairs.map(pair => pair.key)));
    const order = orderCard(lesson);
    if (course === 'sql') {
        const sql = sqlPracticeCards(topic as SqlTopic, sources.sqlAnswers?.[topic.id]);
        const exercises = [...match, ...blankCards(topic, lesson, sources.glossary, 1, matched), ...sql, ...order];
        return [...teach, ...exercises.slice(0, MAX_EXERCISES)];
    }
    const blanks = blankCards(topic, lesson, sources.glossary, 2, matched);
    const exercises = [...match, ...mistakeCard(lesson), ...order, ...blanks.slice(0, 1), ...recallCard(lesson), ...blanks.slice(1)];
    return [...teach, ...exercises.slice(0, MAX_EXERCISES)];
};

/**
 * SQL: add a "fix the query" card after the first writing card, made from its
 * answer with one bug in (sql.ts). `run` runs a query on the practice database;
 * it is passed in because the database engine loads only when it is needed.
 */
export const withFixCard = (cards: PracticeCard[], run: (sql: string) => SqlResultTable): PracticeCard[] => {
    const at = cards.findIndex(card => card.kind === 'write');
    if (at < 0) return cards;
    const fix = sqlFixCard(cards[at] as WriteCard, run);
    if (!fix) return cards;
    const out = [...cards.slice(0, at + 1), fix, ...cards.slice(at + 1)];
    // Keep the session to its usual length: drop the last exercise if needed.
    const exercises = out.filter(card => !isTeaching(card)).length;
    return exercises > MAX_EXERCISES ? out.slice(0, -1) : out;
};

/**
 * "Learn it step by step": the whole lesson inside practice. A guess first,
 * then each part of the lesson (why it matters, the idea, how it works, a
 * comparison, a worked example, what to remember, the common mistakes), each
 * followed by the question that checks it. Learning in small parts with a
 * question after each works better than reading it all, then testing
 * (interpolated testing). The questions are the same as the quick practice's.
 */
export const buildLearnSession = (course: Course, topic: AnyTopic, sources: SessionSources): PracticeCard[] => {
    const lesson = lessonText(topic);
    const quick = buildSession(course, topic, sources);
    const words = quick.filter(card => card.kind === 'words');
    const exercises = quick.filter(card => !isTeaching(card));
    /** Take the next exercise of one of these kinds out of the list (`all`: every one). */
    const take = (kinds: PracticeCard['kind'][], all = true) => {
        const taken = exercises.filter(card => kinds.includes(card.kind)).slice(0, all ? undefined : 1);
        for (const card of taken) exercises.splice(exercises.indexOf(card), 1);
        return taken;
    };
    const outline = lessonOutline(topic);
    const read = (slot: LessonSlot): ReadCard[] =>
        outline.filter(part => part.slot === slot).map((part, i) => ({ kind: 'read', id: `${topic.id}-read-${slot}${i ? `-${i + 1}` : ''}`, part }));
    // The comparison has its own part here, so the idea card shows just the idea and its picture.
    const idea: IdeaCard = { ...ideaCard(lesson), analogy: undefined };
    return [
        ...guessCard(lesson),
        ...read('why'),
        idea,
        ...read('idea'),
        ...words,
        ...take(['match']),
        ...read('steps'),
        ...take(['order']),
        ...read('analogy'),
        ...read('example'),
        ...take(['blank'], false),
        ...take(['predict', 'write']),
        ...read('facts'),
        ...read('mistakes'),
        ...take(['mistake']),
        // What is left: the recall question, a second gap to fill.
        ...exercises,
    ];
};
