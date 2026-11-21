import { describe, expect, it } from 'vitest';
import { INTERVALS, addDays, dueLessons, reviewsByCourse, scheduleAfter } from '../review';
import type { PracticeRecord } from '../../services/progress';

const TODAY = '2026-11-21';
const right = { allFirstTry: true, missed: [] };
const wrong = { allFirstTry: false, missed: ['t-blank-1'] };

describe('when a lesson comes back for review', () => {
    it('comes back tomorrow after it is first practised, right or not', () => {
        expect(scheduleAfter(undefined, right, TODAY)).toEqual({ due: '2026-11-22', step: 0, missed: [] });
        expect(scheduleAfter({ best: 50, last: TODAY, times: 1 }, wrong, TODAY)).toEqual({ due: '2026-11-22', step: 0, missed: ['t-blank-1'] });
    });

    it('comes back later and later while every review is right: 1, 3, 7, 14, 30, then 60 days', () => {
        let record: Partial<PracticeRecord> = { ...scheduleAfter(undefined, right, TODAY) };
        const gaps = [];
        for (let i = 0; i < 7; i++) {
            const next = scheduleAfter(record, right, TODAY);
            gaps.push(INTERVALS[next.step]);
            record = next;
        }
        expect(gaps).toEqual([3, 7, 14, 30, 60, 60, 60]);
    });

    it('a miss brings it back tomorrow, at the start again, with the missed cards', () => {
        expect(scheduleAfter({ best: 100, last: TODAY, times: 3, due: TODAY, step: 4 }, wrong, TODAY)).toEqual({ due: '2026-11-22', step: 0, missed: ['t-blank-1'] });
    });

    it('counts days across months and years', () => {
        expect(addDays('2026-12-30', 3)).toBe('2027-01-02');
        expect(addDays('2026-02-27', 2)).toBe('2026-03-01');
    });
});

describe('what is due', () => {
    const practice: Record<string, PracticeRecord> = {
        a: { best: 100, last: '2026-11-10', times: 1, due: '2026-11-20', step: 1 },
        b: { best: 80, last: '2026-11-19', times: 2, due: '2026-11-21', step: 0, missed: ['b-match'] },
        c: { best: 90, last: '2026-11-20', times: 1, due: '2026-11-24', step: 1 },
        // Practised before reviews existed: due the day after it was practised.
        old: { best: 70, last: '2026-11-01', times: 1 },
    };

    it('lists the lessons due today, most overdue first, with the cards they missed', () => {
        expect(dueLessons(practice, TODAY).map(l => [l.topicId, l.missed])).toEqual([
            ['old', []],
            ['a', []],
            ['b', ['b-match']],
        ]);
    });

    it('says, per course, what is due now and what comes next', () => {
        const reviews = reviewsByCourse({ foundations: practice, sql: { s: { best: 100, last: TODAY, times: 1, due: '2026-11-25', step: 1 } }, system_design: {} }, TODAY);
        expect(reviews.map(r => [r.course, r.due.length, r.next])).toEqual([
            ['foundations', 3, { day: '2026-11-24', count: 1 }],
            ['sql', 0, { day: '2026-11-25', count: 1 }],
        ]);
    });
});
