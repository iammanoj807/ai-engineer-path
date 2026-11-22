// Every page's text as plain HTML, for search engines and for the moment
// before a course has loaded. `npm run site-pages` writes it to
// generated/site-pages.json (npm run build does that first), and the build
// turns it into one HTML file per address (vite.config.ts).
// Practice answers and SQL solutions are left out: the site hides them until
// asked for, and so do these pages.

import { createHash } from 'node:crypto';
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import { foundationPhases, type FoundationTopic } from '../../data/foundations';
import { sqlPhases, type SqlTopic } from '../../data/sql';
import { systemDesignPhases, type SDTopic } from '../../data/systemDesign';
import { COURSES, type CourseInfo, type PathTopic, type PathUnit } from '../courses';
import { SITE_URL, coursePath, topicPath, unitPath } from '../addresses';
import { allPages, metaFor, type PageMeta } from '../seo';
import { SITE_LINK } from '../../utils/glossaryEngine';
import { HERO, HERO_GRADIENT, HERO_STATS } from '../homeCopy';

const OUT = fileURLToPath(new URL('../../../generated/site-pages.json', import.meta.url));
// The day each page's text last changed, for <lastmod> in the sitemap. Kept in the repository,
// because the day can't be worked out again later: `npm run site-pages` updates it.
const DATES = fileURLToPath(new URL('../pageDates.json', import.meta.url));

