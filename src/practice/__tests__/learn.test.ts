// "Learn it step by step": every lesson taught part by part inside practice,
// with the question that checks each part right after it.

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
import { buildLearnSession, buildSession, type AnyTopic, type PracticeGlossary } from '../build';
import { isTeaching, type PracticeCard } from '../cards';
import { lessonOutline } from '../lesson';

const adapt = <T extends AnyTopic>(glossary: GlossarySource<T>): PracticeGlossary => ({
    terms: glossary.terms,
    getTerm: id => glossary.getTerm(id),
    segmentText: text => glossary.segmentText(text),
    termsIn: topic => glossary.termsInTopic(topic as T),
    newWordsIn: topic => glossary.newWordsForTopic(topic as T),
});

const all = ([
    ['foundations', allFoundationTopics, adapt(foundationsGlossary)],
    ['sql', allSqlTopics, adapt(sqlGlossary)],
    ['system_design', allSystemDesignTopics, adapt(systemDesignGlossary)],
] as [Course, AnyTopic[], PracticeGlossary][]).flatMap(([course, topics, glossary]) => topics.map(topic => ({ course, topic, glossary })));

const at = (cards: PracticeCard[], test: (card: PracticeCard) => boolean) => cards.findIndex(test);

describe('every lesson, step by step', () => {
    it('has the parts a lesson teaches: why it matters, how it works, and the mistakes to avoid', () => {
        for (const { topic } of all) {
            const slots = lessonOutline(topic).map(part => part.slot);
            expect(slots, topic.id).toContain('why');
            expect(slots, topic.id).toContain('mistakes');
            expect(slots.includes('steps') || slots.includes('example'), topic.id).toBe(true);
        }
    });

    it('teaches each part, then checks it, with the same questions as the quick practice', () => {
        for (const { course, topic, glossary } of all) {
            const learn = buildLearnSession(course, topic, { glossary, sqlAnswers });
            const quick = buildSession(course, topic, { glossary, sqlAnswers });
            // The same questions, none lost and none added.
            expect(learn.filter(c => !isTeaching(c)).map(c => c.id).sort(), topic.id).toEqual(quick.filter(c => !isTeaching(c)).map(c => c.id).sort());
            // Every part of the lesson is taught.
            expect(learn.filter(c => c.kind === 'read').length, topic.id).toBe(lessonOutline(topic).length);
            // A guess first, then why it matters, before anything is asked.
            expect(learn[0].kind, topic.id).toBe('guess');
            const firstQuestion = at(learn, c => !isTeaching(c));
            expect(at(learn, c => c.kind === 'read' && c.part.slot === 'why'), topic.id).toBeLessThan(firstQuestion);
            // Each check comes after the part it checks.
            const stepsAt = at(learn, c => c.kind === 'read' && c.part.slot === 'steps');
            const orderAt = at(learn, c => c.kind === 'order');
            if (stepsAt >= 0 && orderAt >= 0) expect(orderAt, topic.id).toBe(stepsAt + 1);
            const mistakesAt = at(learn, c => c.kind === 'read' && c.part.slot === 'mistakes');
            const spotAt = at(learn, c => c.kind === 'mistake');
            if (spotAt >= 0) expect(spotAt, topic.id).toBe(mistakesAt + 1);
            // The comparison is taught in its own part, not twice.
            const idea = learn.find(c => c.kind === 'idea');
            if (idea?.kind === 'idea' && lessonOutline(topic).some(p => p.slot === 'analogy')) expect(idea.analogy, topic.id).toBeUndefined();
        }
    }, 60_000);
});
