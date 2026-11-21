// Every lesson as a Markdown page, so the whole course can be read on GitHub
// (the lessons/ folder). The pages are written from the same data the site
// uses, by `npm run lessons`; a test fails when they are out of date
// (lessonBook.test.ts). Never edit a page in lessons/ by hand: edit the lesson
// in src/data and run the command.
//
// A page has everything the lesson has except what needs the site: the
// animation, the practice game and the tap-to-explain words. Exercise answers
// are folded away, as on the site, so each exercise is tried first.
//
// Only this file's test imports it, so none of it reaches the app.

import { CHECK_LABELS, foundationPhases, type CheckKey, type FoundationTopic } from '../data/foundations';
import { foundationAnswers } from '../data/foundationsAnswers';
import { SQL_CHECK_KEYS, SQL_CHECK_LABELS, SQL_DIFFICULTY_LABELS, SQL_PRIORITY_LABELS, sqlPhases, type SqlExample, type SqlResultTable, type SqlTopic } from '../data/sql';
import { sqlAnswers } from '../data/sqlAnswers';
import { SD_CHECK_KEYS, SD_CHECK_LABELS, SD_PRIORITY_LABELS, systemDesignPhases, type SDTopic } from '../data/systemDesign';
import { systemDesignAnswers } from '../data/systemDesignAnswers';
import { genAiInterviewSet } from '../data/interviewPrep/genai';
import { mlInterviewSet } from '../data/interviewPrep/ml';
import { sqlInterviewSet } from '../data/interviewPrep/sql';
import { systemDesignInterviewSet } from '../data/interviewPrep/systemDesign';
import { INTERVIEW_LEVEL_LABELS, type InterviewSet } from '../data/interviewPrep/types';
import type { LessonMyth } from '../data/lessonMyth';
import type { Course } from '../services/progress';
import { REPO_URL, SITE_URL, topicPath, unitPath } from './addresses';
import { COURSES, type CourseInfo, type PathUnit } from './courses';

export interface BookPage {
    /** Where the page is written, from the repository root: lessons/sql/unit-3-joins/left-join.md */
    path: string;
    text: string;
}

/** The folder of each course inside lessons/. */
const COURSE_DIR: Record<Course, string> = { foundations: 'ml-foundations', sql: 'sql', system_design: 'system-design' };

const NOTE = '<!-- Written by `npm run lessons` from the lesson data in src/data. Edit the lesson there, not this page. -->';

// ============ MARKDOWN PIECES ============

/** Links to another lesson are written [label](/sql/joins/) in the lessons: here they point at the site. */
const SITE_LINKS = /\]\((\/[^)\s]*)\)/g;

/**
 * Lesson prose as Markdown text. The lessons are plain text with `code` in
 * backticks, so only the few characters Markdown would misread are changed.
 */
const prose = (text: string): string =>
    text
        // `Inline code` is left exactly as written: Markdown shows it as it is.
        .split(/(`[^`\n]*`)/)
        .map((part, i) =>
            i % 2 === 1
                ? part
                : part
                      .replace(/</g, '&lt;')
                      .replace(/\*/g, '\\*')
                      .replace(/\|/g, '\\|')
                      .replace(SITE_LINKS, `](${SITE_URL}$1)`),
        )
        .join('');

/** Paragraphs, keeping the line breaks the lessons use inside a worked answer. */
const paragraphs = (text: string): string =>
    text
        .trim()
        .split(/\n\s*\n/)
        .map(block => block.split('\n').map(line => prose(line.trimEnd())).join('  \n'))
        .join('\n\n');

const bullets = (items: readonly string[] | undefined): string => (items?.length ? items.map(item => `- ${prose(item)}`).join('\n') : '');
const numbered = (items: readonly string[] | undefined): string => (items?.length ? items.map((item, i) => `${i + 1}. ${prose(item)}`).join('\n') : '');

/** A fence longer than any run of backticks inside the code. */
const fenced = (code: string, language = ''): string => {
    const longest = Math.max(2, ...(code.match(/`+/g) ?? []).map(run => run.length));
    const fence = '`'.repeat(longest + 1);
    return `${fence}${language}\n${code.replace(/\s+$/, '')}\n${fence}`;
};

