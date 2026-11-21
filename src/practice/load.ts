// What a practice session needs from a course, loaded only when practice
// starts: its lessons, its glossary and (for SQL) the practice answers. The
// home page stays small, and the course pages share these chunks.

import type { SqlTopicAnswers } from '../data/sql';
import type { Course } from '../services/progress';
import type { GlossarySource } from '../utils/glossaryEngine';
import type { PageGlossary } from '../components/learning/glossaryContext';
import type { AnimationLoader } from '../components/learning/anim/useTopicAnimation';
import type { AnyTopic, PracticeGlossary } from './build';

export interface PracticeSources {
    course: Course;
    findTopic: (id: string) => AnyTopic | undefined;
    glossary: PracticeGlossary;
    /** The same glossary, for the tap-to-explain words in the cards. */
    pageGlossary: PageGlossary;
    sqlAnswers?: Record<string, SqlTopicAnswers>;
}

/** A course's glossary, as practice uses it for any of the course's lessons. */
const practiceGlossary = <T extends AnyTopic>(glossary: GlossarySource<T>): PracticeGlossary => ({
    terms: glossary.terms,
    getTerm: id => glossary.getTerm(id),
    segmentText: text => glossary.segmentText(text),
    termsIn: topic => glossary.termsInTopic(topic as T),
    newWordsIn: topic => glossary.newWordsForTopic(topic as T),
});

const sources = <T extends AnyTopic>(course: Course, topics: T[], glossary: GlossarySource<T>, sqlAnswers?: Record<string, SqlTopicAnswers>): PracticeSources => ({
    course,
    findTopic: id => topics.find(topic => topic.id === id),
    glossary: practiceGlossary(glossary),
    pageGlossary: glossary,
    ...(sqlAnswers ? { sqlAnswers } : {}),
});

export const loadPracticeSources = async (course: Course): Promise<PracticeSources> => {
    switch (course) {
        case 'foundations': {
            const [{ allFoundationTopics }, { foundationsGlossary }] = await Promise.all([import('../data/foundations'), import('../utils/foundationsGlossary')]);
            return sources(course, allFoundationTopics, foundationsGlossary);
        }
        case 'sql': {
            const [{ allSqlTopics }, { sqlGlossary }, { sqlAnswers }] = await Promise.all([
                import('../data/sql'),
                import('../utils/sqlGlossary'),
                import('../data/sqlAnswers'),
            ]);
            return sources(course, allSqlTopics, sqlGlossary, sqlAnswers);
        }
        case 'system_design': {
            const [{ allSystemDesignTopics }, { systemDesignGlossary }] = await Promise.all([import('../data/systemDesign'), import('../utils/glossary')]);
            return sources(course, allSystemDesignTopics, systemDesignGlossary);
        }
    }
};

/** Each course's animations, loaded with the first idea card that shows one. */
export const ANIMATIONS: Record<Course, AnimationLoader> = {
    foundations: () => import('../data/foundationsAnimations').then(m => m.foundationAnimations),
    sql: () => import('../data/sqlAnimations').then(m => m.sqlAnimations),
    system_design: () => import('../data/systemDesignAnimations').then(m => m.systemDesignAnimations),
};
