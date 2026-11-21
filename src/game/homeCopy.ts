// The words at the top of the front page. The page itself (Landing.tsx) and the
// copy the build writes into the HTML (sitePages.test.ts) both read them, so
// what shows before the app has loaded is the same text it then shows.

import { COURSES } from './courses';

export const HOME_LESSONS = COURSES.reduce((n, course) => n + course.units.reduce((m, unit) => m + unit.topics.length, 0), 0);
export const HOME_UNITS = COURSES.reduce((n, course) => n + course.units.length, 0);

export const HERO = {
    title: 'Learn ML, SQL and system design,',
    titleEnd: 'one step at a time.',
    lead: 'Enjoy reading, with diagrams, animations and quizzes along the way.',
    browse: 'See the courses',
} as const;

export const HERO_STATS = [
    { value: HOME_LESSONS, label: 'lessons' },
    { value: HOME_UNITS, label: 'units' },
    { value: COURSES.length, label: 'courses' },
];

/** The end of the headline, in the three course colours. */
/** The headline's gradient: the courses' purple into the site's blue. */
export const HERO_GRADIENT = 'linear-gradient(90deg, #b39ddb, #9fa8ff, #82b1ff)';
