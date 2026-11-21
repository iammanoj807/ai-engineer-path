// The site's two guides, Maya and Felix, take turns: each lesson has its own
// guide, the same every time, so a learner meets both along the path. They are
// drawn in Mascot.tsx.

export type Guide = 'maya' | 'felix';

export const GUIDES: Guide[] = ['maya', 'felix'];

export const GUIDE_NAMES: Record<Guide, string> = { maya: 'Maya', felix: 'Felix' };

/** The guide for a lesson: about half the lessons each, decided by the lesson's id. */
export const guideFor = (topicId: string): Guide => {
    let hash = 2166136261;
    for (const ch of topicId) hash = Math.imul(hash ^ ch.charCodeAt(0), 16777619);
    return (hash >>> 0) % 2 === 0 ? 'maya' : 'felix';
};
