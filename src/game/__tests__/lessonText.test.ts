// The words lessons use for the course itself, and the links between lessons.
// The site calls each part of a course a unit, so lesson text does too, and a
// mention of another course's lesson is a real link, written [label](/path/).

import { describe, expect, it } from 'vitest';
import { foundationPhases, foundationRules } from '../../data/foundations';
import { foundationAnswers } from '../../data/foundationsAnswers';
import { sqlHowToStudy, sqlPhases } from '../../data/sql';
import { sqlAnswers } from '../../data/sqlAnswers';
import { sdHowToStudy, systemDesignPhases } from '../../data/systemDesign';
import { systemDesignAnswers } from '../../data/systemDesignAnswers';
import { SITE_LINK } from '../../utils/glossaryEngine';
import { metaFor } from '../seo';

/** Fields a learner reads as code, not prose. */
const CODE_FIELDS = new Set(['code', 'sql', 'syntax', 'url', 'id']);

/** Every piece of prose in a value, with where it came from. */
const proseIn = (value: unknown, where: string, key = ''): { where: string; text: string }[] => {
    if (CODE_FIELDS.has(key)) return [];
    if (typeof value === 'string') return [{ where, text: value }];
    if (Array.isArray(value)) return value.flatMap((item, i) => proseIn(item, `${where}[${i}]`, key));
    if (value && typeof value === 'object') return Object.entries(value).flatMap(([k, v]) => proseIn(v, `${where}.${k}`, k));
    return [];
};

const prose = [
    ...proseIn(foundationPhases, 'foundations'),
    ...proseIn(foundationAnswers, 'foundationAnswers'),
    ...proseIn(foundationRules, 'foundationRules'),
    ...proseIn(sqlPhases, 'sql'),
    ...proseIn(sqlAnswers, 'sqlAnswers'),
    ...proseIn(sqlHowToStudy, 'sqlHowToStudy'),
    ...proseIn(systemDesignPhases, 'systemDesign'),
    ...proseIn(systemDesignAnswers, 'systemDesignAnswers'),
    ...proseIn(sdHowToStudy, 'sdHowToStudy'),
];

describe('lesson text', () => {
    it('reads all of the lessons', () => {
        expect(prose.length).toBeGreaterThan(5000);
    });

    it('calls each part of a course a unit, as the site does', () => {
        const old = prose.filter(({ text }) => /\bPhases? \d|\b(this|next|each|per) phase\b|\b(SQL|System Design|Foundations) tab\b/i.test(text));
        expect(old.map(({ where, text }) => `${where}: ${text.slice(0, 80)}`)).toEqual([]);
    });

    it('links only to pages that exist', () => {
        const links = prose.flatMap(({ where, text }) => [...text.matchAll(SITE_LINK)].map(match => ({ where, path: match[2] })));
        expect(links.length).toBeGreaterThan(0);
        for (const { where, path } of links) {
            // An unknown lesson or unit falls back to its course, so the address would not come back the same.
            expect(metaFor(path).path, `${where} links to ${path}`).toBe(path);
        }
    });
});
