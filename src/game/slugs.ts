// Every lesson has its own address, such as /sql/joins-combining-tables/.
// The address comes from the lesson's name the first time the lesson is seen,
// and is then kept in lessonSlugs.json for good: renaming a lesson must not
// break links to it or lose its place in search results.

/** course id → topic id → slug */
export type SlugMap = Record<string, Record<string, string>>;

/** Words reserved in a course's addresses (/sql/unit/<id>/ is a unit guide). */
export const RESERVED_SLUGS = new Set(['unit']);

const MAX_LENGTH = 70;

export const slugify = (name: string): string => {
    // A word such as "one-to-many" stays whole, so a long name is never cut inside one.
    const words = name
        .toLowerCase()
        .normalize('NFKD')
        .replace(/[̀-ͯ]/g, '')
        .replace(/['’]/g, '')
        .split(/\s+/)
        .map(word => word.replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, ''))
        .filter(Boolean);
    let slug = '';
    for (const word of words) {
        const longer = slug ? `${slug}-${word}` : word;
        if (longer.length > MAX_LENGTH && slug) break;
        slug = longer;
    }
    return slug || 'lesson';
};

/** Keeps every saved slug and adds one for each topic that has none yet. */
export const withNewSlugs = (saved: SlugMap, courses: Record<string, { id: string; name: string }[]>): SlugMap => {
    const result: SlugMap = {};
    for (const [courseId, topics] of Object.entries(courses)) {
        const slugs = { ...(saved[courseId] ?? {}) };
        const taken = new Set(Object.values(slugs));
        for (const topic of topics) {
            if (slugs[topic.id]) continue;
            const base = slugify(topic.name);
            let slug = base;
            for (let n = 2; taken.has(slug) || RESERVED_SLUGS.has(slug); n++) slug = `${base}-${n}`;
            slugs[topic.id] = slug;
            taken.add(slug);
        }
        result[courseId] = slugs;
    }
    return result;
};
