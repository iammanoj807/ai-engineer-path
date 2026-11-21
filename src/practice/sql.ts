// The SQL cards of a practice session (the rest are in build.ts): checked by
// the computer, not ticked on trust. Every card is made from what the lesson
// already has (its worked examples and its practice answers, each with the
// exact rows it returns), so practice never repeats or invents content.
//
//   Predict the rows: read a query, pick how many rows it returns.
//   Write the query / Solve the problem: write SQL; it runs on the practice
//     database and its rows are compared with the answer's rows.
//   Fix the query: a working answer with one small, real-world bug put in.
//
// Passing the cards proves the Predict and Write checks. Explain is spoken, and
// most Edge cases exercises are questions to reason about, so those two stay
// ticks you give yourself. A writing card is only made from a self-contained
// task whose answer is a set of rows (see isCheckableTask).

import type { SqlCheckKey, SqlResultTable, SqlTopic, SqlTopicAnswers } from '../data/sql';
import type { SqlCell } from '../data/sqlPracticeDb';
import type { FixCard } from './cards';

export interface PredictCard {
    kind: 'predict';
    id: string;
    sql: string;
    /** The rows it returns, shown after answering. */
    result: SqlResultTable;
    /** Four row counts to choose from, in order, one of them right. */
    options: number[];
}

/** How much the order of the rows matters for a written query. */
export type RowOrder =
    /** The question asks for an order, and the answer sorts: the order must match. */
    | 'required'
    /** The answer sorts, but the question doesn't ask: any order is right. */
    | 'shown'
    | 'none';

export interface WriteCard {
    kind: 'write';
    id: string;
    /** The check this card proves. */
    check: Extract<SqlCheckKey, 'write'>;
    label: string;
    /** The question, as the lesson words it. */
    prompt: string;
    /** One good answer, shown only when asked for. */
    answerSql: string;
    expected: SqlResultTable;
    order: RowOrder;
}

export type SqlCard = PredictCard | WriteCard;

export const CARD_LABELS = {
    predict: 'PREDICT THE ROWS',
    solve: 'SOLVE THE PROBLEM',
    write: 'WRITE THE QUERY',
} as const;

// ============ BUILDING A SESSION ============

/** A small stable number from a string, so a card's choices don't move between visits. */
export const seedOf = (text: string) => [...text].reduce((hash, ch) => (hash * 31 + ch.charCodeAt(0)) >>> 0, 7);

/** Four consecutive counts (never below 0) with the right one at a position set by the seed. */
export const predictOptions = (rows: number, seed: string): number[] => {
    const shift = Math.min(seedOf(seed) % 4, rows);
    return [0, 1, 2, 3].map(i => rows - shift + i);
};

/** The last statement, without its strings or anything in brackets (subqueries, OVER (...)). */
const outerLevel = (sql: string) => {
    const statements = sql.split(';').map(s => s.trim()).filter(Boolean);
    let text = (statements[statements.length - 1] ?? '').replace(/'(?:[^']|'')*'/g, "''").replace(/--[^\n]*/g, '');
    for (let previous = ''; previous !== text; ) {
        previous = text;
        text = text.replace(/\([^()]*\)/g, '');
    }
    return text;
};

/** True when the query's own result is sorted (an ORDER BY outside any brackets). */
export const sortsItsResult = (sql: string) => /\bORDER\s+BY\b/i.test(outerLevel(sql));

/** True when the question itself asks for the rows in an order. */
export const asksForOrder = (prompt: string) =>
    /\bsort(ed|s)?\b|\border(ed)?\s+(by|from)\b|\bin\s+(\w+\s+)?order\b|\b(highest|lowest|newest|oldest|latest|earliest)\s+first\b|\b(from\s+)?(high|low)\s+to\s+(low|high)\b|\bdescending\b|\bascending\b|\balphabetical(ly)?\b|\bat\s+the\s+(end|start|top|bottom)\b/i.test(prompt);

