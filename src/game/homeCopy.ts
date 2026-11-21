// The words at the top of the front page. The page itself (Landing.tsx) and the
// copy the build writes into the HTML (sitePages.test.ts) both read them, so
// what shows before the app has loaded is the same text it then shows.

import { COURSES } from './courses';

export const HOME_LESSONS = COURSES.reduce((n, course) => n + course.units.reduce((m, unit) => m + unit.topics.length, 0), 0);
export const HOME_UNITS = COURSES.reduce((n, course) => n + course.units.length, 0);

export const HERO = {
    title: 'Learn ML, SQL and system design,',
    titleEnd: 'one step at a time.',
    lead: `${HOME_LESSONS} lessons that start from scratch and go all the way to interview questions. Every topic has an animation, the idea step by step, a worked example, exercises with answers, and quick practice like a game.`,
    start: 'Start learning',
    browse: 'See the courses',
    firstLesson: 'First lesson:',
} as const;

export const HERO_STATS = [
    { value: HOME_LESSONS, label: 'lessons' },
    { value: HOME_UNITS, label: 'units' },
    { value: COURSES.length, label: 'courses' },
];

/** The end of the headline, in the three course colours. */
export const HERO_GRADIENT = `linear-gradient(90deg, ${COURSES.map(course => course.colour).join(', ')})`;
