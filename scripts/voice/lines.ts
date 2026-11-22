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

import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
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
import { buildLearnSession, interviewCard, lessonText, withFixCard, type AnyTopic, type InterviewSource, type PracticeGlossary } from '../../src/practice/build';
import { genAiInterviewSet } from '../../src/data/interviewPrep/genai';
import { mlInterviewSet } from '../../src/data/interviewPrep/ml';
import { sqlInterviewSet } from '../../src/data/interviewPrep/sql';
import { systemDesignInterviewSet } from '../../src/data/interviewPrep/systemDesign';
import { GREETING_LINES, MOMENT_LINES, READ_LINES, cardLine } from '../../src/practice/lines';
import { GUIDES, guideFor, type Guide } from '../../src/components/practice/guides';
import { clipKey, tidyLine } from '../../src/components/practice/clipKey';

/** The recorded voice for each guide (Kokoro voices: see scripts/voice/record.py). Change one, and run both scripts again. */
export const VOICE_MODELS: Record<Guide, string> = { ada: 'af_heart', alan: 'am_fenrir' };

const SQL_WORDS = /\b(SELECT|FROM|WHERE|GROUP BY|ORDER BY|HAVING|LEFT JOIN|RIGHT JOIN|INNER JOIN|FULL JOIN|CROSS JOIN|JOIN|COUNT|SUM|AVG|MIN|MAX|DISTINCT|LIMIT|OFFSET|NULL|CASE|WHEN|THEN|ELSE|END|UNION ALL|UNION|INSERT|UPDATE|DELETE|CREATE|TABLE|INDEX|WITH|RECURSIVE|OVER|PARTITION BY|ROW_NUMBER|DENSE_RANK|RANK|LAG|LEAD|COALESCE|BETWEEN|LIKE|EXISTS|AND|OR|NOT|IS|AS|ON|IN|ASC|DESC|ROUND|CAST|STRFTIME|SUBSTR|INSTR|LENGTH|UPPER|LOWER|TRIM|IFNULL|NULLIF|EXPLAIN|PRIMARY KEY|FOREIGN KEY|FULL|OUTER|INNER|LEFT|RIGHT|CROSS|INTERSECT|EXCEPT|ALTER|TRUNCATE|DROP|VALUES|SET|INTO|DEFAULT|UNIQUE|CHECK|VIEW|TRIGGER|BEGIN|COMMIT|ROLLBACK)\b/g;

const SAID_INSTEAD = "Here's one to work out. Take your time, then show the answer.";

/**
 * Names and short forms the voice model gets wrong, written the way they sound.
 * Each one was checked against the sounds the model makes for it (its phonemes:
 * `kokoro.tokenizer.phonemize(text, 'en-us')`), before and after, not guessed.
 */
const SOUNDS_LIKE: [RegExp, string][] = [
    // Read letter by letter as "V S" and "N T H".
    [/\bvs\.?(?=\s)/g, 'versus'],
    [/\b[Nn]th\b/g, 'enth'],
    // "eigen" with a hard g.
    [/\b([Ee])igen(?=value|vector)/g, '$1igan'],
    // Plurals of spelled-out names: the model drops the s, or reads the name as one word ("vee", "groo").
    [/\bVAEs\b/g, 'V eh Es'],
    [/\bGRUs\b/g, "G R U's"],
    [/\bCTEs\b/g, "C T E's"],
    [/\bLLMs\b/g, "L L M's"],
    [/\bLSTMs\b/g, "L S T M's"],
    [/\bRNNs\b/g, "R N N's"],
    [/\bGANs\b/g, 'gans'],
    [/\bNULLs\b/g, 'nulls'],
    // Letters the model would read as a word ("ap", "em", "oop", "umul").
    [/\bAP\b/g, 'A-P'],
    [/\bEM\b/g, 'E M'],
    [/\bOOP\b/g, 'O O P'],
    [/\bUML\b/g, 'U M L'],
    // Said as a word. (Alone the model says "rag", but inside a sentence it spells out R, A, G.)
    [/\bRAG\b/g, 'rag'],
    // Products and libraries.
    [/\bViT\b/g, 'vit'],
    [/\bLoRA\b/g, 'Lora'],
    [/\bRedis\b/g, 'reddiss'],
    [/\bMemcached\b/g, 'memcache dee'],
    [/\bpytest\b/g, 'py test'],
    [/\bUber\b/g, 'Oober'],
    [/\bbit\.ly\b/g, 'bitly'],
    [/\bnp\.allclose\b/g, 'np dot all close'],
    [/\benum\b/g, 'eenum'],
    [/(\d) GB\b/g, '$1 gigabytes'],
    // People in the practice tables.
    [/\bAsha\b/g, 'Ahsha'],
    [/\bEli\b/g, 'Eelye'],
    // A matrix or an array called A: the letter's name ("eh" is how the model says it), not the word "a".
    [/\bA(?= (?:has shape|dot |x equals))/g, 'Eh'],
];