/** Words that point at something the practice card doesn't show. */
const NEEDS_CONTEXT = /\b(example|solution|the original|this version|the version|the query above|shown above)\b/i;
/** A second task after the first ("then delete…"), unless it only shows the result ("then show…"). */
const SECOND_TASK = /\bthen\b(?!\s+(show|list|select|return)\b)/i;
/** Answers whose rows are not the point: query plans, or tables you fill with your own values. */
const NOT_A_RESULT = /\b(EXPLAIN|PRAGMA|CREATE)\b/i;

/**
 * True when a task can be checked by its rows alone: it asks for one result,
 * stands on its own, isn't a question to reason about, and its answer is rows.
 */
export const isCheckableTask = (prompt: string, answerSql: string) =>
    !NOT_A_RESULT.test(answerSql) &&
    !NEEDS_CONTEXT.test(prompt) &&
    !SECOND_TASK.test(prompt) &&
    !/\b(explain|why)\b/i.test(prompt) &&
    // A question mark is fine only in a closing aside: "… (Who bought the phone case?)".
    !/\?/.test(prompt.replace(/\([^()]*\?\)\s*$/, ''));

const rowOrder = (prompt: string, answerSql: string): RowOrder =>
    sortsItsResult(answerSql) ? (asksForOrder(prompt) ? 'required' : 'shown') : 'none';

const writeCard = (id: string, label: string, prompt: string, answer: { sql: string; result?: SqlResultTable } | undefined): WriteCard[] =>
    answer?.result && isCheckableTask(prompt, answer.sql)
        ? [{ kind: 'write', id, check: 'write', label, prompt, answerSql: answer.sql, expected: answer.result, order: rowOrder(prompt, answer.sql) }]
        : [];

const predictCard = (id: string, example: { sql: string; result?: SqlResultTable } | undefined): PredictCard[] =>
    example?.result ? [{ kind: 'predict', id, sql: example.sql, result: example.result, options: predictOptions(example.result.rows.length, id) }] : [];

const sameSql = (a: string, b: string) => a.replace(/\s+/g, ' ').trim().toLowerCase() === b.replace(/\s+/g, ' ').trim().toLowerCase();

/**
 * The cards for one lesson, in the order they are played: a problem starts
 * with the problem itself; then reading queries (predict), then writing them.
 * A predict card never shows a query that a writing card asks for.
 */
export const sqlPracticeCards = (topic: SqlTopic, answers: SqlTopicAnswers | undefined): SqlCard[] => {
    const writing: WriteCard[] = [
        ...(topic.kind === 'problem' ? writeCard(`${topic.id}-solve`, CARD_LABELS.solve, topic.definition, topic.solution) : []),
        ...writeCard(`${topic.id}-write`, CARD_LABELS.write, topic.practice.write, answers?.write.query),
    ];
    const leaks = (sql: string) =>
        writing.some(card => sameSql(card.answerSql, sql)) ||
        (topic.kind === 'problem' && [topic.solution, ...(topic.alternatives ?? [])].some(example => sameSql(example.sql, sql)));

    // Rows you can count: anything but a query plan.
    const readable = (example: { sql: string; result?: SqlResultTable } | undefined) =>
        example?.result && !/\b(EXPLAIN|PRAGMA)\b/i.test(example.sql) && !leaks(example.sql) ? example : undefined;
    const reading: PredictCard[] = predictCard(`${topic.id}-predict`, readable(answers?.predict.query));
    // Then the lesson's worked examples, last first (the furthest from the start of the lesson),
    // until the session has three cards. A problem's own examples are its solutions, so never those.
    const examples = topic.kind === 'lesson' ? [...topic.examples].reverse() : [];
    for (const [i, example] of examples.entries()) {
        if (reading.length + writing.length >= 3 || reading.length >= 2 + (writing.length === 0 ? 1 : 0)) break;
        if (!readable(example) || reading.some(card => sameSql(card.sql, example.sql))) continue;
        reading.push(...predictCard(`${topic.id}-example-${examples.length - 1 - i}`, example));
    }

    const [solve, ...rest] = writing;
    return topic.kind === 'problem' && solve ? [solve, ...reading, ...rest] : [...reading, ...writing];
};

