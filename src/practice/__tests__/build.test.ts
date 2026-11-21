import { beforeAll, describe, expect, it } from 'vitest';
import initSqlJs, { type SqlJsStatic } from 'sql.js';
import { allFoundationTopics } from '../../data/foundations';
import { allSqlTopics } from '../../data/sql';
import { allSystemDesignTopics } from '../../data/systemDesign';
import { sqlAnswers } from '../../data/sqlAnswers';
import { foundationsGlossary } from '../../utils/foundationsGlossary';
import { sqlGlossary } from '../../utils/sqlGlossary';
import { systemDesignGlossary } from '../../utils/glossary';
import type { GlossarySource } from '../../utils/glossaryEngine';
import { runOnPracticeDb } from '../../utils/sqlRunner';
import type { Course } from '../../services/progress';
import { buildSession, isNote, isSweeping, lessonText, sentencesOf, withFixCard, type AnyTopic, type PracticeGlossary } from '../build';
import { isChecked, isTeaching, type PracticeCard } from '../cards';
import { compareResults } from '../sql';
import { isTypable, nextSlot, sameLetter, slotsFor } from '../typing';

let SQL: SqlJsStatic;
beforeAll(async () => {
    SQL = await initSqlJs();
});

const adapt = <T extends AnyTopic>(glossary: GlossarySource<T>): PracticeGlossary => ({
    terms: glossary.terms,
    getTerm: id => glossary.getTerm(id),
    segmentText: (text, topicId) => glossary.segmentText(text, topicId),
    termsIn: topic => glossary.termsInTopic(topic as T),
    newWordsIn: topic => glossary.newWordsForTopic(topic as T),
});

const courses: { course: Course; topics: AnyTopic[]; glossary: PracticeGlossary }[] = [
    { course: 'foundations', topics: allFoundationTopics, glossary: adapt(foundationsGlossary) },
    { course: 'sql', topics: allSqlTopics, glossary: adapt(sqlGlossary) },
    { course: 'system_design', topics: allSystemDesignTopics, glossary: adapt(systemDesignGlossary) },
];

const sessions = courses.flatMap(({ course, topics, glossary }) =>
    topics.map(topic => ({ course, topic, glossary, cards: buildSession(course, topic, { glossary, sqlAnswers }) })),
);
const cardsOf = <K extends PracticeCard['kind']>(kind: K) =>
    sessions.flatMap(({ topic, cards }) => cards.filter((card): card is Extract<PracticeCard, { kind: K }> => card.kind === kind).map(card => ({ topic, card })));

const flat = (text: string) => text.replace(/\s+/g, ' ').trim();

describe('a practice session for every lesson', () => {
    it('teaches first, then has enough exercises, with no card twice', () => {
        expect(sessions).toHaveLength(234);
        for (const { course, topic, cards } of sessions) {
            expect(cards[0].kind, topic.id).toBe('idea');
            const firstExercise = cards.findIndex(card => !isTeaching(card));
            expect(cards.slice(firstExercise).some(isTeaching), topic.id).toBe(false);
            const exercises = cards.filter(card => !isTeaching(card)).length;
            expect(exercises, `${topic.id} has ${exercises} exercises`).toBeGreaterThanOrEqual(course === 'sql' ? 3 : 5);
            expect(exercises).toBeLessThanOrEqual(8);
            expect(new Set(cards.map(card => card.id)).size, topic.id).toBe(cards.length);
        }
    });

    it('is the same every time it is built', () => {
        const { course, topic, glossary } = sessions[10];
        expect(buildSession(course, topic, { glossary, sqlAnswers })).toEqual(sessions[10].cards);
    });

    it('mixes several kinds of exercise in most sessions', () => {
        const varied = sessions.filter(({ cards }) => new Set(cards.filter(isChecked).map(card => card.kind)).size >= 3);
        expect(varied.length).toBeGreaterThanOrEqual(220);
    });
});