const section = (title: string, body: string | false | undefined): string => (body ? `## ${title}\n\n${body}` : '');

/** Folded away until opened, like "Show answer" on the site. */
const folded = (summary: string, body: string): string => `<details>\n<summary>${summary.replace(/</g, '&lt;')}</summary>\n\n${body}\n\n</details>`;

const diagram = (d: { code: string; caption: string }): string => `${fenced(d.code, 'mermaid')}\n\n*${prose(d.caption)}*`;

const questions = (items: readonly { q: string; a: string }[]): string => items.map(item => folded(`<b>${item.q.replace(/</g, '&lt;')}</b>`, paragraphs(item.a))).join('\n\n');

const cell = (value: string | number | null): string => (value === null ? 'NULL' : String(value).replace(/\|/g, '\\|').replace(/\n/g, ' '));

const table = (result: SqlResultTable): string =>
    [`| ${result.columns.map(cell).join(' | ')} |`, `| ${result.columns.map(() => '---').join(' | ')} |`, ...result.rows.map(row => `| ${row.map(cell).join(' | ')} |`)].join('\n') +
    (result.rows.length === 0 ? '\n\n*(no rows)*' : '');

const sqlExample = (example: Pick<SqlExample, 'sql' | 'result' | 'error'> & { title?: string; note?: string }): string =>
    [
        example.title ? `**${prose(example.title)}**` : '',
        fenced(example.sql, 'sql'),
        example.result ? table(example.result) : '',
        example.error ? `The database refuses this query: \`${example.error}\`` : '',
        example.note ? prose(example.note) : '',
    ]
        .filter(Boolean)
        .join('\n\n');

const resources = (items: readonly { title: string; source: string; url?: string; kind: string; recommended?: string }[]): string =>
    items
        .map(item => {
            const name = item.url ? `[${prose(item.title)}](${item.url})` : prose(item.title);
            return `- ${item.kind.toUpperCase()} · ${name} · ${prose(item.source)}${item.recommended ? `  \n  **Worth it:** ${prose(item.recommended)}` : ''}`;
        })
        .join('\n');

const join = (parts: (string | false | undefined)[]): string => parts.filter(Boolean).join('\n\n');

/** The lesson's listed mistakes, then its false statement with what is true straight under it. */
const mistakes = (topic: { mistakes: readonly string[]; myths?: readonly LessonMyth[] }): string =>
    join([bullets(topic.mistakes), ...(topic.myths ?? []).map(myth => `> **Not true:** ${prose(myth.claim)}  \n> **In fact:** ${prose(myth.truth)}`)]);

// ============ ONE LESSON, PER COURSE ============

/** Derive on paper first, as the site orders them. */
const FOUNDATION_ORDER: CheckKey[] = ['derive', 'build', 'break', 'explain'];

const foundationBody = (topic: FoundationTopic): string => {
    const answers = foundationAnswers[topic.id];
    const practice = FOUNDATION_ORDER.map((key, i) => {
        const answer = answers?.[key];
        const shown = answer ? join([paragraphs(answer.answer), answer.code && fenced(answer.code, answer.codeLanguage ?? 'python')]) : '';
        return join([`### ${i + 1}. ${CHECK_LABELS[key]}`, prose(topic.practice[key]), shown && folded('Show one good answer', shown)]);
    }).join('\n\n');
    return join([
        section('The problem it solves', paragraphs(topic.problem)),
        section('The idea', paragraphs(topic.note.idea)),
        section('How it works, step by step', numbered(topic.howItWorks)),
        section('Picture it', diagram(topic.diagram)),
        section('Analogy', join([paragraphs(topic.note.analogy), `**Where the analogy breaks.** ${prose(topic.note.breaks)}`])),
        section('Worked example', join([topic.note.example && paragraphs(topic.note.example), topic.note.code && fenced(topic.note.code, topic.note.codeLanguage ?? 'python')])),
        section('Must know', bullets(topic.keyPoints)),
        section('Common mistakes', mistakes(topic)),
        topic.deeper && section(`Go deeper (optional): ${topic.deeper.title}`, join([numbered(topic.deeper.steps), `**The result.** ${prose(topic.deeper.result)}`])),
        section('Practise', join(['Try each one yourself first: on paper, in code or out loud. Then open the answer and compare.', practice])),
        section('Check you understood', join(['Answer in your head first, then open each one.', questions(topic.followUps)])),
        section('Go further (optional)', join(['The lesson above is enough on its own. These free extras give a second explanation.', resources(topic.resources)])),
    ]);
};

