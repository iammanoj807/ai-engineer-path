import { beforeAll, describe, expect, it } from 'vitest';
import initSqlJs, { type SqlJsStatic } from 'sql.js';
import { allSqlTopics } from '../../data/sql';
import { sqlAnswers } from '../../data/sqlAnswers';
import { practiceTables } from '../../data/sqlPracticeDb';
import { runOnPracticeDb } from '../../utils/sqlRunner';
import {
    asksForOrder,
    checksProven,
    compareResults,
    isCheckableTask,
    predictOptions,
    sortsItsResult,
    sqlPracticeCards,
    type CardOutcome,
    type SqlCard,
} from '../sql';

let SQL: SqlJsStatic;
beforeAll(async () => {
    SQL = await initSqlJs();
});

const table = (columns: string[], rows: (string | number | null)[][]) => ({ columns, rows });
const expected = table(['category', 'products'], [['Bags', 1], ['Electronics', 2], ['Home', 1]]);

describe('comparing a query result with the answer', () => {
    it('accepts the same rows', () => {
        expect(compareResults(expected, expected, 'required')).toEqual({ ok: true });
    });

    it('accepts any row order unless the question asks for one', () => {
        const shuffled = table(['category', 'products'], [['Home', 1], ['Bags', 1], ['Electronics', 2]]);
        expect(compareResults(shuffled, expected, 'none')).toEqual({ ok: true });
        expect(compareResults(shuffled, expected, 'shown').ok).toBe(true);
        expect(compareResults(shuffled, expected, 'required')).toMatchObject({ ok: false, reason: 'order' });
    });

    it('accepts other column names and another column order', () => {
        const swapped = table(['n', 'cat'], [[1, 'Bags'], [2, 'Electronics'], [1, 'Home']]);
        expect(compareResults(swapped, expected, 'required')).toEqual({ ok: true });
    });

    it('treats 27.5 and 27.500000000001, and 2 and 2.0, as the same number', () => {
        const avg = table(['avg'], [[27.5], [2]]);
        expect(compareResults(table(['x'], [[27.500000000001], [2.0]]), avg, 'none')).toEqual({ ok: true });
    });

    it('says what is wrong: columns, row count, rounding, values', () => {
        expect(compareResults(table(['category'], [['Bags'], ['Electronics'], ['Home']]), expected, 'none')).toMatchObject({ ok: false, reason: 'columns' });
        expect(compareResults(table(['category', 'products'], [['Bags', 1]]), expected, 'none')).toMatchObject({ ok: false, reason: 'rows' });
        expect(compareResults(table(['category', 'products'], []), expected, 'none')).toMatchObject({ ok: false, reason: 'rows', message: expect.stringContaining('no rows') });
        expect(compareResults(table(['a'], [[27], [3]]), table(['a'], [[27.1], [3]]), 'none')).toMatchObject({ ok: false, reason: 'close' });
        expect(compareResults(table(['category', 'products'], [['Bags', 1], ['Electronics', 5], ['Home', 1]]), expected, 'none')).toMatchObject({ ok: false, reason: 'values' });
    });

    it('keeps NULL apart from 0 and from the text NULL', () => {
        const withNull = table(['v'], [[null]]);
        expect(compareResults(table(['v'], [[0]]), withNull, 'none').ok).toBe(false);
        expect(compareResults(table(['v'], [['NULL']]), withNull, 'none').ok).toBe(false);
        expect(compareResults(withNull, withNull, 'none').ok).toBe(true);
    });
});

