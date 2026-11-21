// Everyone's progress: which checks are ticked, which mini-builds are done,
// the SQL queries they ran, and which days they studied.
//
// Signed out, it lives in this browser (localStorage), so the site works for
// anyone with no account. Signed in with Google, it lives in Firestore under
// users/{uid}/progress/{doc}, so a phone and a laptop see the same thing.
// Signing in moves anything ticked as a guest into the account.
//
// The functions keep the names and shapes the study pages already call, so
// the pages themselves did not change.

import type { SDCheckKey } from '../data/systemDesign';
import type { SqlCheckKey } from '../data/sql';
import type { SavedSqlQueries, SavedSqlQuery } from '../utils/sqlQueries';
import { localDay } from '../game/day';
import { XP_PER_CHECK } from '../game/xp';

// ============ SHAPES ============

export type FoundationCheckKey = 'explain' | 'derive' | 'build' | 'break';

/** A lesson's practice sessions: the best score (0–100), the last day practised, how many times. */
export interface PracticeRecord {
    best: number;
    last: string;
    times: number;
}

export interface FoundationsProgress {
    checks: Record<string, Partial<Record<FoundationCheckKey, boolean>>>;
    builds: Record<string, boolean>;
    practice?: Record<string, PracticeRecord>;
}

export interface SystemDesignProgress {
    checks: Record<string, Partial<Record<SDCheckKey, boolean>>>;
    practice?: Record<string, PracticeRecord>;
}

export interface SqlProgress {
    checks: Record<string, Partial<Record<SqlCheckKey, boolean>>>;
    practice?: Record<string, PracticeRecord>;
}

/**
 * Each day's study, keyed by the learner's local date: how many checks (or
 * builds) were ticked, and the XP earned in practice sessions. Also the last
 * day a signed-in learner opened the site, and whether they want reminder
 * emails (emails/ sends them; false means never).
 */
export interface Activity {
    days: Record<string, number>;
    xp?: Record<string, number>;
    lastSeen?: string;
    emails?: boolean;
}

interface Docs {
    foundations: FoundationsProgress;
    system_design: SystemDesignProgress;
    sql: SqlProgress;
    sql_queries: { queries: SavedSqlQueries };
    activity: Activity;
}

export type DocName = keyof Docs;

export const DOC_NAMES: DocName[] = ['foundations', 'system_design', 'sql', 'sql_queries', 'activity'];

const asObject = (value: unknown): Record<string, unknown> =>
    value && typeof value === 'object' && !Array.isArray(value) ? (value as Record<string, unknown>) : {};

/** Fill in missing parts, so a page never reads `undefined.checks`. */
const normalize = <N extends DocName>(name: N, raw: unknown): Docs[N] => {
    const data = asObject(raw);
    switch (name) {
        case 'foundations':
            return { checks: asObject(data.checks), builds: asObject(data.builds), practice: asObject(data.practice) } as Docs[N];
        case 'sql_queries':
            return { queries: asObject(data.queries) } as Docs[N];
        case 'activity':
            return {
                days: asObject(data.days),
                xp: asObject(data.xp),
                ...(typeof data.lastSeen === 'string' ? { lastSeen: data.lastSeen } : {}),
                ...(typeof data.emails === 'boolean' ? { emails: data.emails } : {}),
            } as Docs[N];
        default:
            return { checks: asObject(data.checks), practice: asObject(data.practice) } as Docs[N];
    }
};

// ============ BACKENDS ============

/** Removes a key when a patch is merged in (Firestore's deleteField(), for both backends). */
export const DELETE = Symbol('delete');

export type Patch = { [key: string]: Patch | boolean | number | string | object | typeof DELETE };

export interface Backend {
    /** Calls onData with the current value now (or as soon as known), then on every change. */
    listen: (name: DocName, onData: (data: unknown) => void) => () => void;
    write: (name: DocName, patch: Patch) => Promise<void>;
}

const isPlainPatch = (value: unknown): value is Patch =>
    !!value && typeof value === 'object' && !Array.isArray(value);

/** Merge a patch into a copy of the target, the way Firestore's `{ merge: true }` does. */
export const mergePatch = (target: Record<string, unknown>, patch: Patch): Record<string, unknown> => {
    const out: Record<string, unknown> = { ...target };
    for (const [key, value] of Object.entries(patch)) {
        if (value === DELETE) delete out[key];
        else if (isPlainPatch(value)) out[key] = mergePatch(asObject(out[key]), value);
        else out[key] = value;
    }
    return out;
};

