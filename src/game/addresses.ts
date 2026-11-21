// The site's addresses. Every page is a real path, so search engines can find
// and list each lesson on its own:
//   /                          the home page
//   /sql/                      a course: its path of units and lessons
//   /sql/<lesson-slug>/        one lesson
//   /sql/unit/<unit-id>/       a unit's guide
// ?mode= (Revise, Interview) stays a query on the course address.
// The build writes a page for each of these (see vite.config.ts), with the
// lesson's title and text, so the address works when opened directly.

import { COURSES, type CourseInfo } from './courses';
import lessonSlugs from './lessonSlugs.json';

export const SITE_URL = 'https://learn.hamropedia.com';

/** The project on GitHub: the code and every lesson. */
export const REPO_URL = 'https://github.com/iammanoj807/ai-engineer-path';

const SLUGS = lessonSlugs as Record<string, Record<string, string>>;
const TOPIC_BY_SLUG: Record<string, Record<string, string>> = Object.fromEntries(
    Object.entries(SLUGS).map(([course, slugs]) => [course, Object.fromEntries(Object.entries(slugs).map(([id, slug]) => [slug, id]))]),
);

export const coursePath = (course: CourseInfo) => `${course.route}/`;

export const topicPath = (course: CourseInfo, topicId: string) => {
    const slug = SLUGS[course.id]?.[topicId];
    return slug ? `${course.route}/${slug}/` : coursePath(course);
};

export const unitPath = (course: CourseInfo, unitId: string) => `${course.route}/unit/${encodeURIComponent(unitId)}/`;

export interface Place {
    course: CourseInfo;
    topicId?: string;
    unitId?: string;
}

/** Which course, lesson or unit guide an address shows. */
export const placeOf = (pathname: string): Place | undefined => {
    const course = COURSES.find(c => pathname === c.route || pathname.startsWith(`${c.route}/`));
    if (!course) return undefined;
    const parts = pathname.slice(course.route.length).split('/').filter(Boolean);
    if (parts.length === 2 && parts[0] === 'unit') {
        const unitId = decodeURIComponent(parts[1]);
        return course.units.some(unit => unit.id === unitId) ? { course, unitId } : { course };
    }
    if (parts.length === 1) {
        const topicId = TOPIC_BY_SLUG[course.id]?.[parts[0]];
        return topicId ? { course, topicId } : { course };
    }
    return { course };
};

/**
 * The site used to keep its address after a # (/#/sql?topic=sql1-t1), and old
 * links still do. This gives the address that page has now, or null when the
 * hash is not an old address.
 */
export const addressFromHash = (hash: string): string | null => {
    if (!hash.startsWith('#/')) return null;
    const rest = hash.slice(1);
    const queryAt = rest.indexOf('?');
    const path = (queryAt < 0 ? rest : rest.slice(0, queryAt)).replace(/\/+$/, '');
    const params = new URLSearchParams(queryAt < 0 ? '' : rest.slice(queryAt + 1));
    const course = COURSES.find(c => c.route === path);
    if (!course) return '/';
    const topic = params.get('topic');
    if (topic && SLUGS[course.id]?.[topic]) return topicPath(course, topic);
    const unit = params.get('unit');
    if (unit && course.units.some(u => u.id === unit)) return unitPath(course, unit);
    params.delete('topic');
    params.delete('unit');
    const query = params.toString();
    return `${coursePath(course)}${query ? `?${query}` : ''}`;
};
