// npx vite-node scripts/voice/lines.ts
//
// Every line the guides can say, in the voice that says it, written to
// generated/voice-lines.json for scripts/voice/record.py to record. Sessions
// are built exactly as the site builds them (SQL fix cards included), and the
// words come from src/practice/lines.ts, the same as the speech bubbles.
//
// Each line also gets a speaking form: symbols said as words ("x cubed",
// "eta"), code hints left out, and SQL keywords in lower case so they are read
// as words, not spelled. The bubble still shows the line as written.

import { mkdirSync, writeFileSync } from 'node:fs';
import initSqlJs from 'sql.js';
import { allFoundationTopics } from '../../src/data/foundations';
import { allSqlTopics } from '../../src/data/sql';
import { allSystemDesignTopics } from '../../src/data/systemDesign';
import { sqlAnswers } from '../../src/data/sqlAnswers';
import { foundationsGlossary } from '../../src/utils/foundationsGlossary';
import { sqlGlossary } from '../../src/utils/sqlGlossary';
import { systemDesignGlossary } from '../../src/utils/glossary';
import type { GlossarySource } from '../../src/utils/glossaryEngine';
import { runOnPracticeDb } from '../../src/utils/sqlRunner';
import { buildSession, withFixCard, type AnyTopic, type PracticeGlossary } from '../../src/practice/build';
import { GREETING_LINES, MOMENT_LINES, cardLine } from '../../src/practice/lines';
import { GUIDES, guideFor, type Guide } from '../../src/components/practice/guides';
import { clipKey, tidyLine } from '../../src/components/practice/clipKey';

/** The recorded voice for each guide (Kokoro voices: see scripts/voice/record.py). Change one, and run both scripts again. */
export const VOICE_MODELS: Record<Guide, string> = { pia: 'af_heart', hamish: 'am_fenrir' };

const SQL_WORDS = /\b(SELECT|FROM|WHERE|GROUP BY|ORDER BY|HAVING|LEFT JOIN|RIGHT JOIN|INNER JOIN|FULL JOIN|CROSS JOIN|JOIN|COUNT|SUM|AVG|MIN|MAX|DISTINCT|LIMIT|OFFSET|NULL|CASE|WHEN|THEN|ELSE|END|UNION ALL|UNION|INSERT|UPDATE|DELETE|CREATE|TABLE|INDEX|WITH|RECURSIVE|OVER|PARTITION BY|ROW_NUMBER|DENSE_RANK|RANK|LAG|LEAD|COALESCE|BETWEEN|LIKE|EXISTS|AND|OR|NOT|IS|AS|ON|IN|ASC|DESC|ROUND|CAST|STRFTIME|SUBSTR|INSTR|LENGTH|UPPER|LOWER|TRIM|IFNULL|NULLIF|EXPLAIN|PRIMARY KEY|FOREIGN KEY|FULL|OUTER|INNER|LEFT|RIGHT|CROSS|INTERSECT|EXCEPT|ALTER|TRUNCATE|DROP|VALUES|SET|INTO|DEFAULT|UNIQUE|CHECK|VIEW|TRIGGER|BEGIN|COMMIT|ROLLBACK)\b/g;

const SAID_INSTEAD = "Here's one to work out. Take your time, then show the answer.";

