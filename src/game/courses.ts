// The three courses as the learning path sees them: phases ("units") of
// topics, in the order they are meant to be taken.

import type { Course } from '../services/progress';
// Generated from the lessons by `npm run path-index` (also run by `npm run build`).
import pathIndex from './pathIndex.json';

export interface PathTopic {
    id: string;
    name: string;
    /** One sentence: what it is. */
    definition: string;
    /** Why it exists: the problem it solves. Used as the "up next" teaser. */
    problem: string;
}

export interface PathUnit {
    id: string;
    number: number;
    title: string;
    short: string;
    accent: string;
    goal: string;
    topics: PathTopic[];
}

export interface CourseInfo {
    id: Course;
    route: string;
    title: string;
    tagline: string;
    colour: string;
    checkNames: string[];
    units: PathUnit[];
}

const toUnits = (phases: { id: string; number: number; title: string; short: string; accent: string; goal: string; topics: PathTopic[] }[]): PathUnit[] =>
    phases.map(phase => ({
        id: phase.id,
        number: phase.number,
        title: phase.title,
        short: phase.short,
        accent: phase.accent,
        goal: phase.goal,
        topics: phase.topics.map(({ id, name, definition, problem }) => ({ id, name, definition, problem })),
    }));

export const COURSES: CourseInfo[] = [
    {
        id: 'foundations',
        route: '/foundations',
        title: 'ML Foundations',
        tagline: 'Maths, machine learning, deep learning and LLMs, from scratch.',
        colour: '#b39ddb',
        checkNames: ['Explain', 'Derive', 'Build', 'Break'],
        units: toUnits(pathIndex.foundations),
    },
    {
        id: 'sql',
        route: '/sql',
        title: 'SQL',
        tagline: 'From your first SELECT to window functions and interview problems.',
        colour: '#f48fb1',
        checkNames: ['Explain', 'Write', 'Predict', 'Edge cases'],
        units: toUnits(pathIndex.sql),
    },
    {
        id: 'system_design',
        route: '/system-design',
        title: 'System Design',
        tagline: 'The building blocks, then real designs, the way interviews ask them.',
        colour: '#4dd0e1',
        checkNames: ['Explain', 'Draw', 'Apply', 'Trade-offs'],
        units: toUnits(pathIndex.system_design),
    },
];

export const courseById = (id: Course): CourseInfo => COURSES.find(course => course.id === id)!;

export const allTopicsOf = (course: CourseInfo): PathTopic[] => course.units.flatMap(unit => unit.topics);

/** The unit a topic belongs to. */
export const unitOf = (course: CourseInfo, topicId: string): PathUnit | undefined =>
    course.units.find(unit => unit.topics.some(topic => topic.id === topicId));

const LAST_COURSE_KEY = 'aep:v1:last-course';

export const readLastCourse = (): Course => {
    try {
        const saved = localStorage.getItem(LAST_COURSE_KEY);
        if (COURSES.some(course => course.id === saved)) return saved as Course;
    } catch {
        // Blocked storage.
    }
    return 'foundations';
};

export const writeLastCourse = (id: Course) => {
    try {
        localStorage.setItem(LAST_COURSE_KEY, id);
    } catch {
        // Not remembered.
    }
};
