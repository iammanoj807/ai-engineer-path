// Each page's title and description, as search results show them. The build
// writes them into every page's HTML (vite.config.ts), and the app sets the
// same title as you move between pages, so the two never disagree.

import { COURSES, type CourseInfo, type PathTopic, type PathUnit } from './courses';
import { SITE_URL, coursePath, placeOf, topicPath, unitPath } from './addresses';

export const SITE_NAME = 'AI Engineer Path';

const HOME_TITLE = 'AI Engineer Path: learn ML, SQL and system design for free';
const HOME_DESCRIPTION =
    'Learn ML foundations, SQL and system design from scratch: full lessons, animations, exercises with answers and interview questions. Free, step by step.';

/** Search results cut descriptions at about 155 characters, so end on a whole word. */
export const shorten = (text: string, max = 155): string => {
    const flat = text.replace(/\s+/g, ' ').trim();
    if (flat.length <= max) return flat;
    const cut = flat.slice(0, max - 1);
    return `${cut.slice(0, cut.lastIndexOf(' ')).replace(/[,;:.\s]+$/, '')}…`;
};

export interface PageMeta {
    path: string;
    title: string;
    description: string;
    /** From the home page down to this page. */
    trail: { name: string; path: string }[];
}

const home = { name: SITE_NAME, path: '/' };

export const homeMeta = (): PageMeta => ({ path: '/', title: HOME_TITLE, description: HOME_DESCRIPTION, trail: [home] });

export const courseMeta = (course: CourseInfo): PageMeta => ({
    path: coursePath(course),
    title: `${course.title}: a free course from scratch | ${SITE_NAME}`,
    description: shorten(`${course.tagline} ${course.units.length} units, ${course.units.reduce((n, unit) => n + unit.topics.length, 0)} lessons, exercises with answers and interview questions. Free.`),
    trail: [home, { name: course.title, path: coursePath(course) }],
});

export const topicMeta = (course: CourseInfo, topic: PathTopic): PageMeta => ({
    path: topicPath(course, topic.id),
    title: `${topic.name} | ${course.title} | ${SITE_NAME}`,
    description: shorten(topic.definition),
    trail: [...courseMeta(course).trail, { name: topic.name, path: topicPath(course, topic.id) }],
});

export const unitMeta = (course: CourseInfo, unit: PathUnit): PageMeta => ({
    path: unitPath(course, unit.id),
    title: `Unit ${unit.number}: ${unit.title} | ${course.title} | ${SITE_NAME}`,
    description: shorten(unit.goal),
    trail: [...courseMeta(course).trail, { name: `Unit ${unit.number}: ${unit.title}`, path: unitPath(course, unit.id) }],
});

/** The page an address shows. Unknown lessons fall back to their course. */
export const metaFor = (pathname: string): PageMeta => {
    const place = placeOf(pathname);
    if (!place) return homeMeta();
    const { course, topicId, unitId } = place;
    const topic = topicId ? course.units.flatMap(unit => unit.topics).find(t => t.id === topicId) : undefined;
    if (topic) return topicMeta(course, topic);
    const unit = unitId ? course.units.find(u => u.id === unitId) : undefined;
    if (unit) return unitMeta(course, unit);
    return courseMeta(course);
};

/** Every page the site has, for the build and the sitemap. */
export const allPages = (): { meta: PageMeta; course?: CourseInfo; unit?: PathUnit; topic?: PathTopic }[] => [
    { meta: homeMeta() },
    ...COURSES.flatMap(course => [
        { meta: courseMeta(course), course },
        ...course.units.flatMap(unit => [
            { meta: unitMeta(course, unit), course, unit },
            ...unit.topics.map(topic => ({ meta: topicMeta(course, topic), course, unit, topic })),
        ]),
    ]),
];

export const absoluteUrl = (path: string) => `${SITE_URL}${path}`;