/** How a line is said: the same words, made speakable. */
export const spokenForm = (text: string): string => {
    let said = tidyLine(text)
        // A code hint at the end is for reading, not hearing.
        .replace(/\s*\(Hint:[\s\S]*$/, '')
        .replace(/`[^`]*`/g, '')
        .replace(/(\w+)\.(\w+)\(\)/g, '$1 dot $2')
        .replace(/\bP\(([^|()]+?)\s*\|\s*([^()]+?)\)/g, 'the probability of $1 given $2')
        .replace(/\bP\(([^()]+)\)/g, 'the probability of $1')
        .replace(/\|(\w+)\|/g, 'the absolute value of $1')
        .replace(/\b([a-zA-Z])\((\w+), (\w+)\)/g, '$1 of $2 and $3')
        .replace(/(\w)³/g, '$1 cubed')
        .replace(/(\w)²/g, '$1 squared')
        .replace(/η/g, 'eta')
        .replace(/∇/g, 'the gradient of ')
        .replace(/σ/g, 'sigma')
        .replace(/γ/g, 'gamma')
        .replace(/ŷ/g, 'y hat')
        .replace(/\b([a-zA-Z]+)\((-?[\w.]+)\)/g, '$1 of $2')
        .replace(/£1\b(?!\.)/g, '1 pound')
        .replace(/£(\d+(?:\.\d+)?)/g, '$1 pounds')
        .replace(/(\w)_(?=\w)/g, '$1 ')
        .replace(/[−]/g, 'minus ')
        .replace(/→/g, ' to ')
        .replace(/×/g, ' times ')
        .replace(/·/g, ' dot ')
        .replace(/(\w)–(\w)/g, '$1 $2')
        .replace(/[—–]/g, ', ')
        .replace(/…/g, '...')
        .replace(/’/g, "'")
        .replace(/\s==\s/g, ' equals ')
        .replace(/\s=\s/g, ' equals ')
        .replace(/\s\+\s/g, ' plus ')
        .replace(/\[(-?[\d.]+(?:,\s*-?[\d.]+)+)\]/g, 'the vector $1')
        .replace(SQL_WORDS, word => word.toLowerCase().replace(/_/g, ' '));
    said = tidyLine(said.replace(/\s+([,.?!])/g, '$1'));
    said = said.charAt(0).toUpperCase() + said.slice(1);
    // Matrices and leftover code can't be read aloud sensibly: say something short instead.
    return /\[\[|[`{}<>]|\[/.test(said) ? SAID_INSTEAD : said;
};

const adapt = <T extends AnyTopic>(glossary: GlossarySource<T>): PracticeGlossary => ({
    terms: glossary.terms,
    getTerm: id => glossary.getTerm(id),
    segmentText: text => glossary.segmentText(text),
    termsIn: topic => glossary.termsInTopic(topic as T),
    newWordsIn: topic => glossary.newWordsForTopic(topic as T),
});

const SQL = await initSqlJs();
const courses = [
    { course: 'foundations', topics: allFoundationTopics, glossary: adapt(foundationsGlossary) },
    { course: 'sql', topics: allSqlTopics, glossary: adapt(sqlGlossary) },
    { course: 'system_design', topics: allSystemDesignTopics, glossary: adapt(systemDesignGlossary) },
] as const;

const lines = new Map<string, { guide: Guide; voice: string; key: string; text: string; say: string }>();
const add = (guide: Guide, text: string) => {
    const clean = tidyLine(text);
    const voice = VOICE_MODELS[guide];
    if (clean) lines.set(`${guide}|${clean}`, { guide, voice, key: clipKey(voice, clean), text: clean, say: spokenForm(clean) });
};

for (const { course, topics, glossary } of courses) {
    for (const topic of topics as AnyTopic[]) {
        let cards = buildSession(course, topic, { glossary, sqlAnswers });
        if (course === 'sql') cards = withFixCard(cards, sql => runOnPracticeDb(SQL, sql));
        const guide = guideFor(topic.id);
        for (const card of cards) {
            add(guide, cardLine(card));
            if (card.kind === 'blank') add(guide, cardLine(card, { choosing: true }));
        }
    }
}
// The moments can come in any lesson, so both guides say them.
for (const guide of GUIDES) for (const text of Object.values(MOMENT_LINES)) add(guide, text);
// Each guide's hello on the front page.
for (const guide of GUIDES) add(guide, GREETING_LINES[guide]);

const list = [...lines.values()].sort((a, b) => a.guide.localeCompare(b.guide) || a.text.localeCompare(b.text));
mkdirSync('generated', { recursive: true });
writeFileSync('generated/voice-lines.json', JSON.stringify({ voices: VOICE_MODELS, lines: list }, null, 1));

const words = list.reduce((n, line) => n + line.say.split(' ').length, 0);
const changed = list.filter(line => line.say !== line.text);
console.log(`${list.length} lines (${GUIDES.map(g => `${g} ${list.filter(l => l.guide === g).length}`).join(', ')}), ${words} words, about ${Math.round(words / 2.6 / 60)} minutes of speech.`);
console.log(`${changed.length} said differently from how they are written, ${changed.filter(line => line.say === SAID_INSTEAD).length} replaced by a short invitation.`);
if (process.env.SHOW) for (const line of changed) console.log(`  ${line.text}\n   → ${line.say}`);