// ============ CHECKING A QUERY ============

export type Verdict =
    | { ok: true; note?: string }
    | { ok: false; reason: 'columns' | 'rows' | 'close' | 'values' | 'order'; message: string };

const plural = (n: number, word: string) => `${n} ${word}${n === 1 ? '' : 's'}`;

/** A cell as a comparable key: numbers to 10 significant figures, so 27.5 and 27.500000000001 match. */
const cellKey = (cell: SqlCell) =>
    cell === null ? '∅' : typeof cell === 'number' ? `n${Number.isInteger(cell) ? cell : Number(cell.toPrecision(10))}` : `s${cell}`;

const rowKey = (row: SqlCell[]) => row.map(cellKey).join('\u0001');

const sameMultiset = (a: SqlCell[][], b: SqlCell[][]) => {
    if (a.length !== b.length) return false;
    const x = a.map(rowKey).sort();
    const y = b.map(rowKey).sort();
    return x.every((key, i) => key === y[i]);
};

const sameSequence = (a: SqlCell[][], b: SqlCell[][]) => a.length === b.length && a.every((row, i) => rowKey(row) === rowKey(b[i]));

/** Every order of the columns 0..n-1, the given order first. */
const permutations = (n: number): number[][] => {
    if (n <= 1) return [[...Array(n).keys()]];
    return permutations(n - 1).flatMap(p => [...Array(n).keys()].map(i => [...p.slice(0, i), n - 1, ...p.slice(i)]));
};

/** Ways to line up the learner's columns with the answer's: as written, by name, then any order (up to 6 columns). */
const columnOrders = (actual: string[], expected: string[]): number[][] => {
    const n = expected.length;
    const orders: number[][] = [[...Array(n).keys()]];
    const byName = expected.map(name => actual.findIndex(a => a.toLowerCase() === name.toLowerCase()));
    if (byName.every(i => i >= 0) && new Set(byName).size === n) orders.push(byName);
    if (n <= 6) orders.push(...permutations(n));
    return orders;
};

const reorder = (rows: SqlCell[][], order: number[]) => rows.map(row => order.map(i => row[i]));

/** Numbers within 1% of each other, everything else equal: the "check your rounding" case. */
const nearlySame = (a: SqlCell[][], b: SqlCell[][]) => {
    if (a.length !== b.length) return false;
    const sortKey = (row: SqlCell[]) => row.map(cell => (typeof cell === 'number' ? '#' : cellKey(cell))).join('\u0001');
    const x = [...a].sort((p, q) => sortKey(p).localeCompare(sortKey(q)));
    const y = [...b].sort((p, q) => sortKey(p).localeCompare(sortKey(q)));
    return x.every((row, r) =>
        row.every((cell, c) => {
            const other = y[r][c];
            if (typeof cell === 'number' && typeof other === 'number') return Math.abs(cell - other) <= 0.01 * Math.max(1, Math.abs(cell), Math.abs(other));
            return cellKey(cell) === cellKey(other);
        })
    );
};

/**
 * Compare a query's result with the answer's. The rows must be the same, in
 * any order unless the question asks for one; the columns may come in any
 * order and have any names.
 */
