// The home page draws each course's path from a small index (names, one-line
// definitions, "why it matters"), not the full lessons, so the first visit
// stays fast. This test keeps that index in step with the lessons:
// `npm run path-index` rewrites it, and `npm run build` does that first.

import { readFileSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import { foundationPhases } from '../../data/foundations';
import { sqlPhases } from '../../data/sql';
import { systemDesignPhases } from '../../data/systemDesign';

const INDEX = fileURLToPath(new URL('../pathIndex.json', import.meta.url));

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
        if (process.env.UPDATE_PATH_INDEX) writeFileSync(INDEX, `${JSON.stringify(fresh, null, 1)}\n`);
        expect(JSON.parse(readFileSync(INDEX, 'utf8'))).toEqual(fresh);
    });
});