describe('cards come from the lesson, and are fair', () => {
    it('new words: two or three, never the word the lesson itself teaches', () => {
        for (const { topic, card } of cardsOf('words')) {
            expect(card.words.length).toBeGreaterThanOrEqual(2);
            expect(card.words.length).toBeLessThanOrEqual(3);
            const glossary = sessions.find(s => s.topic === topic)!.glossary;
            const own = glossary.terms.filter(term => term.taughtIn === topic.id).map(term => term.term);
            for (const word of card.words) expect(own, topic.id).not.toContain(word.term);
        }
    });

    it('match the pairs: three or four different words and meanings, shuffled', () => {
        const all = cardsOf('match');
        expect(all.length).toBeGreaterThanOrEqual(225);
        for (const { topic, card } of all) {
            expect(card.pairs.length, topic.id).toBeGreaterThanOrEqual(3);
            expect(new Set(card.pairs.map(pair => pair.term.toLowerCase())).size).toBe(card.pairs.length);
            expect(new Set(card.pairs.map(pair => pair.meaning)).size).toBe(card.pairs.length);
            expect([...card.termOrder].sort()).toEqual(card.pairs.map(pair => pair.key).sort());
            expect([...card.meaningOrder].sort()).toEqual(card.pairs.map(pair => pair.key).sort());
            for (const pair of card.pairs) expect(pair.meaning.toLowerCase(), `${topic.id} ${pair.term}`).not.toContain(pair.term.toLowerCase());
        }
    });

    it('fill the gap: a real sentence of the lesson, its word typable, not given away by the rest or the clue', () => {
        const all = cardsOf('blank');
        expect(all.length).toBeGreaterThanOrEqual(300);
        for (const { topic, card } of all) {
            const lesson = lessonText(topic);
            const sentence = flat(card.before + card.answer + card.after);
            const sources = [lesson.definition, ...lesson.facts, ...lesson.steps].flatMap(sentencesOf).map(flat);
            expect(sources, `${topic.id}: ${sentence}`).toContain(sentence);
            expect(isTypable(card.answer), card.answer).toBe(true);
            const word = new RegExp(`\\b${card.answer.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`, 'i');
            expect(word.test(card.before + ' ' + card.after), `${topic.id}: "${card.answer}" also in "${sentence}"`).toBe(false);
            expect(word.test(card.clue), `${topic.id}: clue gives "${card.answer}" away`).toBe(false);
        }
    });

    it('splits sentences at their end, not at a dot inside a number or a name', () => {
        expect(sentencesOf('An array of True/False values used to pick out items, like A[A > 0.5]. Masks make copies.')).toEqual([
            'An array of True/False values used to pick out items, like A[A > 0.5].',
            'Masks make copies.',
        ]);
        expect(sentencesOf('model.eval() switches dropout to its testing behaviour.')).toHaveLength(1);
        expect(sentencesOf('Use a tolerance, e.g. 1e-6. Then compare. (Biases can start at 0.) Done!')).toEqual([
            'Use a tolerance, e.g. 1e-6.',
            'Then compare.',
            '(Biases can start at 0.)',
            'Done!',
        ]);
    });

    it('a meaning or a clue is a whole sentence, never one cut short', () => {
        const whole = (text: string) => text.length >= 12 && (text.match(/[([]/g) ?? []).length === (text.match(/[)\]]/g) ?? []).length;
        for (const { topic, card } of cardsOf('match')) for (const pair of card.pairs) expect(whole(pair.meaning), `${topic.id}: "${pair.meaning}"`).toBe(true);
        for (const { topic, card } of cardsOf('blank')) expect(whole(card.clue), `${topic.id}: "${card.clue}"`).toBe(true);
    });

    it('fill the gap can be answered by choosing: the word among other words of the lesson, none containing it', () => {
        for (const { topic, card } of cardsOf('blank')) {
            expect(card.choices, topic.id).toContain(card.answer);
            expect(card.choices.length, topic.id).toBeGreaterThanOrEqual(2);
            expect(new Set(card.choices.map(word => word.toLowerCase())).size, topic.id).toBe(card.choices.length);
            for (const word of card.choices) {
                if (word !== card.answer) expect(word.toLowerCase().includes(card.answer.toLowerCase()), `${topic.id}: ${word}`).toBe(false);
            }
        }
        expect(cardsOf('blank').filter(({ card }) => card.choices.length === 4).length).toBeGreaterThan(cardsOf('blank').length * 0.9);
    });

    it("no repeats: a gap's word is rarely one already matched, or the definition the idea card showed", () => {
        let repeatsWord = 0;
        let repeatsDefinition = 0;
        for (const { topic, cards } of sessions) {
            const matched = cards.flatMap(card => (card.kind === 'match' ? card.pairs.map(pair => pair.term.toLowerCase()) : []));
            for (const card of cards) {
                if (card.kind !== 'blank') continue;
                const answer = card.answer.toLowerCase();
                // The same word, or its plural.
                if (matched.some(term => [term, `${term}s`, `${term}es`].includes(answer) || `${answer}s` === term)) repeatsWord++;
                if (flat(card.before + card.answer + card.after) === flat(lessonText(topic).definition)) repeatsDefinition++;
            }
        }
        // Only in lessons with nothing else that fits (few glossary words).
        expect(repeatsWord).toBeLessThanOrEqual(15);
        expect(repeatsDefinition).toBeLessThanOrEqual(15);
    });

    it('put the steps in order: consecutive steps of the lesson, shown out of order, with no alternatives in the run', () => {
        const all = cardsOf('order');
        expect(all.length).toBeGreaterThanOrEqual(150);
        for (const { topic, card } of all) {
            const steps = lessonText(topic).steps.map(step => step.trim());
            const start = steps.indexOf(card.steps[0]);
            expect(start, topic.id).toBeGreaterThanOrEqual(0);
            expect(steps.slice(start, start + card.steps.length)).toEqual(card.steps);
            expect([...card.shown].sort()).toEqual(card.steps.map((_, i) => i));
            expect(card.shown.every((value, i) => value === i), topic.id).toBe(false);
            for (const step of card.steps) expect(step, topic.id).not.toMatch(/^(hit|miss|if|otherwise|with|or)\b/i);
        }
    });

    it('spot the mistake: one false statement, written for the lesson, among true key points; the answer says what is true', () => {
        const all = cardsOf('mistake');
        const seen = new Map<string, number>();
        for (const { topic, card } of all) {
            const lesson = lessonText(topic);
            const wrong = card.options.filter(option => option.mistake);
            expect(wrong).toHaveLength(1);
            // True statements are the lesson's key points, or sentences of its one-line definition.
            for (const option of card.options) if (!option.mistake) expect([...lesson.facts, ...sentencesOf(lesson.definition)], topic.id).toContain(option.text);
            // The lesson's first false statement on the first card, its second on the second: never a
            // listed mistake ("Forgetting to…"), which could be picked out by its wording alone.
            const nth = seen.get(topic.id) ?? 0;
            seen.set(topic.id, nth + 1);
            expect(lesson.myths[nth], `${topic.id} needs a false statement for card ${nth + 1}`).toBeDefined();
            expect(wrong[0].text, topic.id).toBe(lesson.myths[nth].claim);
            expect(card.why, topic.id).toBe(lesson.myths[nth].truth);
        }
        expect(seen.size, 'lessons whose practice asks for the false statement').toBe(sessions.length);
    });

    it('the false statement can\'t be found by its look: it is written like the true ones beside it', () => {
        for (const { topic, card } of cardsOf('mistake')) {
            const wrong = card.options.find(option => option.mistake)!.text;
            const right = card.options.filter(option => !option.mistake).map(option => option.text);
            // A note ("Cache: fast memory…", a formula) among notes, a plain sentence among plain sentences.
            const alike = right.filter(text => isNote(text) === isNote(wrong)).length;
            expect(alike, `${topic.id}: "${wrong}" is the only ${isNote(wrong) ? 'note' : 'plain sentence'} on its card`).toBeGreaterThanOrEqual(right.length >= 3 ? 2 : 1);
            // "Always", "never", "every": if the false statement is sweeping, a true one beside it is too.
            if (isSweeping(wrong)) expect(right.some(isSweeping), `${topic.id}: only the false statement is sweeping: "${wrong}"`).toBe(true);
        }
    });

    it('every lesson has a false statement that reads like a key point, with the truth beside it', () => {
        for (const { topic } of sessions) {
            const lesson = lessonText(topic);
            expect(lesson.myths.length, topic.id).toBeGreaterThanOrEqual(1);
            for (const { claim, truth } of lesson.myths) {
                // Short enough for a card, and a full sentence: a learner must not spot it by its shape.
                expect(claim.length, `${topic.id}: ${claim}`).toBeGreaterThanOrEqual(20);
                expect(claim.length, `${topic.id}: ${claim}`).toBeLessThanOrEqual(170);
                expect(claim, topic.id).toMatch(/[.!?]$/);
                expect(claim, `${topic.id} is an instruction, not a statement`).not.toMatch(/^(?:Not|Never|No|Don't|Do not)\b/);
                expect([...lesson.facts, ...lesson.mistakes], topic.id).not.toContain(claim);
                expect(truth.length, `${topic.id}: ${truth}`).toBeGreaterThanOrEqual(40);
                expect(truth.length, `${topic.id}: ${truth}`).toBeLessThanOrEqual(230);
            }
            expect(new Set(lesson.myths.map(myth => myth.claim)).size, topic.id).toBe(lesson.myths.length);
        }
    });

    it('remember it: one of the lesson\'s own follow-up questions', () => {
        for (const { topic, card } of cardsOf('recall')) {
            expect(lessonText(topic).followUps.some(f => f.q === card.question && f.a === card.answer), topic.id).toBe(true);
        }
    });
});

describe('fix the query', () => {
    it('puts a bug in a working answer that still runs but gives other rows, and the answer fixes it', () => {
        let made = 0;
        for (const { topic, cards } of sessions.filter(session => session.course === 'sql')) {
            const withFix = withFixCard(cards, sql => runOnPracticeDb(SQL, sql));
            const fix = withFix.find((card): card is Extract<PracticeCard, { kind: 'fix' }> => card.kind === 'fix');
            if (!fix) continue;
            made++;
            const broken = runOnPracticeDb(SQL, fix.brokenSql);
            expect(compareResults(broken, fix.expected, fix.order).ok, `${topic.id}: the bug changes nothing`).toBe(false);
            expect(compareResults(runOnPracticeDb(SQL, fix.answerSql), fix.expected, fix.order).ok, topic.id).toBe(true);
            expect(fix.brokenSql).not.toBe(fix.answerSql);
            expect(withFix.filter(card => !isTeaching(card)).length).toBeLessThanOrEqual(8);
        }
        expect(made).toBeGreaterThanOrEqual(25);
    });
});

describe('typing letter by letter', () => {
    it('fills in spaces and hyphens, and checks letters without caring about capitals or accents', () => {
        const slots = slotsFor("learning-rate's x");
        expect(slots.filter(slot => slot.given).map(slot => slot.char)).toEqual(['-', "'", ' ']);
        expect(nextSlot(slots, 8)).toBe(9);
        expect(sameLetter('R', 'r')).toBe(true);
        expect(sameLetter('e', 'é')).toBe(true);
        expect(sameLetter('a', 'b')).toBe(false);
        expect(sameLetter('ab', 'a')).toBe(false);
    });

    it('only asks for words that can be typed on any keyboard', () => {
        expect(isTypable('learning rate')).toBe(true);
        expect(isTypable('k-means')).toBe(true);
        expect(isTypable('η')).toBe(false);
        expect(isTypable('GROUP BY')).toBe(true);
        expect(isTypable('O(1)')).toBe(false);
        expect(isTypable('ab')).toBe(false);
    });
});
