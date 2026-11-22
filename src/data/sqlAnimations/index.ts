import type { AnimationRegistry } from '../../components/learning/anim/useTopicAnimation';
import type { ResultRows } from './kit';
import { phase01Animations, phase01Checks } from './phase01';
import { phase23Animations, phase23Checks } from './phase23';
import { phase45Animations, phase45Checks } from './phase45';
import { phase678Animations, phase678Checks } from './phase678';
import { phase8SolutionAnimations, phase8SolutionChecks } from './phase8';

// One animation per SQL lesson, keyed by topic id. Every one is drawn from the
// practice database, and `sqlAnimationChecks` lets a test compare the rows each
// animation ends on with its lesson's worked example.

export const sqlAnimations: AnimationRegistry = {
    ...phase01Animations,
    ...phase23Animations,
    ...phase45Animations,
    ...phase678Animations,
};

export const sqlAnimationChecks: Record<string, () => { example: number; rows: ResultRows }[]> = {
    ...phase01Checks,
    ...phase23Checks,
    ...phase45Checks,
    ...phase678Checks,
};

/**
 * The interview problems' walk-throughs: the lesson's own solution working on
 * the practice database, step by step. They are not in `sqlAnimations`, because
 * a problem's solution is hidden until the learner has tried it: these are only
 * shown once the solution is open, and never in practice.
 */
export const sqlSolutionAnimations: AnimationRegistry = phase8SolutionAnimations;

/** The rows each walk-through ends on, so a test can compare them with the lesson's solution. */
export const sqlSolutionChecks: Record<string, () => ResultRows> = phase8SolutionChecks;

/** Topics left without an animation at the top of the lesson on purpose, and why. */
export const sqlNoAnimation: Record<string, string> = {
    ...Object.fromEntries(Array.from({ length: 14 }, (_, i) => [`sql8-p${i + 1}`, 'Interview problem: an animation here would give away the hidden solution. Its walk-through is in sqlSolutionAnimations, shown with the solution.'])),
};
