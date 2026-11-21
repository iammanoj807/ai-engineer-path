import { afterEach, describe, expect, it } from 'vitest';
import { DAILY_GOALS, lastDays, practiceXp, readDailyGoal, streakDays, writeDailyGoal, xpToday } from '../xp';

const today = '2026-11-21';

describe('XP and the streak, with practice', () => {
    it('counts a day with only practice towards the streak', () => {
        const activity = { days: { '2026-11-19': 2 }, xp: { '2026-11-20': 18, [today]: 22 } };
        expect(streakDays(activity, today)).toBe(3);
    });

    it('keeps yesterday\'s streak alive until something is done today', () => {
        expect(streakDays({ days: {}, xp: { '2026-11-20': 15 } }, today)).toBe(1);
        expect(streakDays({ days: {}, xp: { '2026-11-19': 15 } }, today)).toBe(0);
    });

    it('works out today\'s XP from ticks (10 each) and practice', () => {
        expect(xpToday({ days: { [today]: 2 }, xp: { [today]: 17 } }, today)).toBe(37);
        expect(xpToday({ days: {} }, today)).toBe(0);
        expect(practiceXp({ days: {}, xp: { a: 10, b: 25 } })).toBe(35);
    });

    it('gives each of the last days its XP', () => {
        expect(lastDays({ days: { [today]: 1 }, xp: { '2026-11-20': 12 } }, 3, today)).toEqual([
            { day: '2026-11-19', xp: 0 },
            { day: '2026-11-20', xp: 12 },
            { day: today, xp: 10 },
        ]);
    });
});

describe('the daily goal, in XP', () => {
    // vitest runs in Node: give it a small localStorage.
    const store = new Map<string, string>();
    globalThis.localStorage = {
        getItem: (key: string) => store.get(key) ?? null,
        setItem: (key: string, value: string) => void store.set(key, value),
        removeItem: (key: string) => void store.delete(key),
        clear: () => store.clear(),
        key: () => null,
        length: 0,
    };
    afterEach(() => store.clear());

    it('is 30 XP until chosen', () => {
        expect(readDailyGoal()).toBe(30);
    });

    it('moves a goal saved in checks (1, 3, 5 or 8) to the same goal in XP', () => {
        store.set('aep:v1:daily-goal', '5');
        expect(readDailyGoal()).toBe(50);
    });

    it('keeps a goal chosen in XP', () => {
        writeDailyGoal(80);
        store.set('aep:v1:daily-goal', '1');
        expect(readDailyGoal()).toBe(80);
        expect(DAILY_GOALS.map(goal => goal.xp)).toEqual([10, 30, 50, 80]);
    });
});
