import { createContext, useContext } from 'react';
import type { Course } from '../../services/progress';
import type { Prose } from '../learning/glossaryContext';
import type { Guide } from './guides';

/** What every card of a session can reach: its course, its lesson, its guide, and the glossary's tap-to-explain words. */
export interface PracticeSetting {
    course: Course;
    topicId: string;
    guide: Guide;
    /** Text with its glossary words marked, so a hard word can be tapped for its meaning. */
    prose: (text: string) => Prose;
}

export const PracticeContext = createContext<PracticeSetting>({ course: 'foundations', topicId: '', guide: 'pia', prose: text => text });

export const usePractice = () => useContext(PracticeContext);
