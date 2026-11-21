import { useEffect, useMemo, useState } from 'react';
import {
    subscribeTo,
    type Activity,
    type Course,
    type FoundationsProgress,
    type SqlProgress,
    type SystemDesignProgress,
} from '../services/progress';
import { allTopicsOf, COURSES, type CourseInfo, type PathTopic } from './courses';
import { checksPassedIn, courseXp, practiceXp, streakDays, xpToday, type ChecksDoc } from './xp';

export interface AllProgress {
    foundations?: FoundationsProgress;
    sql?: SqlProgress;
    system_design?: SystemDesignProgress;
    activity?: Activity;
}

/** Every course's ticks plus the activity log, kept current. */
export const useAllProgress = (): AllProgress => {
    const [progress, setProgress] = useState<AllProgress>({});
    useEffect(() => {
        const stops = [
            subscribeTo('foundations', doc => setProgress(p => ({ ...p, foundations: doc }))),
            subscribeTo('sql', doc => setProgress(p => ({ ...p, sql: doc }))),
            subscribeTo('system_design', doc => setProgress(p => ({ ...p, system_design: doc }))),
            subscribeTo('activity', doc => setProgress(p => ({ ...p, activity: doc }))),
        ];
        return () => stops.forEach(stop => stop());
    }, []);
    return progress;
};

export const checksDocOf = (progress: AllProgress, course: Course): ChecksDoc | undefined =>
    progress[course] as ChecksDoc | undefined;

export interface CourseStats {
    course: CourseInfo;
    total: number;
    mastered: number;
    /** The first topic, in order, without all four checks. */
    next: PathTopic | null;
    nextPassed: number;
    xp: number;
}

export const courseStats = (progress: AllProgress, course: CourseInfo): CourseStats => {
    const doc = checksDocOf(progress, course.id);
    const topics = allTopicsOf(course);
    const mastered = topics.filter(topic => checksPassedIn(doc, topic.id) >= 4).length;
    const next = topics.find(topic => checksPassedIn(doc, topic.id) < 4) ?? null;
    const builds = course.id === 'foundations'
        ? Object.values(progress.foundations?.builds ?? {}).filter(Boolean).length
        : 0;
    return {
        course,
        total: topics.length,
        mastered,
        next,
        nextPassed: next ? checksPassedIn(doc, next.id) : 0,
        xp: courseXp(doc, topics.map(topic => topic.id), builds),
    };
};

/** XP (checks and practice), streak and today's XP, for the top bar and the home page. */
export const useGameStats = () => {
    const progress = useAllProgress();
    return useMemo(() => {
        const stats = COURSES.map(course => courseStats(progress, course));
        return {
            progress,
            stats,
            xp: stats.reduce((sum, s) => sum + s.xp, 0) + practiceXp(progress.activity),
            streak: streakDays(progress.activity),
            /** Today's XP, for the daily goal. */
            today: xpToday(progress.activity),
        };
    }, [progress]);
};