const STORAGE_PREFIX = 'aep:v1:';
const storageKey = (scope: string, name: DocName) => `${STORAGE_PREFIX}${scope}:${name}`;

const readLocal = (scope: string, name: DocName): Record<string, unknown> => {
    try {
        return asObject(JSON.parse(localStorage.getItem(storageKey(scope, name)) ?? '{}'));
    } catch {
        return {};
    }
};

const writeLocal = (scope: string, name: DocName, data: Record<string, unknown>) => {
    try {
        localStorage.setItem(storageKey(scope, name), JSON.stringify(data));
    } catch {
        // Private mode or full storage: the tick still shows for this visit.
    }
};

/** What a guest has ticked in this browser, for moving it into an account on sign-in. */
export const readGuestData = (): Partial<Record<DocName, Record<string, unknown>>> =>
    Object.fromEntries(DOC_NAMES.map(name => [name, readLocal('guest', name)]));

export const clearGuestData = () => {
    for (const name of DOC_NAMES) {
        try {
            localStorage.removeItem(storageKey('guest', name));
        } catch {
            // Nothing to clear.
        }
    }
};

/** This browser only. Other open tabs follow along through the `storage` event. */
export const localBackend = (scope: string): Backend => {
    const memory = new Map<DocName, Record<string, unknown>>();
    const listeners = new Map<DocName, Set<(data: unknown) => void>>();
    const current = (name: DocName) => {
        if (!memory.has(name)) memory.set(name, readLocal(scope, name));
        return memory.get(name)!;
    };
    const emit = (name: DocName) => listeners.get(name)?.forEach(fn => fn(current(name)));

    const onStorage = (event: StorageEvent) => {
        for (const name of DOC_NAMES) {
            if (event.key === storageKey(scope, name) || event.key === null) {
                memory.set(name, readLocal(scope, name));
                emit(name);
            }
        }
    };

    return {
        listen: (name, onData) => {
            let set = listeners.get(name);
            if (!set) listeners.set(name, (set = new Set()));
            if ([...listeners.values()].every(s => s.size === 0)) window.addEventListener('storage', onStorage);
            set.add(onData);
            onData(current(name));
            return () => {
                set.delete(onData);
                if ([...listeners.values()].every(s => s.size === 0)) window.removeEventListener('storage', onStorage);
            };
        },
        write: async (name, patch) => {
            const next = mergePatch(current(name), patch);
            memory.set(name, next);
            writeLocal(scope, name, next);
            emit(name);
        },
    };
};

// ============ THE STORE ============

const state: Partial<Docs> = {};
const subscribers = new Map<DocName, Set<(data: never) => void>>();
const stops = new Map<DocName, () => void>();
let backend: Backend = localBackend('guest');

const emit = <N extends DocName>(name: N) => {
    const value = state[name];
    if (value === undefined) return;
    subscribers.get(name)?.forEach(fn => (fn as (data: Docs[N]) => void)(value));
};

const ensureListening = (name: DocName) => {
    if (stops.has(name)) return;
    stops.set(name, backend.listen(name, raw => {
        (state as Record<DocName, unknown>)[name] = normalize(name, raw);
        emit(name);
    }));
};

const subscribe = <N extends DocName>(name: N, callback: (data: Docs[N]) => void) => {
    let set = subscribers.get(name);
    if (!set) subscribers.set(name, (set = new Set()));
    set.add(callback as (data: never) => void);
    ensureListening(name);
    const value = state[name];
    if (value !== undefined) callback(value as Docs[N]);
    return () => {
        set.delete(callback as (data: never) => void);
    };
};

/** Swap where progress lives (guest ↔ account). Every open page re-reads from the new place. */
export const switchBackend = (next: Backend) => {
    stops.forEach(stop => stop());
    stops.clear();
    for (const name of DOC_NAMES) delete state[name];
    backend = next;
    for (const [name, set] of subscribers) if (set.size > 0) ensureListening(name);
};

const write = (name: DocName, patch: Patch) => backend.write(name, patch);

// ============ SIGN-IN TO SAVE ============
//
// When the site has Google sign-in, anyone can read the lessons, but ticking a
// check needs an account. A tick made while signed out is held, the page asks
// the learner to sign in, and the held tick is saved once they have.

let canSave: () => boolean = () => true;
let pendingSave: (() => Promise<void>) | null = null;
const signInNeededListeners = new Set<() => void>();

/** account.ts sets this when sign-in exists: only a signed-in learner may save. */
export const requireSignInToSave = (allowed: () => boolean) => {
    canSave = allowed;
};

