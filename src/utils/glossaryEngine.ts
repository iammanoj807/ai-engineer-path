// The tap-to-explain glossary, independent of any one page. Each learning page
// (System Design, ML Foundations) creates its own glossary from its words,
// its topics in reading order, and a function that lists a topic's prose.

export interface GlossaryTerm {
    id: string;
    term: string;
    definition: string;
    /** The topic that teaches this word in depth, if there is one. */
    taughtIn?: string;
    /** Exact spellings to look for (plurals and capitalised forms included). */
    matches: string[];
    /**
     * Lessons where these spellings are everyday words, or mean something else,
     * so they are left unmarked there: "tomorrow's temperature" is not the
     * sampling temperature, and "git init" is not weight initialisation.
     */
    plainIn?: string[];
}

/** A piece of text. `termId` is set when the piece is a glossary word. */
export interface TextSegment {
    text: string;
    termId?: string;
}

export interface GlossaryOptions {
    /** Spans never to mark, such as `inline code` in the SQL notes. Must be a global (g) pattern. */
    skip?: RegExp;
}

export interface GlossaryTopicRef {
    id: string;
    name: string;
}

/** Everything a page's tap-to-explain components need from its glossary. */
export interface GlossarySource<T extends GlossaryTopicRef = GlossaryTopicRef> {
    terms: GlossaryTerm[];
    getTerm: (id: string) => GlossaryTerm | undefined;
    /**
     * Split text into plain pieces and glossary words, in order. Give the lesson
     * the text belongs to, so a word that is plain there (`plainIn`) stays plain.
     */
    segmentText: (text: string, topicId?: string) => TextSegment[];
    /** Like segmentText over several texts read together, marking only each word's first mention. */
    segmentFirstMentions: (texts: string[], alreadyMarked?: ReadonlySet<string>, topicId?: string) => TextSegment[][];
    termsInText: (text: string, topicId?: string) => string[];
    termsInTopic: (topic: T) => string[];
    /** Words appearing for the first time in this topic (reading in order), except the word it teaches. */
    newWordsForTopic: (topic: T) => GlossaryTerm[];
    newWordsForTopicId: (topicId: string) => GlossaryTerm[];
    findTopic: (id: string) => T | undefined;
    /** Search by word or definition, alphabetical. */
    search: (query: string) => GlossaryTerm[];
}

const escapeRegExp = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

/**
 * A link to another page of this site, written in lesson text as
 * [label](/path/), for example [Database indexing](/system-design/database-indexing/).
 * Its words are never marked as glossary words, so the link stays whole.
 * Group 1 is the label, group 2 the path.
 */
export const SITE_LINK = /\[([^\]]+)\]\((\/[^)\s]*)\)/g;

