/** Today as YYYY-MM-DD in the learner's own time zone, so a streak day ends at their midnight. */
export const localDay = (date: Date = new Date()): string => {
    const y = date.getFullYear();
    const m = String(date.getMonth() + 1).padStart(2, '0');
    const d = String(date.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
};

/** The YYYY-MM-DD `n` days before the given one. */
export const daysBefore = (day: string, n: number): string => {
    const [y, m, d] = day.split('-').map(Number);
    return localDay(new Date(y, m - 1, d - n));
};
