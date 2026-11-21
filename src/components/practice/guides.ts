// The site's two guides take turns: each lesson has its own guide, the same
// every time, so a learner meets both along the path. The site calls them
// coaches. Ada is named after Ada Lovelace, the first computer programmer, and
// Alan after Alan Turing, the father of AI. They are drawn in Mascot.tsx, and
// their voices are chosen in voice.ts.

export type Guide = 'ada' | 'alan';

export const GUIDES: Guide[] = ['ada', 'alan'];

export const GUIDE_NAMES: Record<Guide, string> = { ada: 'Ada', alan: 'Alan' };

/** The guide for a lesson: about half the lessons each, decided by the lesson's id. */
export const guideFor = (topicId: string): Guide => {
    let hash = 2166136261;
    for (const ch of topicId) hash = Math.imul(hash ^ ch.charCodeAt(0), 16777619);
    return (hash >>> 0) % 2 === 0 ? 'ada' : 'alan';
};