const sqlBody = (topic: SqlTopic): string => {
    const answers = sqlAnswers[topic.id];
    const practice = SQL_CHECK_KEYS.map((key, i) => {
        const answer = answers?.[key];
        const shown = answer ? join([paragraphs(answer.answer), answer.query && sqlExample(answer.query)]) : '';
        return join([`### ${i + 1}. ${SQL_CHECK_LABELS[key]}`, prose(topic.practice[key]), shown && folded('Show one good answer', shown)]);
    }).join('\n\n');
    const tail = [
        section('Common mistakes', mistakes(topic)),
        section('Other databases', bullets(topic.dialects)),
        section('In the interview', join([paragraphs(topic.interviewAnswer), questions(topic.followUps)])),
        section('Practise', join(['Write each answer yourself first, then open the answer and compare.', practice])),
        section('Go further (optional)', resources(topic.resources)),
    ];
    if (topic.kind === 'lesson') {
        return join([
            section('The problem it solves', paragraphs(topic.problem)),
            section('The idea', paragraphs(topic.idea)),
            section('Analogy', join([paragraphs(topic.analogy), `**Where the analogy breaks.** ${prose(topic.breaks)}`])),
            topic.syntax && section('Syntax', fenced(topic.syntax, 'sql')),
            section('How it works, step by step', numbered(topic.howItWorks)),
            section('Picture it', diagram(topic.diagram)),
            section('Examples on the practice database', topic.examples.map(sqlExample).join('\n\n---\n\n')),
            section('Must know', bullets(topic.keyPoints)),
            ...tail,
        ]);
    }
    return join([
        section('What the question tests', paragraphs(topic.problem)),
        section('The pattern', join([`**${prose(topic.pattern)}** · ${SQL_DIFFICULTY_LABELS[topic.difficulty]} · tables: ${topic.tables.map(name => `\`${name}\``).join(', ')}`, `**How to spot it.** ${prose(topic.spot)}`])),
        section('Picture it', diagram(topic.diagram)),
        section('How to approach it', numbered(topic.approach)),
        section('Solution', folded('Show the solution', sqlExample(topic.solution))),
        topic.alternatives?.length ? section('Other correct ways', folded('Show them', topic.alternatives.map(sqlExample).join('\n\n---\n\n'))) : '',
        section('Edge cases to say out loud', bullets(topic.edgeCases)),
        ...tail,
    ]);
};

const systemDesignBody = (topic: SDTopic): string => {
    const answers = systemDesignAnswers[topic.id];
    const practice = SD_CHECK_KEYS.map((key, i) => {
        const answer = answers?.[key];
        const shown = answer ? join([paragraphs(answer.answer), answer.code && fenced(answer.code, answer.codeLanguage ?? 'text')]) : '';
        return join([`### ${i + 1}. ${SD_CHECK_LABELS[key]}`, prose(topic.practice[key]), shown && folded('Show one good answer', shown)]);
    }).join('\n\n');
    const tail = [
        topic.code && section('In code', fenced(topic.code, topic.codeLanguage ?? 'text')),
        section('Common mistakes', mistakes(topic)),
        section('In the interview', join([paragraphs(topic.interviewAnswer), questions(topic.followUps)])),
        section('Practise', join(['Try each one yourself first, then open the answer and compare.', practice])),
        section('Go further (optional)', resources(topic.resources)),
    ];
    if (topic.kind === 'concept') {
        return join([
            section('The problem it solves', paragraphs(topic.problem)),
            section('The idea', paragraphs(topic.idea)),
            section('How it works, step by step', numbered(topic.howItWorks)),
            section('Picture it', diagram(topic.diagram)),
            section('Analogy', join([paragraphs(topic.analogy), `**Where the analogy breaks.** ${prose(topic.breaks)}`])),
            section('Example', paragraphs(topic.example)),
            section('Must know', bullets(topic.keyPoints)),
            section('Trade-offs', bullets(topic.tradeOffs)),
            ...tail,
        ]);
    }
    return join([
        section('Why interviewers ask it', paragraphs(topic.problem)),
        section('Functional requirements', bullets(topic.functional)),
        section('Non-functional requirements', bullets(topic.nonFunctional)),
        section('Estimates', bullets(topic.estimates)),
        section('API', bullets(topic.api)),
        section('Data model', bullets(topic.dataModel)),
        section('Classes', bullets(topic.classes)),
        section('Patterns used', bullets(topic.patterns)),
        section('From version 1 to the final design', numbered(topic.evolution)),
        section('The design, step by step', numbered(topic.design)),
        section('Picture it', diagram(topic.diagram)),
        section('Deep dives', bullets(topic.deepDives)),
        ...tail,
    ]);
};

// ============ THE BOOK ============

type AnyTopic = FoundationTopic | SqlTopic | SDTopic;

const FULL = new Map<string, { topic: AnyTopic; body: () => string; tag?: string }>([
    ...foundationPhases.flatMap(phase => phase.topics.map(topic => [topic.id, { topic, body: () => foundationBody(topic) }] as const)),
    ...sqlPhases.flatMap(phase => phase.topics.map(topic => [topic.id, { topic, body: () => sqlBody(topic), tag: SQL_PRIORITY_LABELS[topic.priority] }] as const)),
    ...systemDesignPhases.flatMap(phase => phase.topics.map(topic => [topic.id, { topic, body: () => systemDesignBody(topic), tag: SD_PRIORITY_LABELS[topic.priority] }] as const)),
]);

const unitDir = (unit: PathUnit) => `unit-${unit.number}-${unit.id}`;
const slugOf = (course: CourseInfo, topicId: string) => topicPath(course, topicId).split('/').filter(Boolean).pop()!;
const lessonFile = (course: CourseInfo, unit: PathUnit, topicId: string) => `lessons/${COURSE_DIR[course.id]}/${unitDir(unit)}/${slugOf(course, topicId)}.md`;

/** A link from one page of the book to another, relative so it works on GitHub and in a clone. */
const relative = (from: string, to: string): string => {
    const here = from.split('/').slice(0, -1);
    const there = to.split('/');
    let same = 0;
    while (same < here.length && same < there.length - 1 && here[same] === there[same]) same++;
    return [...here.slice(same).map(() => '..'), ...there.slice(same)].join('/');
};

const lessonPages = (): BookPage[] =>
    COURSES.flatMap(course => {
        const ordered = course.units.flatMap(unit => unit.topics.map(topic => ({ unit, topic })));
        return ordered.map(({ unit, topic }, at) => {
            const full = FULL.get(topic.id);
            if (!full) throw new Error(`No lesson for ${topic.id}`);
            const path = lessonFile(course, unit, topic.id);
            const place = `${course.title} · Unit ${unit.number}: ${unit.title} · Lesson ${unit.topics.findIndex(t => t.id === topic.id) + 1} of ${unit.topics.length}${full.tag ? ` · ${full.tag}` : ''}`;
            const previous = ordered[at - 1];
            const next = ordered[at + 1];
            const nav = [
                previous && `[← ${prose(previous.topic.name)}](${relative(path, lessonFile(course, previous.unit, previous.topic.id))})`,
                `[All lessons](${relative(path, 'lessons/README.md')})`,
                next && `[${prose(next.topic.name)} →](${relative(path, lessonFile(course, next.unit, next.topic.id))})`,
            ]
                .filter(Boolean)
                .join(' · ');
            const text = join([
                NOTE,
                `# ${prose(topic.name)}`,
                `**${place}**`,
                `> **In one line.** ${prose(full.topic.definition)}`,
                `[Open this lesson on the site](${SITE_URL}${topicPath(course, topic.id)}) for its animation, the practice game and tap-to-explain words.`,
                full.body(),
                `---\n\n${nav}`,
            ]);
            return { path, text: `${text}\n` };
        });
    });

const interviewPage = (set: InterviewSet, course: CourseInfo): BookPage => {
    const path = `lessons/interview-questions/${set.id}.md`;
    const lessonLink = (topicId: string) => {
        const unit = course.units.find(u => u.topics.some(t => t.id === topicId));
        const topic = unit?.topics.find(t => t.id === topicId);
        return unit && topic ? `[${prose(topic.name)}](${relative(path, lessonFile(course, unit, topicId))})` : '';
    };
    const body = set.questions
        .map((q, i) =>
            join([
                `## ${i + 1}. ${prose(q.q)}`,
                `**${INTERVIEW_LEVEL_LABELS[q.level]}** · ${q.kind === 'scenario' ? 'Scenario' : 'Concept'}`,
                `**They are checking:** ${prose(q.testing)}`,
                folded(
                    'Show the answer',
                    join([
                        `**Say this**\n\n${paragraphs(q.answer)}`,
                        `**In everyday words.** ${prose(q.analogy)}`,
                        q.diagram && diagram(q.diagram),
                        q.steps?.length ? `**${q.kind === 'scenario' ? 'What to check, in order' : 'The answer, part by part'}**\n\n${numbered(q.steps)}` : '',
                        `**What makes it a strong answer**\n\n${bullets(q.strong)}`,
                        `**What weak answers say**\n\n${bullets(q.traps)}`,
                        `**Follow-up questions**\n\n${questions(q.followUps)}`,
                    ]),
                ),
                `Learn it first: ${q.topicIds.map(lessonLink).filter(Boolean).join(' · ')}`,
            ]),
        )
        .join('\n\n---\n\n');
    return {
        path,
        text: `${join([NOTE, `# Interview questions: ${prose(set.title)}`, prose(set.blurb), `Say your answer out loud first, then open the answer. ${set.questions.length} questions. [All lessons](${relative(path, 'lessons/README.md')})`, body])}\n`,
    };
};

const INTERVIEW_SETS: [InterviewSet, Course][] = [
    [mlInterviewSet, 'foundations'],
    [genAiInterviewSet, 'foundations'],
    [sqlInterviewSet, 'sql'],
    [systemDesignInterviewSet, 'system_design'],
];

const indexPage = (): BookPage => {
    const path = 'lessons/README.md';
    const lessons = COURSES.reduce((n, course) => n + course.units.reduce((m, unit) => m + unit.topics.length, 0), 0);
    const courses = COURSES.map(course =>
        join([
            `## ${course.title}`,
            `${prose(course.tagline)} ${course.units.length} units · ${course.units.reduce((n, unit) => n + unit.topics.length, 0)} lessons.`,
            ...course.units.map(unit =>
                join([
                    `### Unit ${unit.number} · ${prose(unit.title)}`,
                    `${prose(unit.goal)} [Unit guide on the site](${SITE_URL}${unitPath(course, unit.id)})`,
                    unit.topics.map((topic, i) => `${i + 1}. [${prose(topic.name)}](${relative(path, lessonFile(course, unit, topic.id))})`).join('\n'),
                ]),
            ),
        ]),
    );
    const interviews = INTERVIEW_SETS.map(([set]) => `- [${prose(set.title)}](interview-questions/${set.id}.md): ${set.questions.length} questions`).join('\n');
    return {
        path,
        text: `${join([
            NOTE,
            '# AI Engineer Path: every lesson',
            `All ${lessons} lessons, readable here on GitHub. Each page has the full lesson: the idea step by step, a diagram, a worked example, the exercises with their answers folded away, and the questions to check yourself.`,
            `The lessons are best on the site, [${SITE_URL.replace('https://', '')}](${SITE_URL}): every lesson there also has an animation, a five-minute practice game, and words you can tap for a plain-English meaning.`,
            `Found a mistake? [Open an issue](${REPO_URL}/issues/new/choose), or fix the lesson in \`src/data\` and run \`npm run lessons\`: see [CONTRIBUTING.md](../CONTRIBUTING.md).`,
            ...courses,
            '## Interview questions',
            interviews,
        ])}\n`,
    };
};

/** Every page of the book, in reading order. */
export const lessonBook = (): BookPage[] => [
    indexPage(),
    ...lessonPages(),
    ...INTERVIEW_SETS.map(([set, course]) => interviewPage(set, COURSES.find(c => c.id === course)!)),
];
