import { createContext, useContext } from 'react';
import type { Course } from '../../services/progress';
import type { Prose } from '../learning/glossaryContext';

/** What every card of a session can reach: its course, its lesson, and the glossary's tap-to-explain words. */
export interface PracticeSetting {
    course: Course;
    topicId: string;
    /** Text with its glossary words marked, so a hard word can be tapped for its meaning. */
    prose: (text: string) => Prose;
}

export const PracticeContext = createContext<PracticeSetting>({ course: 'foundations', topicId: '', prose: text => text });

export const usePractice = () => useContext(PracticeContext);