export const compareResults = (actual: SqlResultTable, expected: SqlResultTable, order: RowOrder): Verdict => {
    if (actual.columns.length !== expected.columns.length) {
        return {
            ok: false,
            reason: 'columns',
            message: `Your query returns ${plural(actual.columns.length, 'column')}; the answer has ${plural(expected.columns.length, 'column')}: ${expected.columns.join(', ')}.`,
        };
    }
    for (const columns of columnOrders(actual.columns, expected.columns)) {
        const rows = reorder(actual.rows, columns);
        if (!sameMultiset(rows, expected.rows)) continue;
        if (sameSequence(rows, expected.rows) || order === 'none') return { ok: true };
        if (order === 'required') {
            return { ok: false, reason: 'order', message: 'The right rows, but not in the order the question asks for. Check your ORDER BY.' };
        }
        return { ok: true, note: 'The right rows. The answer also sorts them with ORDER BY, which makes a result easier to read.' };
    }
    if (actual.rows.length !== expected.rows.length) {
        return {
            ok: false,
            reason: 'rows',
            message: actual.rows.length === 0
                ? `Your query returns no rows; the answer has ${plural(expected.rows.length, 'row')}.`
                : `Your query returns ${plural(actual.rows.length, 'row')}; the answer has ${plural(expected.rows.length, 'row')}.`,
        };
    }
    if (columnOrders(actual.columns, expected.columns).some(columns => nearlySame(reorder(actual.rows, columns), expected.rows))) {
        return {
            ok: false,
            reason: 'close',
            message: 'Very close: some numbers are a little different. Check rounding, and whole-number division (in SQLite, 7 / 2 is 3, but 7 / 2.0 is 3.5).',
        };
    }
    return { ok: false, reason: 'values', message: `The same number of rows, but some values are different.` };
};

// ============ WHAT A SESSION PROVES ============

export interface CardOutcome {
    /** Right on the first try. */
    firstTry: boolean;
    /** Right in the end, without looking at the answer. */
    solved: boolean;
    /** The learner asked to see the answer. */
    revealed: boolean;
}

/** The checks a session can prove, in the order the lesson lists them. */
export const checksCovered = (cards: SqlCard[]): SqlCheckKey[] => [
    ...(cards.some(card => card.kind === 'write') ? (['write'] as const) : []),
    ...(cards.some(card => card.kind === 'predict') ? (['predict'] as const) : []),
];

/**
 * The checks a finished session proves. Predict: every predict card right first
 * time (four choices are easy to guess). Write: every writing card solved
 * without looking at the answer; another try is fine.
 */
export const checksProven = (cards: SqlCard[], outcomes: Record<string, CardOutcome | undefined>): SqlCheckKey[] => {
    const writing = cards.filter(card => card.kind === 'write');
    const predict = cards.filter(card => card.kind === 'predict');
    const proves: Partial<Record<SqlCheckKey, boolean>> = {
        write: writing.length > 0 && writing.every(card => outcomes[card.id]?.solved && !outcomes[card.id]?.revealed),
        predict: predict.length > 0 && predict.every(card => outcomes[card.id]?.firstTry),
    };
    return checksCovered(cards).filter(check => proves[check]);
};

// ============ FIX THE QUERY ============

export interface Mutation {
    sql: string;
    /** Where to look, without giving the fix away. */
    hint: string;
}

/** Matches of a pattern that are not inside a 'string literal'. */
const outsideStrings = (sql: string, pattern: RegExp) => {
    const strings = [...sql.matchAll(/'(?:[^']|'')*'/g)].map(m => [m.index ?? 0, (m.index ?? 0) + m[0].length]);
    return [...sql.matchAll(pattern)].filter(m => !strings.some(([from, to]) => (m.index ?? 0) >= from && (m.index ?? 0) < to));
};

const COMPARE_HINT = 'Look at the comparison: should the boundary value itself count?';
const JOIN_HINT = 'Look at the kind of join: which rows should stay when there is no match?';

/**
 * Small bugs of the kind people really make, each put into a working query
 * once: a comparison off by one, the sort turned round, a condition dropped,
 * the wrong join, counting rows instead of values, a missing DISTINCT.
 */