describe('row order', () => {
    it('finds an ORDER BY of the result, not one inside OVER (...) or a subquery', () => {
        expect(sortsItsResult('SELECT * FROM t ORDER BY a;')).toBe(true);
        expect(sortsItsResult('SELECT a, ROW_NUMBER() OVER (ORDER BY a) FROM t;')).toBe(false);
        expect(sortsItsResult('SELECT * FROM (SELECT * FROM t ORDER BY a LIMIT 3) x;')).toBe(false);
        expect(sortsItsResult("SELECT 'ORDER BY' AS label FROM t;")).toBe(false);
    });

    it('knows when a question asks for an order', () => {
        expect(asksForOrder('…in each category, sorted by category.')).toBe(true);
        expect(asksForOrder('List them highest first.')).toBe(true);
        expect(asksForOrder('Count the orders for each customer.')).toBe(false);
    });
});

describe('predict choices', () => {
    it('are four whole numbers in a row, never below 0, one of them right', () => {
        for (const rows of [0, 1, 2, 3, 10]) {
            for (const seed of ['a', 'b', 'c', 'd', 'e']) {
                const options = predictOptions(rows, seed);
                expect(options).toHaveLength(4);
                expect(options).toContain(rows);
                expect(Math.min(...options)).toBeGreaterThanOrEqual(0);
                expect(options).toEqual([...options].sort((x, y) => x - y));
            }
        }
    });

    it('put the right answer in different places', () => {
        const places = new Set(allSqlTopics.map(topic => predictOptions(5, topic.id).indexOf(5)));
        expect(places.size).toBe(4);
    });
});

describe('which tasks can be checked by their rows', () => {
    it('takes a self-contained task with one result', () => {
        expect(isCheckableTask('Write a query for the 2 most expensive products, showing product_name and price.', 'SELECT …')).toBe(true);
        expect(isCheckableTask('Give everyone in Engineering a 10% raise, then show their names and new salaries.', 'UPDATE …; SELECT …')).toBe(true);
        expect(isCheckableTask('Find customers who bought every product in the Electronics category. (Who bought the phone case?)', 'SELECT …')).toBe(true);
        expect(isCheckableTask('Write a query for categories whose average price is above £10.', 'SELECT …')).toBe(true);
    });

    it('leaves out questions, tasks that need the lesson open, second tasks and query plans', () => {
        expect(isCheckableTask('Will he appear in `SELECT name FROM employees WHERE dept_id = 1;`?', 'SELECT …')).toBe(false);
        expect(isCheckableTask('Rewrite the first example so order 106 still appears.', 'SELECT …')).toBe(false);
        expect(isCheckableTask('Change the solution to also list employees with no manager.', 'SELECT …')).toBe(false);
        expect(isCheckableTask('Find the duplicate emails. Then delete the duplicates.', 'SELECT …')).toBe(false);
        expect(isCheckableTask('Make the total show 0, and explain where the COALESCE goes.', 'SELECT …')).toBe(false);
        expect(isCheckableTask('Write EXPLAIN QUERY PLAN for employees in department 2.', 'EXPLAIN QUERY PLAN SELECT …')).toBe(false);
        expect(isCheckableTask('Create a table reviews, then insert two rows and select them.', 'CREATE TABLE reviews …')).toBe(false);
    });
});

describe('what a session proves', () => {
    const cards = (kinds: SqlCard['kind'][]): SqlCard[] =>
        kinds.map((kind, i) =>
            kind === 'predict'
                ? { kind, id: `c${i}`, sql: '', result: table([], []), options: [] }
                : { kind, id: `c${i}`, check: 'write', label: '', prompt: '', answerSql: '', expected: table([], []), order: 'none' }
        );
    const outcome = (o: Partial<CardOutcome>): CardOutcome => ({ firstTry: false, solved: false, revealed: false, ...o });

    it('ticks Predict only when every predict card was right first time', () => {
        const session = cards(['predict', 'predict']);
        expect(checksProven(session, { c0: outcome({ firstTry: true, solved: true }), c1: outcome({ firstTry: true, solved: true }) })).toEqual(['predict']);
        expect(checksProven(session, { c0: outcome({ firstTry: true, solved: true }), c1: outcome({ solved: true }) })).toEqual([]);
    });

    it('ticks Write when every writing card is solved without looking at the answer, even on a second try', () => {
        const session = cards(['write', 'write', 'predict']);
        const right = outcome({ firstTry: true, solved: true });
        expect(checksProven(session, { c0: outcome({ solved: true }), c1: outcome({ solved: true }), c2: right })).toEqual(['write', 'predict']);
        expect(checksProven(session, { c0: outcome({ solved: true, revealed: true }), c1: outcome({ solved: true }), c2: right })).toEqual(['predict']);
        expect(checksProven(session, {})).toEqual([]);
    });
});

