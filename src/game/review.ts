// Spaced review: a practised lesson comes back for a short review just as it
// would start to fade, at growing gaps (1, 3, 7, 14, 30, then 60 days). All
// right first time moves it to the next gap; any miss brings it back tomorrow,
// with the cards that were missed. This spacing is what makes learning last
// (Cepeda et al., 2006; Dunlosky et al., 2013), and Duolingo is built on it.
//
// The step also sets how hard the review is (src/practice/review.ts): early
// reviews ask to recognise, later ones to recall, the last ones interview-style.

import type { Course, PracticeRecord } from '../services/progress';
import { daysBefore } from './day';

/** Days until the next review, by step. */
export const INTERVALS = [1, 3, 7, 14, 30, 60];

export const addDays = (day: string, n: number) => daysBefore(day, -n);

/** How a lesson did in a practice or review: every card right first time, and which were not. */
export interface ReviewOutcome {
    allFirstTry: boolean;
    missed: string[];
}

export interface Schedule {
    due: string;
    step: number;
    missed: string[];
}

/** The next review after a practice or review on `today`. */
export const scheduleAfter = (record: Partial<PracticeRecord> | undefined, outcome: ReviewOutcome, today: string): Schedule => {
    // A first practice starts at step 0 (back tomorrow). After that, all right moves up a step; a miss starts again.
    const reviewed = record?.due !== undefined;
    const step = !reviewed || !outcome.allFirstTry ? 0 : Math.min((record.step ?? 0) + 1, INTERVALS.length - 1);
    return { due: addDays(today, INTERVALS[step]), step, missed: outcome.allFirstTry ? [] : outcome.missed };
};

/** A lesson waiting for review. */
export interface DueLesson {
    topicId: string;
    due: string;
    step: number;
    missed: string[];
}

/** When a lesson is due. Practised before reviews existed: the day after it was practised. */
const dueOf = (record: PracticeRecord) => record.due ?? addDays(record.last, 1);

/** Every practised lesson of a course with its next review, soonest first. */
export const scheduledLessons = (practice: Record<string, PracticeRecord> | undefined): DueLesson[] =>
    Object.entries(practice ?? {})
        .filter(([, record]) => typeof record?.last === 'string')
        .map(([topicId, record]) => ({ topicId, due: dueOf(record), step: record.step ?? 0, missed: Array.isArray(record.missed) ? record.missed : [] }))
        .sort((a, b) => a.due.localeCompare(b.due) || a.topicId.localeCompare(b.topicId));

/** The lessons due for review on `today`, most overdue first. */
export const dueLessons = (practice: Record<string, PracticeRecord> | undefined, today: string): DueLesson[] =>
    scheduledLessons(practice).filter(lesson => lesson.due <= today);

/** Lessons in one review: enough to mix, short enough for about five minutes. */
export const LESSONS_PER_REVIEW = 5;

export interface CourseReviews {
    course: Course;
    due: DueLesson[];
    /** When the next lessons come back, if none is due now. */
    next?: { day: string; count: number };
}

/** For each course with practised lessons: what is due now, and what comes next. */
export const reviewsByCourse = (practiceByCourse: Partial<Record<Course, Record<string, PracticeRecord> | undefined>>, today: string): CourseReviews[] =>
    (Object.entries(practiceByCourse) as [Course, Record<string, PracticeRecord> | undefined][])
        .map(([course, practice]) => {
            const all = scheduledLessons(practice);
            const due = all.filter(lesson => lesson.due <= today);
            const later = all.filter(lesson => lesson.due > today);
            const next = later.length ? { day: later[0].due, count: later.filter(lesson => lesson.due === later[0].due).length } : undefined;
            return { course, due, ...(next ? { next } : {}) };
        })
        .filter(reviews => reviews.due.length > 0 || reviews.next);
