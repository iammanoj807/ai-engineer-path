import { describe, expect, it } from 'vitest';
import { COURSES, courseById } from '../courses';
import { addressFromHash, coursePath, placeOf, topicPath, unitPath } from '../addresses';
import lessonSlugs from '../lessonSlugs.json';

const sql = courseById('sql');
const firstSqlTopic = sql.units[0].topics[0];
const firstSqlSlug = (lessonSlugs as Record<string, Record<string, string>>).sql[firstSqlTopic.id];

describe('addresses', () => {
    it('reads every lesson and unit back from its address', () => {
        for (const course of COURSES) {
            expect(placeOf(coursePath(course))).toEqual({ course });
            for (const unit of course.units) {
                expect(placeOf(unitPath(course, unit.id))).toEqual({ course, unitId: unit.id });
                for (const topic of unit.topics) expect(placeOf(topicPath(course, topic.id))).toEqual({ course, topicId: topic.id });
            }
        }
    });

    it('uses readable addresses with a trailing slash', () => {
        expect(topicPath(sql, firstSqlTopic.id)).toBe(`/sql/${firstSqlSlug}/`);
        expect(unitPath(sql, 'joins')).toBe('/sql/unit/joins/');
        expect(coursePath(sql)).toBe('/sql/');
    });

    it('falls back to the course for an unknown lesson, and to nothing off the courses', () => {
        expect(placeOf('/sql/no-such-lesson/')).toEqual({ course: sql });
        expect(placeOf('/sql/unit/no-such-unit/')).toEqual({ course: sql });
        expect(placeOf('/sql')).toEqual({ course: sql });
        expect(placeOf('/sqlish/')).toBeUndefined();
        expect(placeOf('/')).toBeUndefined();
    });

    it('moves old hash links to the same page', () => {
        expect(addressFromHash(`#/sql?topic=${firstSqlTopic.id}`)).toBe(`/sql/${firstSqlSlug}/`);
        expect(addressFromHash(`#/sql?topic=${firstSqlTopic.id}&mode=interview`)).toBe(`/sql/${firstSqlSlug}/`);
        expect(addressFromHash('#/sql?unit=joins')).toBe('/sql/unit/joins/');
        expect(addressFromHash('#/sql?mode=interview')).toBe('/sql/?mode=interview');
        expect(addressFromHash('#/system-design')).toBe('/system-design/');
        expect(addressFromHash('#/sql?topic=gone')).toBe('/sql/');
        expect(addressFromHash('#/')).toBe('/');
        expect(addressFromHash('#/nowhere')).toBe('/');
        expect(addressFromHash('')).toBeNull();
        expect(addressFromHash('#section-2')).toBeNull();
    });
});
