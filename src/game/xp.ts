// The game layer: XP, streak and the daily goal. All of it is worked out from
// the ticks themselves, so it can never drift from what the lessons show.

import type { Activity } from '../services/progress';
import { daysBefore, localDay } from './day';

export const XP_PER_CHECK = 10;
/** Extra XP for passing all four checks of a topic. */
export const XP_TOPIC_BONUS = 20;
export const XP_PER_BUILD = 25;

export interface ChecksDoc {
    checks: Record<string, Record<string, boolean | undefined> | undefined>;
}

export const checksPassedIn = (doc: ChecksDoc | undefined, topicId: string): number =>
    Object.values(doc?.checks[topicId] ?? {}).filter(value => value === true).length;

/** XP for one course: 10 per check, 20 more for each topic with all four. */
export const courseXp = (doc: ChecksDoc | undefined, topicIds: string[], builds = 0): number =>
    topicIds.reduce((sum, id) => {
        const passed = checksPassedIn(doc, id);
        return sum + passed * XP_PER_CHECK + (passed >= 4 ? XP_TOPIC_BONUS : 0);
    }, 0) + builds * XP_PER_BUILD;

/**
 * Days in a row with at least one tick, counting back from today. A day with
 * nothing yet today still keeps yesterday's streak alive until midnight.
 */
export const streakDays = (activity: Activity | undefined, today: string = localDay()): number => {
    const days = activity?.days ?? {};
    const active = (day: string) => (days[day] ?? 0) > 0;
    let day = active(today) ? today : daysBefore(today, 1);
    let count = 0;
    while (active(day)) {
        count += 1;
        day = daysBefore(day, 1);
    }
    return count;
};

export const ticksToday = (activity: Activity | undefined, today: string = localDay()): number =>
    activity?.days[today] ?? 0;

/** The last `n` days, oldest first, with how many ticks each had. */
export const lastDays = (activity: Activity | undefined, n: number, today: string = localDay()) =>
    Array.from({ length: n }, (_, i) => {
        const day = daysBefore(today, n - 1 - i);
        return { day, count: activity?.days[day] ?? 0 };
    });

// ============ DAILY GOAL ============

export const DAILY_GOALS = [
    { ticks: 1, label: 'Casual', detail: '1 check a day' },
    { ticks: 3, label: 'Regular', detail: '3 checks a day' },
    { ticks: 5, label: 'Serious', detail: '5 checks a day' },
    { ticks: 8, label: 'Intense', detail: '8 checks a day' },
] as const;

const GOAL_KEY = 'aep:v1:daily-goal';

export const readDailyGoal = (): number => {
    try {
        const saved = Number(localStorage.getItem(GOAL_KEY));
        if (DAILY_GOALS.some(goal => goal.ticks === saved)) return saved;
    } catch {
        // Blocked storage: use the default.
    }
    return 3;
};

export const writeDailyGoal = (ticks: number) => {
    try {
        localStorage.setItem(GOAL_KEY, String(ticks));
    } catch {
        // Kept for this visit only.
    }
};