const esc = (text: string) => text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
/** Escaped text, with `code` in backticks shown as code and [label](/path/) as a link, as the lessons show them. */
const prose = (text: string) =>
    esc(text)
        .replace(/`([^`\n]+)`/g, '<code>$1</code>')
        .replace(SITE_LINK, '<a href="$2">$1</a>');
const para = (text: string) => text.split(/\n\s*\n/).map(p => `<p>${prose(p.trim()).replace(/\n/g, '<br>')}</p>`).join('');
const list = (items: string[] | undefined, ordered = false) =>
    items?.length ? `<${ordered ? 'ol' : 'ul'}>${items.map(item => `<li>${prose(item).replace(/\n/g, '<br>')}</li>`).join('')}</${ordered ? 'ol' : 'ul'}>` : '';
const section = (title: string, html: string) => (html ? `<h2>${esc(title)}</h2>${html}` : '');
const link = (path: string, text: string) => `<a href="${esc(path)}">${esc(text)}</a>`;

const trail = (meta: PageMeta) =>
    `<nav class="seo-trail" aria-label="Breadcrumb">${meta.trail
        .map((step, i) => (i === meta.trail.length - 1 ? `<span>${esc(step.name)}</span>` : link(step.path, step.name)))
        .join(' <span aria-hidden="true">›</span> ')}</nav>`;

type AnyTopic = FoundationTopic | SqlTopic | SDTopic;
const fullTopics = new Map<string, AnyTopic>(
    [...foundationPhases, ...sqlPhases, ...systemDesignPhases].flatMap(phase => phase.topics.map(topic => [topic.id, topic as AnyTopic] as const)),
);
const bigPictures = new Map<string, string>(
    [...foundationPhases, ...sqlPhases, ...systemDesignPhases].map(phase => [phase.id, phase.bigPicture]),
);

/** The lesson's listed mistakes, then its false statement with what is true straight under it. */
const mistakes = (topic: AnyTopic) =>
    list(topic.mistakes) +
    (topic.myths ?? []).map(myth => `<p><strong>Not true:</strong> ${prose(myth.claim)}<br><strong>In fact:</strong> ${prose(myth.truth)}</p>`).join('');

/** The lesson's teaching text, in the order the lesson shows it. */
const lessonText = (topic: AnyTopic): string => {
    if ('note' in topic) {
        return [
            section('Why it matters', para(topic.problem)),
            section('The idea', para(topic.note.idea) + para(topic.note.analogy) + (topic.note.breaks ? para(topic.note.breaks) : '')),
            section('How it works', list(topic.howItWorks, true)),
            section('Key points', list(topic.keyPoints)),
            section('Common mistakes', mistakes(topic)),
            topic.deeper ? section(`Go deeper: ${topic.deeper.title}`, list(topic.deeper.steps, true) + para(topic.deeper.result)) : '',
        ].join('');
    }
    if ('pattern' in topic) {
        return [
            section('What it tests', para(topic.problem)),
            section('The pattern', para(`${topic.pattern}. ${topic.spot}`)),
            section('How to approach it', list(topic.approach, true)),
            section('Edge cases to mention', list(topic.edgeCases)),
            section('Common mistakes', mistakes(topic)),
        ].join('');
    }
    if ('designType' in topic) {
        return [
            section('Why interviewers ask it', para(topic.problem)),
            section('Functional requirements', list(topic.functional)),
            section('Non-functional requirements', list(topic.nonFunctional)),
            section('From version 1 to the final design', list(topic.evolution, true)),
            section('The design, step by step', list(topic.design, true)),
            section('Deep dives', list(topic.deepDives)),
            section('Common mistakes', mistakes(topic)),
            section('In the interview', para(topic.interviewAnswer)),
        ].join('');
    }
    return [
        section('Why it matters', para(topic.problem)),
        section('The idea', para(topic.idea) + para(topic.analogy) + para(topic.breaks)),
        'syntax' in topic && topic.syntax ? section('Syntax', `<pre><code>${esc(topic.syntax)}</code></pre>`) : '',
        section('How it works', list(topic.howItWorks, true)),
        'example' in topic && topic.example ? section('Example', para(topic.example)) : '',
        section('Key points', list(topic.keyPoints)),
        'tradeOffs' in topic ? section('Trade-offs', list(topic.tradeOffs)) : '',
        section('Common mistakes', mistakes(topic)),
        section('In the interview', para(topic.interviewAnswer)),
    ].join('');
};

const lessonLinks = (course: CourseInfo, topics: PathTopic[]) =>
    `<ul class="seo-lessons">${topics.map(topic => `<li>${link(topicPath(course, topic.id), topic.name)}: ${esc(topic.definition)}</li>`).join('')}</ul>`;

// The front page as the app first draws it (Landing.tsx), so nothing jumps when
// the app takes over: the same words, in the same places. The courses and their
// units follow below, as links for search engines.
const icon = (d: string) => `<svg class="seo-btn-icon" viewBox="0 0 24 24" aria-hidden="true"><path d="${d}"/></svg>`;
const DOWN_ICON = 'M11 5v11.17l-4.88-4.88c-.39-.39-1.03-.39-1.42 0s-.39 1.02 0 1.41l6.59 6.59c.39.39 1.02.39 1.41 0l6.59-6.59c.39-.39.39-1.02 0-1.41a.996.996 0 0 0-1.41 0L13 16.17V5c0-.55-.45-1-1-1s-1 .45-1 1';

const homeBody = () => {
    const hero = `<section class="seo-hero"><div class="seo-hero-text">`
        + `<h1>${esc(HERO.title)} <span class="seo-grad" style="background-image:${HERO_GRADIENT}">${esc(HERO.titleEnd)}</span></h1>`
        + `<p class="seo-lead">${esc(HERO.lead)}</p>`
        + `<p class="seo-ctas"><a class="seo-btn seo-btn-alt" href="#courses">${esc(HERO.browse)}${icon(DOWN_ICON)}</a></p>`
        + `<div class="seo-stats">${HERO_STATS.map(stat => `<div><b>${stat.value}</b><span>${esc(stat.label)}</span></div>`).join('')}</div>`
        + `</div></section>`;
    const courses = `<section id="courses" class="seo-courses">${COURSES.map(
        c => `<h2>${link(coursePath(c), c.title)}</h2><p>${esc(c.tagline)}</p><ul class="seo-lessons">${c.units.map(u => `<li>${link(unitPath(c, u.id), `Unit ${u.number}: ${u.title}`)}</li>`).join('')}</ul>`,
    ).join('')}</section>`;
    return `<article class="seo-page seo-home">${hero}${courses}</article>`;
};

const body = (meta: PageMeta, course?: CourseInfo, unit?: PathUnit, topic?: PathTopic): string => {
    if (course && unit && topic) {
        const full = fullTopics.get(topic.id);
        if (!full) throw new Error(`No lesson text for ${topic.id}`);
        const all = course.units.flatMap(u => u.topics);
        const at = all.findIndex(t => t.id === topic.id);
        const previous = all[at - 1];
        const next = all[at + 1];
        return `<article class="seo-page">${trail(meta)}<h1>${esc(topic.name)}</h1><p class="seo-lead">${prose(topic.definition)}</p>${lessonText(full)}<nav class="seo-next">${
            previous ? link(topicPath(course, previous.id), `← ${previous.name}`) : ''
        }${next ? link(topicPath(course, next.id), `Next: ${next.name} →`) : ''}</nav><p>Part of ${link(unitPath(course, unit.id), `Unit ${unit.number}: ${unit.title}`)} in the free ${link(coursePath(course), `${course.title} course`)}.</p></article>`;
    }
    if (course && unit) {
        return `<article class="seo-page">${trail(meta)}<h1>Unit ${unit.number}: ${esc(unit.title)}</h1><p class="seo-lead">${esc(unit.goal)}</p>${section('The big picture', para(bigPictures.get(unit.id) ?? ''))}${section('Lessons in this unit', lessonLinks(course, unit.topics))}</article>`;
    }
    if (course) {
        return `<article class="seo-page">${trail(meta)}<h1>${esc(course.title)}</h1><p class="seo-lead">${esc(course.tagline)} Free, step by step: every lesson is complete, with an animation, a worked example and exercises with answers.</p>${course.units
            .map(u => `<h2>${link(unitPath(course, u.id), `Unit ${u.number}: ${u.title}`)}</h2><p>${esc(u.goal)}</p>${lessonLinks(course, u.topics)}`)
            .join('')}</article>`;
    }
    return homeBody();
};

const pages = allPages().map(({ meta, course, unit, topic }) => ({ ...meta, body: body(meta, course, unit, topic) }));

/** For each page: a stamp of its text, and the day that text last changed. */
type PageDates = Record<string, [stamp: string, day: string]>;

/** A short stamp of what a reader sees on the page: its title, description and words, not its markup. */
const stampOf = (page: { title: string; description: string; body: string }) =>
    createHash('sha1')
        .update(`${page.title}\n${page.description}\n${page.body.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim()}`)
        .digest('hex')
        .slice(0, 12);

const savedDates = (): PageDates => (existsSync(DATES) ? (JSON.parse(readFileSync(DATES, 'utf8')) as PageDates) : {});

/** The saved days, with `today` for every page that is new or whose text has changed since. */
const datesFor = (saved: PageDates, today: string): PageDates =>
    Object.fromEntries(
        pages.map(page => {
            const stamp = stampOf(page);
            const before = saved[page.path];
            return [page.path, before && before[0] === stamp ? before : [stamp, today]];
        }),
    );

const pageDates = datesFor(savedDates(), new Date().toISOString().slice(0, 10));

describe('site pages', () => {
    it('has a page for the home page, every course, unit and lesson', () => {
        const units = COURSES.reduce((n, c) => n + c.units.length, 0);
        const lessons = COURSES.reduce((n, c) => n + c.units.reduce((m, u) => m + u.topics.length, 0), 0);
        expect(pages.length).toBe(1 + COURSES.length + units + lessons);
        expect(new Set(pages.map(p => p.path)).size).toBe(pages.length);
        expect(new Set(pages.map(p => p.title)).size).toBe(pages.length);
    });

    it('gives each page an address the app reads back as the same page', () => {
        for (const page of pages) {
            expect(page.path).toMatch(/^\/([a-z0-9-]+\/)*$/);
            expect(metaFor(page.path).path).toBe(page.path);
        }
    });

    it('gives each page a usable title, description and real text', () => {
        for (const page of pages) {
            expect(page.description.length, page.path).toBeGreaterThan(40);
            expect(page.description.length, page.path).toBeLessThanOrEqual(155);
            expect(page.body.length, page.path).toBeGreaterThan(page.path.split('/').length > 3 ? 1500 : 300);
            expect(page.body).not.toMatch(/undefined|\[object Object\]/);
        }
    });

    it('writes the pages for the build', () => {
        if (!process.env.WRITE_SITE_PAGES) return;
        mkdirSync(dirname(OUT), { recursive: true });
        writeFileSync(OUT, JSON.stringify({ site: SITE_URL, pages: pages.map(page => ({ ...page, lastmod: pageDates[page.path][1] })) }));
        // One page a line, so a change shows up as one line in a diff.
        writeFileSync(DATES, `{\n${Object.entries(pageDates).map(([path, entry]) => `${JSON.stringify(path)}: ${JSON.stringify(entry)}`).join(',\n')}\n}\n`);
    });

    it('knows the day each page last changed (run `npm run site-pages` after changing a lesson, and commit pageDates.json)', () => {
        const saved = savedDates();
        const changed = pages.filter(page => saved[page.path]?.[0] !== stampOf(page)).map(page => page.path);
        const gone = Object.keys(saved).filter(path => !(path in pageDates));
        expect({ changed, gone }).toEqual({ changed: [], gone: [] });
        for (const [, day] of Object.values(saved)) expect(day).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    });
});
