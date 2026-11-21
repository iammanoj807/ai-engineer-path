// The game layer: XP, streak and the daily goal. Check XP is worked out from
// the ticks themselves, so it can never drift from what the lessons show;
// practice sessions add the XP they earned, kept per day (services/progress.ts).

import type { Activity, PracticeRecord } from '../services/progress';
import { daysBefore, localDay } from './day';

export const XP_PER_CHECK = 10;
/** Extra XP for passing all four checks of a topic. */
export const XP_TOPIC_BONUS = 20;
export const XP_PER_BUILD = 25;

export interface ChecksDoc {
    checks: Record<string, Record<string, boolean | undefined> | undefined>;
    /** Each lesson's practice sessions, when it has had any. */
    practice?: Record<string, PracticeRecord | undefined>;
}

export const checksPassedIn = (doc: ChecksDoc | undefined, topicId: string): number =>
    Object.values(doc?.checks[topicId] ?? {}).filter(value => value === true).length;

/** XP for one course: 10 per check, 20 more for each topic with all four. */
export const courseXp = (doc: ChecksDoc | undefined, topicIds: string[], builds = 0): number =>
    topicIds.reduce((sum, id) => {
        const passed = checksPassedIn(doc, id);
        return sum + passed * XP_PER_CHECK + (passed >= 4 ? XP_TOPIC_BONUS : 0);
    }, 0) + builds * XP_PER_BUILD;

/** All the XP practice sessions have earned. */
export const practiceXp = (activity: Activity | undefined): number =>
    Object.values(activity?.xp ?? {}).reduce((sum, xp) => sum + (Number(xp) || 0), 0);

/** A day's XP: 10 for each check ticked, plus what practice earned. */
export const xpOn = (activity: Activity | undefined, day: string): number =>
    (activity?.days[day] ?? 0) * XP_PER_CHECK + (Number(activity?.xp?.[day]) || 0);

/**
 * Days in a row with some study (a tick or a practice session), counting back
 * from today. A day with nothing yet today keeps yesterday's streak alive until midnight.
 */
export const streakDays = (activity: Activity | undefined, today: string = localDay()): number => {
    const active = (day: string) => xpOn(activity, day) > 0;
    let day = active(today) ? today : daysBefore(today, 1);
    let count = 0;
    while (active(day)) {
        count += 1;
        day = daysBefore(day, 1);
    }
    return count;
};

export const xpToday = (activity: Activity | undefined, today: string = localDay()): number => xpOn(activity, today);

/** The last `n` days, oldest first, with the XP each earned. */
export const lastDays = (activity: Activity | undefined, n: number, today: string = localDay()) =>
    Array.from({ length: n }, (_, i) => {
        const day = daysBefore(today, n - 1 - i);
        return { day, xp: xpOn(activity, day) };
    });

// ============ DAILY GOAL ============

/** A day's goal in XP: a practice session earns about 15–25, each ticked check 10. */
export const DAILY_GOALS = [
    { xp: 10, label: 'Casual', detail: '10 XP a day' },
    { xp: 30, label: 'Regular', detail: '30 XP a day' },
    { xp: 50, label: 'Serious', detail: '50 XP a day' },
    { xp: 80, label: 'Intense', detail: '80 XP a day' },
] as const;

const GOAL_KEY = 'aep:v2:daily-goal-xp';
/** The goal used to be counted in checks (1, 3, 5 or 8); a check is 10 XP. */
const OLD_GOAL_KEY = 'aep:v1:daily-goal';

export const readDailyGoal = (): number => {
    try {
        const saved = Number(localStorage.getItem(GOAL_KEY));
        if (DAILY_GOALS.some(goal => goal.xp === saved)) return saved;
        const old = Number(localStorage.getItem(OLD_GOAL_KEY)) * XP_PER_CHECK;
        if (DAILY_GOALS.some(goal => goal.xp === old)) return old;
    } catch {
        // Blocked storage: use the default.
    }
    return 30;
};

export const writeDailyGoal = (xp: number) => {
    try {
        localStorage.setItem(GOAL_KEY, String(xp));
    } catch {
        // Kept for this visit only.
    }
};
