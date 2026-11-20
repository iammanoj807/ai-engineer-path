// The home page draws each course's path from a small index (names, one-line
// definitions, "why it matters"), not the full lessons, so the first visit
// stays fast. This test keeps that index in step with the lessons:
// `npm run path-index` rewrites it, and `npm run build` does that first.
// The same run gives each new lesson its lasting address (lessonSlugs.json).

import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import { foundationPhases } from '../../data/foundations';
import { sqlPhases } from '../../data/sql';
import { systemDesignPhases } from '../../data/systemDesign';
import { RESERVED_SLUGS, slugify, withNewSlugs, type SlugMap } from '../slugs';

const INDEX = fileURLToPath(new URL('../pathIndex.json', import.meta.url));
const SLUGS = fileURLToPath(new URL('../lessonSlugs.json', import.meta.url));
const UPDATE = !!process.env.UPDATE_PATH_INDEX;

type Phase = { id: string; number: number; title: string; short: string; accent: string; goal: string; topics: { id: string; name: string; definition: string; problem: string }[] };

const units = (phases: Phase[]) =>
    phases.map(({ id, number, title, short, accent, goal, topics }) => ({
        id,
        number,
        title,
        short,
        accent,
        goal,
        topics: topics.map(({ id: topicId, name, definition, problem }) => ({ id: topicId, name, definition, problem })),
    }));

const fresh = {
    foundations: units(foundationPhases),
    sql: units(sqlPhases),
    system_design: units(systemDesignPhases),
};

describe('path index', () => {
    it('matches the lessons', () => {
        if (UPDATE) writeFileSync(INDEX, `${JSON.stringify(fresh, null, 1)}\n`);
        expect(JSON.parse(readFileSync(INDEX, 'utf8'))).toEqual(fresh);
    });

    it('gives every lesson a lasting address', () => {
        const saved: SlugMap = existsSync(SLUGS) ? JSON.parse(readFileSync(SLUGS, 'utf8')) : {};
        const topics = Object.fromEntries(Object.entries(fresh).map(([course, list]) => [course, list.flatMap(unit => unit.topics)]));
        const complete = withNewSlugs(saved, topics);
        if (UPDATE) writeFileSync(SLUGS, `${JSON.stringify(complete, null, 1)}\n`);
        // A lesson without an address means `npm run path-index` was not run.
        expect(JSON.parse(readFileSync(SLUGS, 'utf8'))).toEqual(complete);

        for (const [course, slugs] of Object.entries(complete)) {
            const values = Object.values(slugs);
            expect(new Set(values).size, `${course}: two lessons share an address`).toBe(values.length);
            for (const slug of values) {
                expect(slug).toMatch(/^[a-z0-9]+(-[a-z0-9]+)*$/);
                expect(RESERVED_SLUGS.has(slug)).toBe(false);
            }
        }
    });
});

describe('slugify', () => {
    it('makes short, readable addresses', () => {
        expect(slugify("Normalisation: designing tables that don't contradict themselves")).toBe('normalisation-designing-tables-that-dont-contradict-themselves');
        expect(slugify('SELECT and FROM: choosing columns')).toBe('select-and-from-choosing-columns');
        expect(slugify('Keys and relationships: primary keys, foreign keys, one-to-many, many-to-many').length).toBeLessThanOrEqual(70);
    });

    it('never changes a saved address and never reuses one', () => {
        const saved = { sql: { a: 'joins' } };
        const result = withNewSlugs(saved, { sql: [{ id: 'a', name: 'Renamed lesson' }, { id: 'b', name: 'Joins' }, { id: 'c', name: 'Unit' }] });
        expect(result.sql).toEqual({ a: 'joins', b: 'joins-2', c: 'unit-2' });
    });
});
