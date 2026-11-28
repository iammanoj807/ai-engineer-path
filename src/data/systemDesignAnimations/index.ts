import type { AnimationRegistry } from '../../components/learning/anim/useTopicAnimation';
import { phase01Animations } from './phase01';
import { phase2Animations } from './phase2';
import { phase34Animations } from './phase34';
import { phase56Animations } from './phase56';
import { phase7Animations } from './phase7';
import { phase89Animations } from './phase89';

// One animation per System Design topic, keyed by topic id. Each follows its
// lesson's own running example.

export const systemDesignAnimations: AnimationRegistry = {
    ...phase01Animations,
    ...phase2Animations,
    ...phase34Animations,
    ...phase56Animations,
    ...phase7Animations,
    ...phase89Animations,
};

/** Topics left without an animation on purpose, and why. */
export const systemDesignNoAnimation: Record<string, string> = {};

/** Why a low-level design animation has no numbers above it. */
const CLASSES = 'A low-level design lesson: classes and code, with no load, time or failure to measure.';

/**
 * Animations with no numbers above the picture, and why. The others show the
 * numbers each step changes (time, load, failures, work done); a test checks
 * that every animation is in one group or the other.
 */
export const systemDesignNoMetrics: Record<string, string> = {
    'sd0-t4': 'A tour of the parts, with a different request at each step: no one number runs through it.',
    'sd0-t1': 'An interview method: its estimates are written on the whiteboard in the picture itself.',
    'sd0-t2': 'Every step is a calculation drawn in the picture, so a panel would only repeat it.',
    'sd1-t5': 'One request passing a series of checks: nothing in it gets faster, slower or fails.',
    'sd2-t6': 'The two balances, the numbers that matter here, are drawn on the copies themselves.',
    'sd2-t7': 'The tokens in the bucket and each 200 or 429 reply are drawn in the picture.',
    'sd2-t9': 'It is about reading metrics: the latency chart and the trace bars are the picture.',
    'sd3-t1': 'A choice between kinds of database: no load or time changes from step to step.',
    'sd3-t2': 'The balances are drawn on the accounts, and the point is all-or-nothing, not a number.',
    'sd3-t4': 'It follows one write through the log, and each follower\'s place in the log is drawn as it moves.',
    'sd3-t9': 'The ID\'s bits are the picture: time, machine and counter, drawn as they are filled in.',
    'sd4-t1': 'About where to draw the boundaries between services: nothing is measured.',
    'sd4-t2': 'Steps and the steps that undo them: success or failure is drawn on each one.',
    'sd4-t3': 'The votes and log entries are drawn on the nodes as they are counted.',
    'sd4-t4': 'A login and the checks on each request: about who may do what, not how fast or how much.',
    'sd8-t2': 'The shared counter is drawn on the store as it counts up to the limit.',
    'sd8-t3': 'One message through the queues and a retry: its status is drawn at each step.',
    'sd8-t4': 'One message routed to wherever the recipient is: nothing is measured along the way.',
    'sd8-t6': 'Its practice question asks the learner to work out the bit rates and sizes, so they stay out of the picture.',
    'sd8-t9': 'The trie walk is the picture: each keystroke is one step down the drawn tree.',
    'sd8-t10': 'The scores and ranks are drawn in the sorted set itself.',
    'sd8-t11': 'About where keys live and where they move, shown by the keys drawn on each node.',
    'sd9-t5': 'A pipeline\'s stages and checks, run once: no load or time is compared between steps.',
    'sd5-t1': CLASSES,
    'sd5-t2': CLASSES,
    'sd5-t3': CLASSES,
    'sd5-t4': CLASSES,
    'sd5-t5': CLASSES,
    'sd5-t6': CLASSES,
    'sd5-t7': CLASSES,
    'sd5-t8': CLASSES,
    'sd5-t9': CLASSES,
    'sd6-t1': CLASSES,
    'sd6-t2': CLASSES,
    'sd6-t3': CLASSES,
    'sd6-t4': CLASSES,
    'sd6-t5': CLASSES,
    'sd6-t6': CLASSES,
    'sd6-t7': CLASSES,
    'sd6-t8': CLASSES,
    'sd6-t9': CLASSES,
    'sd6-t10': CLASSES,
    'sd7-t1': CLASSES,
    'sd7-t2': CLASSES,
    'sd7-t3': CLASSES,
    'sd7-t4': CLASSES,
    'sd7-t5': CLASSES,
    'sd7-t6': CLASSES,
    'sd0-t3': CLASSES,
};

/**
 * Words and numbers an animation must never show, because a practice question
 * asks the learner to work them out. A test checks every caption and label.
 */
export const systemDesignForbidden: Record<string, string[]> = {
    // "Draw a class diagram for a library" is this lesson's exercise.
    'sd5-t8': ['Library', 'BookCopy', 'Member', 'Loan'],
    'sd0-t1': ['45-minute', '45 min', 'minutes each'],
    'sd0-t2': ['50 million', '2 MB'],
    'sd1-t3': ['stock price', 'nightly report', 'delivery-tracking', 'delivery tracking'],
    'sd2-t2': ['4 services', 'four services', '99.6'],
    'sd2-t3': ['100 clients'],
    'sd2-t4': ['video upload', 'cache cluster'],
    'sd2-t6': ['W = ', 'R = ', 'seat booking', 'profile picture', 'stock level'],
    'sd2-t7': ['50 requests', 'burst of 50'],
    'sd3-t1': ['IoT', 'sensor', 'ledger', 'social graph'],
    'sd3-t3': ['10 numbers'],
    'sd3-t5': ['% 4', 'fifth'],
    'sd3-t6': ['6 keys', 'fourth'],
    'sd4-t3': ['5-node', '5 nodes', 'five nodes'],
    'sd6-t8': ['StockTicker', 'stock ticker', '1%'],
    'sd6-t9': ['£450', '£20,000', 'ATM', '£180'],
    'sd6-t10': ['SoldOut', 'sold out', 'refund'],
    'sd7-t3': ['334', '333'],
    'sd7-t5': ['put(1)', 'put(2)', 'put(3)', 'get(1)'],
    'sd8-t1': ['3,500,000,000', '3.5 billion', "'z'", "'10'"],
    'sd8-t5': ['million writes'],
    'sd8-t6': ['Mbps', 'GB per video'],
    'sd8-t9': ["'tea'", "'ten'", "'tent'", "'to'"],
    'sd9-t4': ['4,000-token', '20 GB'],
};
