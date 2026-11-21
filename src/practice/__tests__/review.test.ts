// Learning before questions, and the cards of a review, built from the real lessons.

import { describe, expect, it } from 'vitest';
import { allFoundationTopics } from '../../data/foundations';
import { allSqlTopics } from '../../data/sql';
import { allSystemDesignTopics } from '../../data/systemDesign';
import { sqlAnswers } from '../../data/sqlAnswers';
import { foundationsGlossary } from '../../utils/foundationsGlossary';
import { sqlGlossary } from '../../utils/sqlGlossary';
import { systemDesignGlossary } from '../../utils/glossary';
import type { GlossarySource } from '../../utils/glossaryEngine';
import type { Course } from '../../services/progress';
import { buildLearnSession, buildSession, interviewCard, lessonText, mistakeCards, sentencesOf, type AnyTopic, type PracticeGlossary } from '../build';
import { isTeaching, type PracticeCard } from '../cards';
import { CARDS_PER_LESSON, buildReview, pickForLesson } from '../review';
import type { DueLesson } from '../../game/review';

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
const all = courses.flatMap(({ course, topics, glossary }) => topics.map(topic => ({ course, topic, glossary })));

/** A lesson's cards as a review sees them: its session, and its interview question. */
const cardsOf = ({ course, topic, glossary }: (typeof all)[number]): PracticeCard[] => [
    ...buildSession(course, topic, { glossary, sqlAnswers }),
    ...interviewCard(lessonText(topic)),
];

describe('learn first, then questions', () => {
    it('never asks before it has taught: every session opens with teaching, and no card is a guess', () => {
        for (const { course, topic, glossary } of all) {
            const learn = buildLearnSession(course, topic, { glossary, sqlAnswers });
            const quick = buildSession(course, topic, { glossary, sqlAnswers });
            expect(isTeaching(learn[0]), topic.id).toBe(true);
            expect(quick[0].kind, topic.id).toBe('idea');
            for (const card of [...learn, ...quick]) expect(card.kind, topic.id).not.toBe('guess');
            // A lesson's mistakes are only asked about once its "Common mistakes" part has been read.
            const taught = learn.findIndex(c => c.kind === 'read' && c.part.slot === 'mistakes');
            learn.forEach((card, i) => {
                if (card.kind === 'mistake') expect(i, topic.id).toBeGreaterThan(taught);
            });
        }
        // Builds every lesson's practice: give slower machines (like GitHub's) time.
    }, 60_000);

    it('"spot the mistake" is one of the lesson\'s false statements among its real key points, and two cards never share a statement', () => {
        let lessonsWithTwo = 0;
        for (const { topic } of all) {
            const lesson = lessonText(topic);
            const cards = mistakeCards(lesson);
            expect(cards.length, topic.id).toBeLessThanOrEqual(2);
            if (cards.length === 2) lessonsWithTwo++;
            const seen: string[] = [];
            for (const card of cards) {
                expect(card.options.filter(o => o.mistake).length, topic.id).toBe(1);
                expect(card.options.length, topic.id).toBeGreaterThanOrEqual(3);
                for (const option of card.options) {
                    expect(option.mistake ? lesson.myths.map(myth => myth.claim) : [...lesson.facts, ...sentencesOf(lesson.definition)], topic.id).toContain(option.text);
                    expect(seen, topic.id).not.toContain(option.text);
                    seen.push(option.text);
                }
            }
        }
        // Most lessons have enough key points, and a second false statement, for a second card.
        expect(lessonsWithTwo).toBeGreaterThan(all.length / 2);
    });
});

describe('interview-level questions', () => {
    it("every lesson has one for its later reviews: a course interview question about it, or a follow-up the practice doesn't ask", () => {
        const missing = all.filter(lesson => interviewCard(lessonText(lesson.topic)).length === 0).map(l => l.topic.id);
        expect(missing.length).toBeLessThanOrEqual(16);
        const asked = interviewCard(lessonText(all[0].topic), [{ q: 'Why does this matter?', answer: 'Because.', topicIds: [all[0].topic.id] }]);
        expect(asked[0]).toMatchObject({ question: 'Why does this matter?', interview: true });
    });
});

describe('a review', () => {
    const lesson = (topicId: string, step: number, missed: string[] = []): DueLesson => ({ topicId, due: '2026-11-21', step, missed });
    const byId = new Map(all.map(l => [l.topic.id, l]));
    const cardsFor = (topicId: string) => cardsOf(byId.get(topicId)!);
    const mlIds = allFoundationTopics.slice(10, 16).map(t => t.id);

    it('takes two cards from each of up to five lessons, mixed in turns, and never a teaching card', () => {
        const items = buildReview(mlIds.map(id => lesson(id, 0)), cardsFor, '2026-11-21');
        expect(items).toHaveLength(5 * CARDS_PER_LESSON);
        expect(items.slice(0, 5).map(i => i.topicId)).toEqual(mlIds.slice(0, 5));
        expect(items.slice(5).map(i => i.topicId)).toEqual(mlIds.slice(0, 5));
        expect(items.some(i => isTeaching(i.card))).toBe(false);
    });

    it('brings back the cards missed last time first', () => {
        const id = mlIds[0];
        const order = cardsFor(id).find(c => c.kind === 'order')!;
        expect(pickForLesson(lesson(id, 0, [order.id]), cardsFor(id), '2026-11-21')[0].id).toBe(order.id);
    });

    it('gets harder each time: recognise, then recall, then the interview question', () => {
        const kinds = (step: number) => new Set(mlIds.flatMap(id => pickForLesson(lesson(id, step), cardsFor(id), '2026-11-21')).map(c => (c.kind === 'recall' && c.interview ? 'interview' : c.kind)));
        expect([...kinds(0)].every(k => ['match', 'blank', 'mistake', 'order', 'predict'].includes(k))).toBe(true);
        expect(kinds(2).has('recall')).toBe(true);
        expect(kinds(4).has('interview')).toBe(true);
    });

    it('is the same all day, and a different mix another day', () => {
        const day = (d: string) => mlIds.flatMap(id => pickForLesson(lesson(id, 0), cardsFor(id), d).map(c => c.id)).join();
        expect(day('2026-11-21')).toBe(day('2026-11-21'));
        expect(['2026-11-22', '2026-11-23', '2026-11-24'].some(d => day(d) !== day('2026-11-21'))).toBe(true);
    });
});
