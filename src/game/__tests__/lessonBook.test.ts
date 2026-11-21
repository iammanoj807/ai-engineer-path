// The lessons as Markdown pages in lessons/, for reading on GitHub.
// `npm run lessons` rewrites them, and `npm run build` does that first. This
// test fails when a page is missing, out of date, or left over from a lesson
// that has gone, so the folder always matches the site.

import { existsSync, mkdirSync, readFileSync, readdirSync, rmSync, statSync, writeFileSync } from 'node:fs';
import { dirname, join, relative, resolve, sep } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import { COURSES } from '../courses';
import { lessonBook } from '../lessonBook';

const ROOT = fileURLToPath(new URL('../../../', import.meta.url));
const BOOK = join(ROOT, 'lessons');
const WRITE = !!process.env.WRITE_LESSON_BOOK;

const pages = lessonBook();
const expected = new Set(pages.map(page => page.path));

const filesIn = (dir: string): string[] =>
    existsSync(dir)
        ? readdirSync(dir).flatMap(name => {
              const full = join(dir, name);
              return statSync(full).isDirectory() ? filesIn(full) : [full];
          })
        : [];
const fromRoot = (file: string) => relative(ROOT, file).split(sep).join('/');

/** Remove folders left empty once their pages have gone. */
const pruneEmpty = (dir: string) => {
    for (const name of readdirSync(dir)) {
        const full = join(dir, name);
        if (statSync(full).isDirectory()) pruneEmpty(full);
    }
    if (dir !== BOOK && readdirSync(dir).length === 0) rmSync(dir, { recursive: true });
};

describe('the lessons as Markdown', () => {
    it('has the index, a page for every lesson, and a page for each set of interview questions', () => {
        const lessons = COURSES.reduce((n, course) => n + course.units.reduce((m, unit) => m + unit.topics.length, 0), 0);
        expect(pages.length).toBe(1 + lessons + 4);
        expect(expected.size).toBe(pages.length);
        expect(expected.has('lessons/README.md')).toBe(true);
        for (const page of pages) expect(page.path).toMatch(/^lessons\/[a-z0-9/-]+\.md$|^lessons\/README\.md$/);
    });

    it('is up to date in lessons/ (run `npm run lessons` after changing a lesson)', () => {
        if (WRITE) {
            for (const page of pages) {
                const file = join(ROOT, page.path);
                mkdirSync(dirname(file), { recursive: true });
                if (!existsSync(file) || readFileSync(file, 'utf8') !== page.text) writeFileSync(file, page.text);
            }
            for (const file of filesIn(BOOK)) if (!expected.has(fromRoot(file))) rmSync(file);
            pruneEmpty(BOOK);
        }
        const outOfDate = pages.filter(page => !existsSync(join(ROOT, page.path)) || readFileSync(join(ROOT, page.path), 'utf8') !== page.text).map(page => page.path);
        expect(outOfDate).toEqual([]);
        expect(filesIn(BOOK).map(fromRoot).filter(file => !expected.has(file))).toEqual([]);
    });

    it('writes real pages: the whole lesson, with answers folded away and every code block closed', () => {
        for (const page of pages) {
            expect(page.text.length, page.path).toBeGreaterThan(page.path.endsWith('README.md') ? 2000 : 1500);
            // A missing field would show up as one of these. (The word "undefined" alone is fine: lessons use it.)
            expect(page.text, page.path).not.toMatch(/\[object Object\]|^undefined$|\(undefined\)|: undefined$/m);
            expect((page.text.match(/<details>/g) ?? []).length, page.path).toBe((page.text.match(/<\/details>/g) ?? []).length);
            // Fences open and close in pairs, whatever their length.
            const fences = page.text.split('\n').filter(line => /^`{3,}/.test(line));
            expect(fences.length % 2, page.path).toBe(0);
        }
        const lesson = pages.find(page => page.path.endsWith('/gradient-descent-and-the-learning-rate.md'));
        expect(lesson?.text).toContain('## How it works, step by step');
        expect(lesson?.text).toContain('```mermaid');
        expect(lesson?.text).toContain('<summary>Show one good answer</summary>');
    });

    it('the README states the real number of lessons', () => {
        const readme = readFileSync(join(ROOT, 'README.md'), 'utf8');
        const count = (id: string) => COURSES.find(course => course.id === id)!.units.reduce((n, unit) => n + unit.topics.length, 0);
        const all = COURSES.reduce((n, course) => n + count(course.id), 0);
        expect(readme).toContain(`${all} complete lessons`);
        expect(readme).toContain(`browse all ${all} lessons`);
        expect(readme).toContain(`ML_Foundations-${count('foundations')}_lessons`);
        expect(readme).toContain(`SQL-${count('sql')}_lessons`);
        expect(readme).toContain(`System_Design-${count('system_design')}_lessons`);
    });

    it('links only to pages and files that exist', () => {
        const broken: string[] = [];
        for (const page of pages) {
            for (const match of page.text.matchAll(/\]\(([^)\s]+\.md)\)/g)) {
                if (/^https?:/.test(match[1])) continue;
                const target = fromRoot(resolve(dirname(join(ROOT, page.path)), match[1]));
                if (!expected.has(target) && !existsSync(join(ROOT, target))) broken.push(`${page.path} → ${match[1]}`);
            }
        }
        expect(broken).toEqual([]);
    });
});
