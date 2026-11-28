// Each page's title and description, as search results show them. The build
// writes them into every page's HTML (vite.config.ts), and the app sets the
// same title as you move between pages, so the two never disagree.

import { COURSES, courseById, type CourseInfo, type PathTopic, type PathUnit } from './courses';
import { SITE_URL, coursePath, placeOf, topicPath, unitPath } from './addresses';
import { LAB_PATH, isLabPath, labMissionPath } from './labAddresses';
import { MISSIONS, type Mission } from '../data/systemDesignLab/missions';

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

const LAB_NAME = 'System Design Lab';

export const labMeta = (): PageMeta => {
    const course = courseById('system_design');
    return {
        path: LAB_PATH,
        title: `${LAB_NAME}: build a system, run a day of traffic, see it break | ${SITE_NAME}`,
        description: shorten(
            `Free interactive system design practice: build a system, send a whole day of traffic through it, and see where and why it breaks. ${MISSIONS.length} missions: load balancing, caching, sharding, queues, CDNs and more.`,
        ),
        trail: [...courseMeta(course).trail, { name: LAB_NAME, path: LAB_PATH }],
    };
};

export const missionMeta = (mission: Mission): PageMeta => ({
    path: labMissionPath(mission.id),
    title: `${mission.title} | ${LAB_NAME} | ${SITE_NAME}`,
    description: shorten(mission.story),
    trail: [...labMeta().trail, { name: mission.title, path: labMissionPath(mission.id) }],
});

/** The page an address shows. Unknown lessons fall back to their course. */
export const metaFor = (pathname: string): PageMeta => {
    if (isLabPath(pathname)) {
        const id = pathname.slice(LAB_PATH.length).split('/').filter(Boolean);
        const mission = id.length === 1 ? MISSIONS.find(m => m.id === id[0]) : undefined;
        return mission ? missionMeta(mission) : labMeta();
    }
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
export const allPages = (): { meta: PageMeta; course?: CourseInfo; unit?: PathUnit; topic?: PathTopic; lab?: 'missions' | Mission }[] => [
    { meta: homeMeta() },
    ...COURSES.flatMap(course => [
        { meta: courseMeta(course), course },
        ...course.units.flatMap(unit => [
            { meta: unitMeta(course, unit), course, unit },
            ...unit.topics.map(topic => ({ meta: topicMeta(course, topic), course, unit, topic })),
        ]),
    ]),
    { meta: labMeta(), lab: 'missions' as const },
    ...MISSIONS.map(mission => ({ meta: missionMeta(mission), lab: mission })),
];

export const absoluteUrl = (path: string) => `${SITE_URL}${path}`;
