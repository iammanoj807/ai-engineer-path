import { useCallback, useState } from 'react';

// Which Lab missions this browser has completed. Kept on the device only: a
// mission takes minutes, and a lost tick costs nothing but a replay.

const KEY = 'aep:v1:lab-done';

const read = (): string[] => {
    try {
        const saved = JSON.parse(localStorage.getItem(KEY) ?? '[]') as unknown;
        return Array.isArray(saved) ? saved.filter((id): id is string => typeof id === 'string') : [];
    } catch {
        return [];
    }
};

export const useLabProgress = () => {
    const [done, setDone] = useState<string[]>(read);
    const markDone = useCallback((id: string) => {
        setDone(before => {
            if (before.includes(id)) return before;
            const next = [...before, id];
            try {
                localStorage.setItem(KEY, JSON.stringify(next));
            } catch {
                // Not remembered; the mission still shows as complete until the page is closed.
            }
            return next;
        });
    }, []);
    return { done, markDone };
};