export const createGlossary = <T extends GlossaryTopicRef>(
    terms: GlossaryTerm[],
    topicsInOrder: T[],
    proseOf: (topic: T) => string[],
    options: GlossaryOptions = {}
): GlossarySource<T> => {
    const termsById = new Map(terms.map(term => [term.id, term]));
    const termIdBySpelling = new Map<string, string>();
    for (const term of terms) {
        for (const spelling of term.matches) {
            if (!termIdBySpelling.has(spelling)) termIdBySpelling.set(spelling, term.id);
        }
    }

    // Longest spellings first, so "load balancer" wins over "load" and "network partition"
    // over "partition". Word edges stop matches inside longer words and identifiers
    // ("server" inside "observer", "manifest" in "manifest_url"). A spelling that starts or
    // ends with a symbol has no word edge on that side, so maths notation is found inside
    // a formula: the ∂ in "∂L/∂w", the ᵀ in "Xᵀy". Case-sensitive on purpose.
    const EDGE_BEFORE = '(?<![A-Za-z0-9_])';
    const EDGE_AFTER = '(?![A-Za-z0-9_])';
    const isWordChar = (char: string) => /[A-Za-z0-9_]/.test(char);
    const endsInWord = (spelling: string) => isWordChar(spelling[spelling.length - 1]);
    const spellings = [...termIdBySpelling.keys()].sort((a, b) => b.length - a.length);
    const symbols = spellings.filter(spelling => !isWordChar(spelling[0]));
    const words = spellings.filter(spelling => isWordChar(spelling[0]));
    // Nearly every word ends in a letter or digit, and those share one edge check after
    // the group, which keeps matching fast. The few that end in a symbol ("model.eval()"),
    // and any longer word starting with one of them, are tried first with their own check.
    const special = words.filter(spelling => !endsInWord(spelling));
    const first = words.filter(spelling => special.some(start => spelling.startsWith(start)));
    const rest = words.filter(spelling => !first.includes(spelling));
    const withOwnEdge = (group: string[]) => group.map(spelling => `${escapeRegExp(spelling)}${endsInWord(spelling) ? EDGE_AFTER : ''}`).join('|');
    const pattern = new RegExp(
        [
            `${EDGE_BEFORE}(?:${[first.length ? `(?:${withOwnEdge(first)})` : '', rest.length ? `(?:${rest.map(escapeRegExp).join('|')})${EDGE_AFTER}` : ''].filter(Boolean).join('|')})`,
            symbols.length ? `(?:${withOwnEdge(symbols)})` : '',
        ]
            .filter(Boolean)
            .join('|'),
        'g'
    );

    const skippedRanges = (text: string): [number, number][] =>
        [...(options.skip ? [options.skip] : []), SITE_LINK].flatMap(skip =>
            [...text.matchAll(skip)].map((m): [number, number] => [m.index ?? 0, (m.index ?? 0) + m[0].length])
        );

    const segmentText = (text: string, topicId?: string): TextSegment[] => {
        const segments: TextSegment[] = [];
        const skipped = skippedRanges(text);
        let last = 0;
        for (const match of text.matchAll(pattern)) {
            const start = match.index ?? 0;
            // A word inside a skipped span stays part of the plain text around it.
            if (skipped.some(([from, to]) => start >= from && start < to)) continue;
            const termId = termIdBySpelling.get(match[0]);
            // In this lesson the word is an everyday word, not the term.
            if (topicId && termId && termsById.get(termId)?.plainIn?.includes(topicId)) continue;
            if (start > last) segments.push({ text: text.slice(last, start) });
            segments.push({ text: match[0], termId });
            last = start + match[0].length;
        }
        if (last < text.length) segments.push({ text: text.slice(last) });
        return segments;
    };

    const segmentFirstMentions = (texts: string[], alreadyMarked: ReadonlySet<string> = new Set(), topicId?: string): TextSegment[][] => {
        const seen = new Set(alreadyMarked);
        return texts.map(text =>
            segmentText(text, topicId).map(segment => {
                if (!segment.termId) return segment;
                if (seen.has(segment.termId)) return { text: segment.text };
                seen.add(segment.termId);
                return segment;
            })
        );
    };

    const termsInText = (text: string, topicId?: string): string[] => {
        const ids: string[] = [];
        for (const segment of segmentText(text, topicId)) {
            if (segment.termId && !ids.includes(segment.termId)) ids.push(segment.termId);
        }
        return ids;
    };

    const termsInTopic = (topic: T): string[] => {
        const ids: string[] = [];
        for (const text of proseOf(topic)) {
            for (const id of termsInText(text, topic.id)) if (!ids.includes(id)) ids.push(id);
        }
        return ids;
    };

    const firstTopicForTerm = new Map<string, string>();
    for (const topic of topicsInOrder) {
        for (const id of termsInTopic(topic)) {
            if (!firstTopicForTerm.has(id)) firstTopicForTerm.set(id, topic.id);
        }
    }

    const newWordsForTopic = (topic: T): GlossaryTerm[] =>
        termsInTopic(topic)
            .filter(id => firstTopicForTerm.get(id) === topic.id && termsById.get(id)?.taughtIn !== topic.id)
            .map(id => termsById.get(id))
            .filter((term): term is GlossaryTerm => term !== undefined);

    const findTopic = (id: string) => topicsInOrder.find(topic => topic.id === id);

    const sorted = [...terms].sort((a, b) => a.term.localeCompare(b.term, undefined, { sensitivity: 'base' }));
    const search = (query: string): GlossaryTerm[] => {
        const q = query.trim().toLowerCase();
        if (!q) return sorted;
        return sorted.filter(term => term.term.toLowerCase().includes(q) || term.definition.toLowerCase().includes(q));
    };

    return {
        terms,
        getTerm: id => termsById.get(id),
        segmentText,
        segmentFirstMentions,
        termsInText,
        termsInTopic,
        newWordsForTopic,
        newWordsForTopicId: id => {
            const topic = findTopic(id);
            return topic ? newWordsForTopic(topic) : [];
        },
        findTopic,
        search,
    };
};