/** Called when a signed-out learner tries to tick something. */
export const onSignInNeeded = (listener: () => void) => {
    signInNeededListeners.add(listener);
    return () => {
        signInNeededListeners.delete(listener);
    };
};

/** Resolves once a document has its first value from the current backend. */
const whenLoaded = (name: DocName) =>
    new Promise<void>(resolve => {
        if (state[name] !== undefined) {
            resolve();
            return;
        }
        const holder: { stop?: () => void; fired: boolean } = { fired: false };
        holder.stop = subscribe(name, () => {
            holder.fired = true;
            holder.stop?.();
            resolve();
        });
        if (holder.fired) holder.stop();
    });

/** True when saving may go ahead now; otherwise keeps the action for after sign-in and asks for it. */
const allowedOrAsk = (action: () => Promise<void>, docs: DocName[]): boolean => {
    if (canSave()) return true;
    pendingSave = async () => {
        for (const name of docs) await whenLoaded(name);
        await action();
    };
    signInNeededListeners.forEach(fn => fn());
    return false;
};

/** After signing in: save the tick that asked for it. */
export const runPendingSave = () => {
    const action = pendingSave;
    pendingSave = null;
    if (action) action().catch(error => console.error('Could not save after sign-in:', error));
};

/** The learner chose not to sign in. */
export const clearPendingSave = () => {
    pendingSave = null;
};

/** Read-only access for the game layer (XP, streak, the path). */
export const subscribeTo = subscribe;

// ============ CELEBRATIONS ============

export type Course = 'foundations' | 'system_design' | 'sql';

export interface Celebration {
    course: Course;
    topicId: string;
}

const celebrationListeners = new Set<(event: Celebration) => void>();

export const onCelebrate = (listener: (event: Celebration) => void) => {
    celebrationListeners.add(listener);
    return () => {
        celebrationListeners.delete(listener);
    };
};

const CHECKS_PER_TOPIC = 4;

/**
 * Tick or untick several checks of one topic in one save (a practice session
 * can prove three at once). Each new tick counts towards today's goal, and the
 * topic celebrates when it reaches all four checks.
 */
const saveChecks = async (course: Course, topicId: string, changes: Record<string, boolean>): Promise<void> => {
    if (!allowedOrAsk(() => saveChecks(course, topicId, changes), [course, 'activity'])) return;
    // Just after signing in, the account's progress may not have arrived yet. Counting
    // from an empty copy would treat old ticks as new and overwrite today's count.
    await whenLoaded(course);
    await whenLoaded('activity');
    const before = { ...(asObject((state[course] as { checks?: unknown } | undefined)?.checks)[topicId] as Record<string, boolean> | undefined ?? {}) };
    const passedBefore = Object.values(before).filter(Boolean).length;
    const after = { ...before, ...changes };
    const passedAfter = Object.values(after).filter(Boolean).length;
    const newTicks = Object.entries(changes).filter(([check, done]) => done && !before[check]).length;

    const saving = write(course, { checks: { [topicId]: changes } });
    if (newTicks > 0) {
        void recordActivity(newTicks);
        if (passedBefore < CHECKS_PER_TOPIC && passedAfter >= CHECKS_PER_TOPIC) {
            celebrationListeners.forEach(fn => fn({ course, topicId }));
        }
    }
    await saving;
};

/** Tick or untick one check. */
const saveCheck = (course: Course, topicId: string, check: string, done: boolean): Promise<void> =>
    saveChecks(course, topicId, { [check]: done });

const dayXpListeners = new Set<(xpToday: number, added: number) => void>();

/** Called with today's new XP and how much was just added, so the page can celebrate the daily goal. */
export const onDayXp = (listener: (xpToday: number, added: number) => void) => {
    dayXpListeners.add(listener);
    return () => {
        dayXpListeners.delete(listener);
    };
};

/** Today's XP so far: 10 for each check ticked, plus what practice earned. */
const xpSoFarToday = (today: string) => (state.activity?.days[today] ?? 0) * XP_PER_CHECK + (state.activity?.xp?.[today] ?? 0);

const recordActivity = async (ticks = 1) => {
    const today = localDay();
    const count = state.activity?.days[today] ?? 0;
    const added = ticks * XP_PER_CHECK;
    dayXpListeners.forEach(fn => fn(xpSoFarToday(today) + added, added));
    try {
        await write('activity', { days: { [today]: count + ticks } });
    } catch (error) {
        console.error('Could not record today\'s activity:', error);
    }
};

// ============ PRACTICE SESSIONS ============

export interface PracticeResult {
    /** XP the session earned. */
    xp: number;
    /** Share of exercises right first time, 0–100. */
    score: number;
    /** Checks the session proved (SQL), ticked in the same save. */
    checks?: string[];
}