describe('every SQL lesson', () => {
    const sessions = allSqlTopics.map(topic => ({ topic, cards: sqlPracticeCards(topic, sqlAnswers[topic.id]) }));

    it('has a practice session in every lesson whose queries return rows, with something to write in most', () => {
        for (const { topic, cards } of sessions) {
            expect(new Set(cards.map(card => card.id)).size, topic.id).toBe(cards.length);
            if (cards.length > 0) continue;
            // Only a lesson about query plans may have none: there is no set of rows to predict or match.
            const queries = topic.kind === 'lesson' ? topic.examples.map(example => example.sql) : [topic.solution.sql];
            expect(queries.every(sql => /\b(EXPLAIN|PRAGMA)\b/i.test(sql)), `${topic.id} has no practice cards`).toBe(true);
        }
        expect(sessions.filter(({ cards }) => cards.length >= 3).length).toBeGreaterThanOrEqual(48);
        expect(sessions.filter(({ cards }) => cards.some(card => card.kind === 'write')).length).toBeGreaterThanOrEqual(48);
    });

    it('never shows a query in a predict card that a writing card asks for', () => {
        const flat = (sql: string) => sql.replace(/\s+/g, ' ').trim().toLowerCase();
        for (const { topic, cards } of sessions) {
            const answers = cards.flatMap(card => (card.kind === 'write' ? [flat(card.answerSql)] : []));
            for (const card of cards) if (card.kind === 'predict') expect(answers, topic.id).not.toContain(flat(card.sql));
        }
    });

    it('accepts its own answers, whatever order the database returns unsorted rows in', () => {
        for (const { topic, cards } of sessions) {
            for (const card of cards) {
                if (card.kind !== 'write') continue;
                for (const reverseUnordered of [false, true]) {
                    const result = runOnPracticeDb(SQL, card.answerSql, { reverseUnordered });
                    expect(compareResults(result, card.expected, card.order), `${topic.id} ${card.id} (reverse: ${reverseUnordered})`).toMatchObject({ ok: true });
                }
            }
        }
    });

    it('predicts the number of rows the query really returns', () => {
        for (const { topic, cards } of sessions) {
            for (const card of cards) {
                if (card.kind !== 'predict') continue;
                const rows = runOnPracticeDb(SQL, card.sql).rows.length;
                expect(rows, `${topic.id} ${card.id}`).toBe(card.result.rows.length);
                expect(card.options, `${topic.id} ${card.id}`).toContain(rows);
            }
        }
    });

    it('refuses a query that only gets the table right', () => {
        // SELECT * from the right table is not a full answer, unless the answer is just that (the first lessons).
        let refused = 0;
        for (const { cards } of sessions) {
            for (const card of cards) {
                if (card.kind !== 'write') continue;
                const tableName = card.answerSql.match(/\bFROM\s+([a-z_]+)/i)?.[1];
                if (!tableName || !practiceTables.some(t => t.name === tableName) || /^\s*SELECT\s+\*\s+FROM\s+[a-z_]+\s*(ORDER BY [^;]*)?;?\s*$/i.test(card.answerSql)) continue;
                const lazy = runOnPracticeDb(SQL, `SELECT * FROM ${tableName};`);
                if (!compareResults(lazy, card.expected, card.order).ok) refused++;
                else throw new Error(`${card.id}: SELECT * FROM ${tableName} passes`);
            }
        }
        expect(refused).toBeGreaterThan(50);
    });
});
