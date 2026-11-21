// A lesson as a list of parts, the same shape for every course: why it
// matters, the idea, how it works step by step, an everyday comparison, a
// worked example, what to remember, and the common mistakes. "Learn it step by
// step" teaches these one at a time with a question after each, and the
// lesson notes inside practice show them all for reference.

import type { AnyTopic } from './build';

/** Where a part goes in a step-by-step lesson. */
export type LessonSlot = 'why' | 'idea' | 'steps' | 'analogy' | 'example' | 'facts' | 'mistakes';

export interface LessonPart {
    slot: LessonSlot;
    title: string;
    text?: string;
    /** A quieter second paragraph, such as where the analogy breaks. */
    note?: string;
    items?: string[];
    numbered?: boolean;
    code?: { code: string; language: string };
}

const has = (items: string[] | undefined): items is string[] => !!items && items.length > 0;

/** The parts of a lesson, in the order it teaches them. Empty parts are left out. */
export const lessonOutline = (topic: AnyTopic): LessonPart[] => {
    const parts: (LessonPart | false)[] = [];
    if ('note' in topic) {
        // ML Foundations
        parts.push(
            { slot: 'why', title: 'The problem it solves', text: topic.problem },
            { slot: 'idea', title: 'The idea', text: topic.note.idea },
            has(topic.howItWorks) && { slot: 'steps', title: 'How it works, step by step', items: topic.howItWorks, numbered: true },
            { slot: 'analogy', title: 'Think of it like this', text: topic.note.analogy, note: topic.note.breaks },
            (!!topic.note.example || !!topic.note.code) && {
                slot: 'example',
                title: 'Worked example',
                text: topic.note.example,
                ...(topic.note.code ? { code: { code: topic.note.code, language: topic.note.codeLanguage ?? 'python' } } : {}),
            },
        );
    } else if (topic.kind === 'lesson') {
        // SQL lesson
        const example = topic.examples[0];
        parts.push(
            { slot: 'why', title: 'Why you need it', text: topic.problem },
            { slot: 'idea', title: 'The idea', text: topic.idea, ...(topic.syntax ? { code: { code: topic.syntax, language: 'sql' } } : {}) },
            has(topic.howItWorks) && { slot: 'steps', title: 'How it works, step by step', items: topic.howItWorks, numbered: true },
            { slot: 'analogy', title: 'Think of it like this', text: topic.analogy, note: topic.breaks },
            !!example && { slot: 'example', title: `Worked example: ${example.title}`, text: example.note, code: { code: example.sql, language: 'sql' } },
        );
    } else if (topic.kind === 'problem') {
        // SQL interview problem
        parts.push(
            { slot: 'why', title: 'The question', text: topic.definition, note: `How to spot it: ${topic.spot}` },
            has(topic.approach) && { slot: 'steps', title: 'The approach, step by step', items: topic.approach, numbered: true },
            { slot: 'example', title: 'The solution', text: topic.solution.note, code: { code: topic.solution.sql, language: 'sql' } },
        );
    } else if (topic.kind === 'concept') {
        // System design concept
        parts.push(
            { slot: 'why', title: 'The problem it solves', text: topic.problem },
            { slot: 'idea', title: 'The idea', text: topic.idea },
            has(topic.howItWorks) && { slot: 'steps', title: 'How it works, step by step', items: topic.howItWorks, numbered: true },
            { slot: 'analogy', title: 'Think of it like this', text: topic.analogy, note: topic.breaks },
            {
                slot: 'example',
                title: 'Example',
                text: topic.example,
                ...(topic.code ? { code: { code: topic.code, language: topic.codeLanguage ?? 'text' } } : {}),
            },
        );
    } else {
        // System design question
        parts.push(
            { slot: 'why', title: 'The problem it solves', text: topic.problem },
            { slot: 'idea', title: 'What it must do', items: [...topic.functional, ...topic.nonFunctional] },
            has(topic.design) && { slot: 'steps', title: 'The design, step by step', items: topic.design, numbered: true },
            has(topic.evolution) && { slot: 'example', title: 'How it grows', items: topic.evolution },
        );
    }
    const facts = 'note' in topic || topic.kind === 'lesson' ? topic.keyPoints : topic.kind === 'problem' ? topic.edgeCases : topic.kind === 'concept' ? [...topic.keyPoints, ...(topic.tradeOffs ?? [])] : topic.deepDives;
    parts.push(
        has(facts) && { slot: 'facts', title: 'Must-know points', items: facts },
        has(topic.mistakes) && { slot: 'mistakes', title: 'Common mistakes', items: topic.mistakes },
    );
    return parts.filter((part): part is LessonPart => !!part && (!!part.text || has(part.items) || !!part.code));
};