/**
 * Save a finished practice session: its XP for today, the lesson's best score
 * and last day practised, and any checks it proved. One save, so a learner who
 * is asked to sign in first has all of it kept, and none of it counted twice.
 */
export const savePracticeResult = async (course: Course, topicId: string, result: PracticeResult): Promise<void> => {
    if (!allowedOrAsk(() => savePracticeResult(course, topicId, result), [course, 'activity'])) return;
    await whenLoaded(course);
    await whenLoaded('activity');
    const today = localDay();
    const previous = asObject(asObject((state[course] as { practice?: unknown } | undefined)?.practice)[topicId]) as Partial<PracticeRecord>;
    const record: PracticeRecord = {
        best: Math.max(Number(previous.best) || 0, Math.round(result.score)),
        last: today,
        times: (Number(previous.times) || 0) + 1,
    };
    const saving: Promise<void>[] = [write(course, { practice: { [topicId]: { ...record } } })];
    if (result.xp > 0) {
        dayXpListeners.forEach(fn => fn(xpSoFarToday(today) + result.xp, result.xp));
        saving.push(write('activity', { xp: { [today]: (state.activity?.xp?.[today] ?? 0) + result.xp } }));
    }
    if (result.checks?.length) saving.push(saveChecks(course, topicId, Object.fromEntries(result.checks.map(check => [check, true]))));
    await Promise.all(saving);
};

// ============ EMAILS ============

/**
 * Note that a signed-in learner opened the site today (once a day), so the
 * reminder emails never go to someone who has been visiting.
 */
export const markSeenToday = async (): Promise<void> => {
    if (!canSave()) return;
    await whenLoaded('activity');
    const today = localDay();
    if (state.activity?.lastSeen === today) return;
    try {
        await write('activity', { lastSeen: today });
    } catch (error) {
        console.error('Could not note today\'s visit:', error);
    }
};

/** Turn the weekly reminder emails on or off (signed in only). */
export const setEmailReminders = async (on: boolean): Promise<void> => {
    if (!canSave()) return;
    await whenLoaded('activity');
    await write('activity', { emails: on });
};

// Keep today's count current even before the home page subscribes.
subscribe('activity', () => {});

// ============ ML FOUNDATIONS ============

export const subscribeToFoundations = (callback: (progress: FoundationsProgress) => void) =>
    subscribe('foundations', callback);

export const saveFoundationCheck = (topicId: string, check: FoundationCheckKey, done: boolean) =>
    saveCheck('foundations', topicId, check, done);

export const saveFoundationBuild = async (buildId: string, done: boolean): Promise<void> => {
    if (!allowedOrAsk(() => saveFoundationBuild(buildId, done), ['foundations', 'activity'])) return;
    const saving = write('foundations', { builds: { [buildId]: done } });
    if (done) void recordActivity();
    await saving;
};

// ============ SYSTEM DESIGN ============

export const subscribeToSystemDesign = (callback: (progress: SystemDesignProgress) => void) =>
    subscribe('system_design', callback);

export const saveSystemDesignCheck = (topicId: string, check: SDCheckKey, done: boolean) =>
    saveCheck('system_design', topicId, check, done);

// ============ SQL ============

export const subscribeToSql = (callback: (progress: SqlProgress) => void) =>
    subscribe('sql', callback);

export const saveSqlCheck = (topicId: string, check: SqlCheckKey, done: boolean) =>
    saveCheck('sql', topicId, check, done);

/** Tick the checks a practice session proved, in one save. */
export const saveSqlChecks = (topicId: string, checks: SqlCheckKey[]) =>
    saveChecks('sql', topicId, Object.fromEntries(checks.map(check => [check, true])));

// ============ SQL SAVED QUERIES ============

export const subscribeToSqlQueries = (callback: (queries: SavedSqlQueries) => void) =>
    subscribe('sql_queries', doc => callback(doc.queries as SavedSqlQueries));

/** Save one run, and remove the given older ones, in a single write. */
export const saveSqlQuery = async (id: string, query: SavedSqlQuery, removeIds: string[] = []) => {
    // Running a query always works; signed out, it just isn't kept (and no prompt on every run).
    if (!canSave()) return;
    const queries: Patch = { [id]: query as unknown as Patch };
    for (const old of removeIds) queries[old] = DELETE;
    await write('sql_queries', { queries });
};

export const deleteSqlQuery = async (id: string) => {
    if (!canSave()) return;
    await write('sql_queries', { queries: { [id]: DELETE } });
};
