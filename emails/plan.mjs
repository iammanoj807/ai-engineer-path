// Who gets which email, decided from plain data (no network, no libraries),
// so every rule here is tested in emails/__tests__/plan.test.mjs.
//
// - Welcome: once, to someone who signed in for the first time after the
//   emails were switched on (EMAILS_START), and within the last two days.
//   Members from before that day are never "welcomed" out of the blue.
// - Reminder: off unless the learner turned reminders on (account menu). Then,
//   when they haven't learned for a week: once a week, at most MAX_REMINDERS in
//   a row; learning again resets the count.

const DAY = 24 * 60 * 60 * 1000;

/** Reminders in a row before going quiet. Coming back resets the count. */
export const MAX_REMINDERS = 4;
/** Days without learning before a reminder, and between reminders. */
export const REMINDER_GAP_DAYS = 7;
/** How new an account must be to get a welcome. */
export const WELCOME_WITHIN_DAYS = 2;

/** A learner's local day ("2026-11-21") as a time: its start, so a reminder comes on day 7, not day 8. */
const dayToTime = day => {
    const time = Date.parse(`${day}T00:00:00Z`);
    return Number.isNaN(time) ? 0 : time;
};

/** The last day with any learning (or a visit), as a time; 0 if none. */
export const lastActiveTime = activity => {
    if (!activity) return 0;
    const days = [
        ...Object.entries(activity.days ?? {}).filter(([, n]) => Number(n) > 0).map(([day]) => day),
        ...Object.entries(activity.xp ?? {}).filter(([, n]) => Number(n) > 0).map(([day]) => day),
        ...(typeof activity.lastSeen === 'string' ? [activity.lastSeen] : []),
    ];
    return days.reduce((latest, day) => Math.max(latest, dayToTime(day)), 0);
};

/**
 * @param {object} input
 * @param {{ uid: string, email?: string, name?: string, createdAt: number, disabled?: boolean }[]} input.users
 * @param {Record<string, object | undefined>} input.activity  each user's activity document
 * @param {Record<string, object | undefined>} input.mail      each user's mail log
 * @param {number} input.now
 * @param {number} input.start  when emails were switched on
 * @param {'welcome' | 'reminders'} input.pass
 * @returns {{ uid: string, kind: 'welcome' | 'reminder', number?: number, activeAt?: number }[]}
 */
export const planEmails = ({ users, activity, mail, now, start, pass }) => {
    const actions = [];
    for (const user of users) {
        if (!user.email || user.disabled) continue;
        const log = mail[user.uid] ?? {};
        if (pass === 'welcome') {
            const isNew = user.createdAt >= start && now - user.createdAt <= WELCOME_WITHIN_DAYS * DAY;
            if (isNew && !log.welcomedAt) actions.push({ uid: user.uid, kind: 'welcome' });
            continue;
        }
        const doc = activity[user.uid];
        // Reminders are off by default: only for learners who turned them on.
        if (doc?.emails !== true) continue;
        // Never active since signing up: count from the day they joined.
        const activeAt = Math.max(lastActiveTime(doc), user.createdAt);
        // Only people who used the site since emails began (they saw the notice).
        if (activeAt < start) continue;
        if (now - activeAt < REMINDER_GAP_DAYS * DAY) continue;
        // Reminders counted since they were last active: coming back starts again at zero.
        const sent = log.reminders?.activeAt === activeAt ? log.reminders.count : 0;
        if (sent >= MAX_REMINDERS) continue;
        if (sent > 0 && now - log.reminders.lastAt < REMINDER_GAP_DAYS * DAY - DAY / 2) continue;
        actions.push({ uid: user.uid, kind: 'reminder', number: sent + 1, activeAt });
    }
    return actions;
};