/** How a line is said: the same words, made speakable. */
export const spokenForm = (text: string): string => {
    let said = tidyLine(text)
        // A code hint at the end is for reading, not hearing.
        .replace(/\s*\(Hint:[\s\S]*$/, '')
        // A short call in code is said, so the sentence keeps its subject: `COUNT(*)` is "count star", `MAX(salary)` is "max of salary".
        .replace(/`([A-Za-z_]+)\(\*\)`/g, '$1 star')
        .replace(/`([A-Za-z_]+)\(([\w.]+)\)`/g, '$1 of $2')
        .replace(/`[^`]*`/g, '')
        .replace(/(\w+)\.(\w+)\(\)/g, '$1 dot $2')
        .replace(/\bP\(([^|()]+?)\s*\|\s*([^()]+?)\)/g, 'the probability of $1 given $2')
        .replace(/\bP\(([^()]+)\)/g, 'the probability of $1')
        .replace(/\|(\w+)\|/g, 'the absolute value of $1')
        .replace(/\b([a-zA-Z])\((\w+), (\w+)\)/g, '$1 of $2 and $3')
        .replace(/(\w)⁴/g, '$1 to the fourth')
        .replace(/(\w)³/g, '$1 cubed')
        .replace(/(\w)²/g, '$1 squared')
        .replace(/(\w)\^\(([^()]+)\)/g, '$1 to the power of $2')
        .replace(/(\w)\^(-?\w+)/g, '$1 to the power of $2')
        // An attribute of a one-letter array, A.ndim, and the product Ax: said letter by letter, not as one word.
        .replace(/\b([A-Z])\.([a-z_]\w*)\b/g, '$1 dot $2')
        .replace(/\bAx\b/g, 'A x')
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
        // A slash between words is not said: "train/validation/test" is a list, "Open/Closed" and "pub/sub" are names.
        .replace(/\btrue\/false\b/gi, 'true or false')
        .replace(/(\w+)\/(\w+)\/(\w+)/g, '$1, $2, $3')
        .replace(/([A-Za-z])\/(?=[A-Za-z])/g, '$1 ')
        // The two signs named as things, as in "the difference between = and ==": said apart, or both would be "equals".
        .replace(/\s=\s+and\s+==(?=[\s?.,!]|$)/g, ' a single equals sign and a double equals sign')
        .replace(/\s==(?=[\s?.,!]|$)/g, ' equals')
        .replace(/\s=\s/g, ' equals ')
        .replace(/\s\+\s/g, ' plus ')
        .replace(/\[(-?[\d.]+(?:,\s*-?[\d.]+)+)\]/g, 'the vector $1')
        .replace(SQL_WORDS, word => word.toLowerCase().replace(/_/g, ' '));
    for (const [pattern, sound] of SOUNDS_LIKE) said = said.replace(pattern, sound);
    said = tidyLine(said.replace(/\s+([,.?!])/g, '$1'));
    said = said.charAt(0).toUpperCase() + said.slice(1);
    // Matrices and leftover code can't be read aloud sensibly: say something short instead.
    return /\[\[|[`{}<>]|\[/.test(said) ? SAID_INSTEAD : said;
};

const adapt = <T extends AnyTopic>(glossary: GlossarySource<T>): PracticeGlossary => ({
    terms: glossary.terms,
    getTerm: id => glossary.getTerm(id),
    segmentText: (text, topicId) => glossary.segmentText(text, topicId),
    termsIn: topic => glossary.termsInTopic(topic as T),
    newWordsIn: topic => glossary.newWordsForTopic(topic as T),
});

const SQL = await initSqlJs();
const questionsOf = (sets: { questions: InterviewSource[] }[]): InterviewSource[] => sets.flatMap(set => set.questions);
const courses = [
    { course: 'foundations', topics: allFoundationTopics, glossary: adapt(foundationsGlossary), questions: questionsOf([genAiInterviewSet, mlInterviewSet]) },
    { course: 'sql', topics: allSqlTopics, glossary: adapt(sqlGlossary), questions: questionsOf([sqlInterviewSet]) },
    { course: 'system_design', topics: allSystemDesignTopics, glossary: adapt(systemDesignGlossary), questions: questionsOf([systemDesignInterviewSet]) },
] as const;

const lines = new Map<string, { guide: Guide; voice: string; key: string; text: string; say: string }>();
const add = (guide: Guide, text: string) => {
    const clean = tidyLine(text);
    const voice = VOICE_MODELS[guide];
    if (clean) lines.set(`${guide}|${clean}`, { guide, voice, key: clipKey(voice, clean), text: clean, say: spokenForm(clean) });
};

for (const { course, topics, glossary, questions } of courses) {
    for (const topic of topics as AnyTopic[]) {
        // The step-by-step lesson has every line of the quick practice, and each part's
        // introduction too; then the interview question of later reviews.
        let cards = buildLearnSession(course, topic, { glossary, sqlAnswers });
        if (course === 'sql') cards = withFixCard(cards, sql => runOnPracticeDb(SQL, sql));
        cards = [...cards, ...interviewCard(lessonText(topic), questions)];
        const guide = guideFor(topic.id);
        for (const card of cards) {
            add(guide, cardLine(card));
            if (card.kind === 'blank') add(guide, cardLine(card, { choosing: true }));
        }
    }
}
// The moments can come in any lesson, so both guides say them.
for (const guide of GUIDES) for (const text of Object.values(MOMENT_LINES)) add(guide, text);
// What each coach says before each part of a step-by-step lesson.
for (const guide of GUIDES) for (const text of Object.values(READ_LINES)) add(guide, text);
// Each guide's hello on the front page.
for (const guide of GUIDES) add(guide, GREETING_LINES[guide]);

const list = [...lines.values()].sort((a, b) => a.guide.localeCompare(b.guide) || a.text.localeCompare(b.text));
mkdirSync('generated', { recursive: true });
writeFileSync('generated/voice-lines.json', JSON.stringify({ voices: VOICE_MODELS, lines: list }, null, 1));

const words = list.reduce((n, line) => n + line.say.split(' ').length, 0);
const changed = list.filter(line => line.say !== line.text);
console.log(`${list.length} lines (${GUIDES.map(g => `${g} ${list.filter(l => l.guide === g).length}`).join(', ')}), ${words} words, about ${Math.round(words / 2.6 / 60)} minutes of speech.`);
console.log(`${changed.length} said differently from how they are written, ${changed.filter(line => line.say === SAID_INSTEAD).length} replaced by a short invitation.`);

// What scripts/voice/record.py would record now: lines with no recording, and lines whose spoken words have changed since.
const recordedKeys = new Set<string>(existsSync('public/voice/manifest.json') ? Object.keys((JSON.parse(readFileSync('public/voice/manifest.json', 'utf8')) as { clips: Record<string, unknown> }).clips) : []);
const saidWhenRecorded: Record<string, string> = existsSync('scripts/voice/said.json') ? JSON.parse(readFileSync('scripts/voice/said.json', 'utf8')) : {};
const unrecorded = list.filter(line => !recordedKeys.has(line.key));
const reworded = list.filter(line => recordedKeys.has(line.key) && saidWhenRecorded[line.key] !== undefined && saidWhenRecorded[line.key] !== line.say);
if (unrecorded.length + reworded.length === 0) console.log('Every line has an up-to-date recording.');
else {
    console.log(`To record: ${unrecorded.length} line${unrecorded.length === 1 ? '' : 's'} with no recording yet, ${reworded.length} whose spoken words changed. Run scripts/voice/record.py (see docs/DEVELOPMENT.md).`);
    for (const line of [...unrecorded, ...reworded].slice(0, 12)) console.log(`   ${line.guide}: ${line.say}`);
}
if (process.env.SHOW) for (const line of changed) console.log(`  ${line.text}\n   → ${line.say}`);
