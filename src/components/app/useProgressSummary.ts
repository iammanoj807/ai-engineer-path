// Keeps a signed-in learner's progress summary current (XP, streak, the
// lesson marked Up next), for the reminder emails (emails/). The site works
// these out, so an email says exactly what the site shows.

import { useEffect } from 'react';
import { readHomeCourse } from '../../game/courses';
import { topicPath } from '../../game/addresses';
import type { useGameStats } from '../../game/useProgress';
import { useAccount } from '../../services/account';
import { isCurrentProgress, saveProgressSummary, type DocName, type ProgressSummary } from '../../services/progress';

type GameStats = ReturnType<typeof useGameStats>;

const NEEDED: DocName[] = ['foundations', 'sql', 'system_design', 'activity'];

export const useProgressSummary = ({ progress, stats, xp, streak }: Pick<GameStats, 'progress' | 'stats' | 'xp' | 'streak'>) => {
    const account = useAccount();
    useEffect(() => {
        // Only from the account's own progress, once it has loaded: never an empty copy.
        if (account.status !== 'signed-in' || !isCurrentProgress(progress as Partial<Record<DocName, unknown>>, NEEDED)) return;
        const home = stats.find(s => s.course.id === readHomeCourse()) ?? stats[0];
        const next = home?.next ? { name: home.next.name, course: home.course.title, path: topicPath(home.course, home.next.id) } : undefined;
        const saved = progress.activity?.summary;
        const same = saved?.xp === xp && saved.streak === streak && saved.next?.path === next?.path && saved.next?.name === next?.name && saved.next?.course === next?.course;
        if (same) return;
        const summary: ProgressSummary = { xp, streak, ...(next ? { next } : {}) };
        // A moment after the last change, so a run of ticks is one save.
        const timer = window.setTimeout(() => void saveProgressSummary(summary).catch(() => {}), 2500);
        return () => window.clearTimeout(timer);
    }, [account.status, progress, stats, xp, streak]);
};