export const queryMutations = (sql: string): Mutation[] => {
    const out: Mutation[] = [];
    const first = (pattern: RegExp, to: (match: RegExpMatchArray) => string, hint: string) => {
        const match = outsideStrings(sql, pattern)[0];
        if (match?.index !== undefined) out.push({ sql: sql.slice(0, match.index) + to(match) + sql.slice(match.index + match[0].length), hint });
    };
    first(/>=/g, () => '>', COMPARE_HINT);
    first(/<=/g, () => '<', COMPARE_HINT);
    first(/(?<![<>=!-])>(?!=)/g, () => '>=', COMPARE_HINT);
    first(/(?<![<])<(?![=>])/g, () => '<=', COMPARE_HINT);
    first(/\bDESC\b/gi, () => 'ASC', 'Look at the sort direction.');
    first(/\bLEFT\s+JOIN\b/gi, () => 'JOIN', JOIN_HINT);
    first(/(?<!\b(?:LEFT|RIGHT|FULL|OUTER|CROSS)\s+)\b(?:INNER\s+)?JOIN\b/gi, () => 'LEFT JOIN', JOIN_HINT);
    first(/\bCOUNT\(\s*(?!\*|DISTINCT\b)[^()]+\)/gi, () => 'COUNT(*)', 'Look at what COUNT counts: every row, or only values that are not NULL?');
    first(/\bDISTINCT\s+/gi, () => '', 'Look for rows that appear more than once.');
    first(/\bCOALESCE\(\s*([^,()]+(?:\([^()]*\))?)\s*,\s*[^()]+\)/gi, match => match[1], 'What happens to NULL here?');
    first(/\s+AND\s+[^;\n]+?(?=\s+(?:AND|OR|GROUP\s+BY|ORDER\s+BY|HAVING|LIMIT)\b|\s*\)|\s*;|\s*$)/gi, () => '', 'A condition is missing.');
    first(/\bLIMIT\s+(\d+)/gi, match => `LIMIT ${Number(match[1]) + 1}`, 'Look at how many rows it keeps.');
    first(/\bMAX\(/gi, () => 'MIN(', 'Does it want the largest value, or the smallest?');
    first(/\bMIN\(/gi, () => 'MAX(', 'Does it want the smallest value, or the largest?');
    first(/\bIS\s+NOT\s+NULL\b/gi, () => 'IS NULL', 'Look at the NULL check.');
    first(/\bIS\s+NULL\b/gi, () => 'IS NOT NULL', 'Look at the NULL check.');
    first(/\bNOT\s+(IN|EXISTS)\b/gi, match => match[1], 'Look for a NOT that went missing.');
    first(/\bUNION\s+ALL\b/gi, () => 'UNION', 'Should rows that appear in both parts be kept twice?');
    first(/((?:>=|<=|(?<![<>!=])<(?![=>])|(?<![<>!=-])>(?!=))\s*)(\d+)(?![\d.])/g, match => `${match[1]}${Number(match[2]) + 1}`, 'Look at the boundary: one more or one less changes which rows count.');
    first(/\bOR\b/g, () => 'AND', 'Look at how the conditions are combined: AND or OR?');
    return out.filter(mutation => mutation.sql !== sql);
};

/**
 * A "fix the query" card from a writing card: the answer with one bug that
 * still runs and gives different rows (a bug that changes nothing, or breaks
 * the query outright, would not be a fair puzzle). Null when none qualifies.
 */
export const sqlFixCard = (card: WriteCard, run: (sql: string) => SqlResultTable): FixCard | null => {
    // A bug in a recursive query can take away what stops it, and it would run until the page runs out of memory.
    if (/\bRECURSIVE\b/i.test(card.answerSql)) return null;
    const mutations = queryMutations(card.answerSql);
    // Start somewhere different for each card, so sessions get different kinds of bug.
    const start = seedOf(card.id) % Math.max(1, mutations.length);
    for (const mutation of [...mutations.slice(start), ...mutations.slice(0, start)]) {
        try {
            const result = run(mutation.sql);
            if (result.columns.length === 0 || compareResults(result, card.expected, card.order).ok) continue;
            return {
                kind: 'fix',
                id: `${card.id}-fix`,
                prompt: card.prompt,
                brokenSql: mutation.sql,
                answerSql: card.answerSql,
                expected: card.expected,
                order: card.order,
                hint: mutation.hint,
            };
        } catch {
            // It doesn't run: not a fair bug.
        }
    }
    return null;
};
