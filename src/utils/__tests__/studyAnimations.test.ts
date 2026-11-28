import { describe, it, expect } from 'vitest';
import { allSqlTopics } from '../../data/sql';
import { sqlAnimationChecks, sqlAnimations, sqlNoAnimation, sqlSolutionAnimations, sqlSolutionChecks } from '../../data/sqlAnimations';
import { systemDesignPhases } from '../../data/systemDesign';
import { systemDesignAnimations, systemDesignForbidden, systemDesignNoAnimation, systemDesignNoMetrics } from '../../data/systemDesignAnimations';
import { holdFor, readingOf, type AnimationSpec } from '../../components/learning/anim/scene';
import { foundationAnimations } from '../../data/foundationsAnimations';
import { animationProblems, metricProblems, movingProblems, readingProblems } from './animationChecks';

describe('SQL animations', () => {
    it('animates every topic, or says why not — and nothing else', () => {
        const ids = new Set(allSqlTopics.map(t => t.id));
        expect(allSqlTopics.filter(t => !sqlAnimations[t.id] && !sqlNoAnimation[t.id]).map(t => t.id)).toEqual([]);
        expect(Object.keys(sqlAnimations).filter(id => sqlNoAnimation[id])).toEqual([]);
        expect([...Object.keys(sqlAnimations), ...Object.keys(sqlNoAnimation)].filter(id => !ids.has(id))).toEqual([]);
    });

    it('never animates an interview problem, whose solution is hidden', () => {
        expect(allSqlTopics.filter(t => t.kind === 'problem' && sqlAnimations[t.id]).map(t => t.id)).toEqual([]);
    });

    it('builds every frame from valid shapes that fit the picture', () => {
        expect(animationProblems(sqlAnimations, { textFit: true })).toEqual([]);
    });

    it('keeps every step easy to read: something new each time, nothing cut off, crossed out or overlapping', () => {
        expect(readingProblems(sqlAnimations)).toEqual([]);
    });

    it('ends on the same rows as the lesson\'s worked example', () => {
        const wrong: string[] = [];
        for (const [id, checks] of Object.entries(sqlAnimationChecks)) {
            const topic = allSqlTopics.find(t => t.id === id);
            if (!topic || topic.kind !== 'lesson') {
                wrong.push(`${id}: not a lesson`);
                continue;
            }
            for (const { example, rows } of checks()) {
                const expected = topic.examples[example]?.result?.rows;
                if (!expected) wrong.push(`${id}: example ${example} has no result`);
                else if (JSON.stringify(rows) !== JSON.stringify(expected)) wrong.push(`${id} example ${example}: animation ${JSON.stringify(rows)} vs lesson ${JSON.stringify(expected)}`);
            }
        }
        expect(wrong).toEqual([]);
    });
});

describe('SQL solution walk-throughs', () => {
    const problems = allSqlTopics.filter(t => t.kind === 'problem');

    it('has one for every interview problem, and for nothing else', () => {
        expect(Object.keys(sqlSolutionAnimations).sort()).toEqual(problems.map(t => t.id).sort());
        expect(Object.keys(sqlSolutionChecks).sort()).toEqual(problems.map(t => t.id).sort());
    });

    it('builds every frame from valid shapes that fit the picture', () => {
        expect(animationProblems(sqlSolutionAnimations, { textFit: true })).toEqual([]);
    });

    it('keeps every step easy to read: something new each time, nothing cut off, crossed out or overlapping', () => {
        expect(readingProblems(sqlSolutionAnimations)).toEqual([]);
    });

    it('ends on the same rows as the lesson\'s solution', () => {
        const wrong: string[] = [];
        for (const topic of problems) {
            const expected = topic.solution.result?.rows;
            const rows = sqlSolutionChecks[topic.id]?.();
            if (!expected) wrong.push(`${topic.id}: the solution has no result`);
            else if (JSON.stringify(rows) !== JSON.stringify(expected)) wrong.push(`${topic.id}: walk-through ${JSON.stringify(rows)} vs lesson ${JSON.stringify(expected)}`);
        }
        expect(wrong).toEqual([]);
    });
});

/** Every piece of text an animation shows: title, variant names, captions, labels, numbers and changes. */
const textsOf = (spec: AnimationSpec): string[] => [
    spec.title,
    ...spec.variants.flatMap(v => [
        v.label,
        ...v.frames.flatMap(f => [
            f.caption,
            ...f.shapes.flatMap(s => ('text' in s && typeof s.text === 'string' ? [s.text] : [])),
            ...(f.metrics ?? []).flatMap(m => [m.label, m.value]),
            ...(f.changes ?? []),
        ]),
    ]),
];

describe('System Design animations', () => {
    const topics = systemDesignPhases.flatMap(p => p.topics);

    it('animates every topic, or says why not — and nothing else', () => {
        const ids = new Set(topics.map(t => t.id));
        expect(topics.filter(t => !systemDesignAnimations[t.id] && !systemDesignNoAnimation[t.id]).map(t => t.id)).toEqual([]);
        expect(Object.keys(systemDesignAnimations).filter(id => systemDesignNoAnimation[id])).toEqual([]);
        expect([...Object.keys(systemDesignAnimations), ...Object.keys(systemDesignNoAnimation), ...Object.keys(systemDesignForbidden)].filter(id => !ids.has(id))).toEqual([]);
    });

    it('builds every frame from valid shapes that fit the picture', () => {
        expect(animationProblems(systemDesignAnimations, { textFit: true })).toEqual([]);
    });

    it('keeps every step easy to read: something new each time, nothing cut off, crossed out or overlapping', () => {
        expect(readingProblems(systemDesignAnimations)).toEqual([]);
    });

    it('keeps the numbers above each picture steady and short: the same labels on every step', () => {
        expect([foundationAnimations, sqlAnimations, sqlSolutionAnimations, systemDesignAnimations].flatMap(metricProblems)).toEqual([]);
    });

    it('shows numbers above the picture wherever they move, or says why not', () => {
        const measuredIds = Object.keys(systemDesignAnimations).filter(id => systemDesignAnimations[id]().variants.some(v => v.frames.some(f => f.metrics?.length)));
        const unmeasured = Object.keys(systemDesignAnimations).filter(id => !measuredIds.includes(id) && !systemDesignNoMetrics[id]);
        expect(unmeasured).toEqual([]);
        expect(measuredIds.filter(id => systemDesignNoMetrics[id])).toEqual([]);
        for (const reason of Object.values(systemDesignNoMetrics)) expect(reason.length).toBeGreaterThan(20);
    });

    it('never shows what a practice question asks the learner to work out', () => {
        const leaks: string[] = [];
        for (const [id, words] of Object.entries(systemDesignForbidden)) {
            const build = systemDesignAnimations[id];
            if (!build) continue;
            const texts = textsOf(build());
            for (const word of words) if (texts.some(t => t.includes(word))) leaks.push(`${id}: shows "${word}"`);
        }
        expect(leaks).toEqual([]);
    });
});

describe('the easy-to-read check', () => {
    const caption = 'A step.';
    const spec = (frames: AnimationSpec['variants'][number]['frames']): AnimationSpec => ({ title: 'T', variants: [{ label: 'v', frames }] });
    const problemsOf = (frames: AnimationSpec['variants'][number]['frames']) => readingProblems({ t: () => spec(frames) });
    const label = { kind: 'text' as const, id: 'label', x: 200, y: 100, text: 'a label here', size: 12 };

    it('passes a plain picture', () => {
        expect(problemsOf([{ caption, shapes: [label] }, { caption, shapes: [{ ...label, y: 120 }] }])).toEqual([]);
    });

    it('catches a step that shows nothing new', () => {
        expect(problemsOf([{ caption, shapes: [label] }, { caption, shapes: [label] }])).toEqual(['t/v#2: the picture is the same as the step before']);
    });

    it('catches a caption that is too long', () => {
        const long = Array.from({ length: 51 }, () => 'word').join(' ');
        expect(problemsOf([{ caption: long, shapes: [label] }])).toEqual(['t/v#1: the caption has 51 words (50 at most)']);
    });

    it('catches a box cut off at the edge', () => {
        expect(problemsOf([{ caption, shapes: [{ kind: 'rect', id: 'box', x: 300, y: 200, w: 90, h: 44, stroke: '#ffffff' }] }])).toEqual(['t/v#1: box is cut off at the edge of the 400×240 picture']);
    });

    it('catches a line through a label, but not a faint grid line or a line hidden by a panel', () => {
        const through = { kind: 'line' as const, id: 'through', x1: 150, y1: 100, x2: 250, y2: 100, stroke: '#ffffff', sw: 2 };
        expect(problemsOf([{ caption, shapes: [through, label] }])).toEqual(['t/v#1: the line through runs through the label "a label here"']);
        expect(problemsOf([{ caption, shapes: [{ ...through, stroke: '#2a333e', sw: 1 }, label] }])).toEqual([]);
        expect(problemsOf([{ caption, shapes: [through, { kind: 'rect', id: 'panel', x: 150, y: 80, w: 100, h: 40, fill: '#0d1117e6' }, label] }])).toEqual([]);
    });

    it('catches a line or a chip over the words inside a box', () => {
        const box = { kind: 'rect' as const, id: 'box', x: 140, y: 80, w: 120, h: 40, fill: '#64b5f638', stroke: '#64b5f6', text: 'order service', size: 11 };
        const line = { kind: 'line' as const, id: 'edge', x1: 100, y1: 100, x2: 300, y2: 100, stroke: '#ffb74d', sw: 2.5 };
        // Drawn first, the line shows through a see-through box, but not through a solid one.
        expect(problemsOf([{ caption, shapes: [line, box] }])).toEqual(['t/v#1: the line edge crosses the words "order service" in box']);
        expect(problemsOf([{ caption, shapes: [line, { ...box, fill: '#1c2f44' }] }])).toEqual([]);
        // Drawn last, it lies on top either way.
        expect(problemsOf([{ caption, shapes: [{ ...box, fill: '#1c2f44' }, line] }])).toEqual(['t/v#1: the line edge crosses the words "order service" in box']);
        const chip = { kind: 'rect' as const, id: 'chip', x: 120, y: 91, w: 70, h: 18, fill: '#ffb74dd9' };
        expect(problemsOf([{ caption, shapes: [box, chip] }])).toEqual(['t/v#1: chip is drawn over the words "order service" in box']);
        expect(problemsOf([{ caption, shapes: [box, { ...chip, y: 68 }] }])).toEqual([]);
    });

    it('catches the outline of one box running through the words in another', () => {
        const chip = { kind: 'rect' as const, id: 'chip', x: 140, y: 91, w: 30, h: 18, fill: '#64b5f659', stroke: '#64b5f6', text: '105', size: 10, mono: true };
        const range = { kind: 'rect' as const, id: 'range', x: 155, y: 40, w: 120, h: 100, fill: '#ffb74d14', stroke: '#ffb74d', sw: 2, dash: '5 4' };
        // The left edge of the range runs down through the chip's number, whichever is drawn first…
        expect(problemsOf([{ caption, shapes: [chip, range] }])).toEqual(['t/v#1: the outline of range runs through the words "105" in chip']);
        expect(problemsOf([{ caption, shapes: [range, chip] }])).toEqual(['t/v#1: the outline of range runs through the words "105" in chip']);
        // …unless the chip is solid and drawn on top, which hides the edge behind it.
        expect(problemsOf([{ caption, shapes: [range, { ...chip, fill: '#2b4a66' }] }])).toEqual([]);
        // A frame that goes right round the chip crosses nothing.
        expect(problemsOf([{ caption, shapes: [chip, { ...range, x: 130, w: 150 }] }])).toEqual([]);
    });

    it('catches two labels on top of each other', () => {
        expect(problemsOf([{ caption, shapes: [label, { ...label, id: 'other', x: 210, text: 'another one' }] }])).toEqual(['t/v#1: the labels "a label here" and "another one" overlap']);
    });
});

describe('time on a step when the animation plays by itself', () => {
    const words = (caption: string) => caption.trim().split(/\s+/).length;

    it('grows with the caption, and a frame\'s own time can only add to it', () => {
        const long = 'word '.repeat(40).trim();
        expect(holdFor({ caption: 'w = 1.6.', shapes: [] })).toBe(2500);
        expect(holdFor({ caption: long, shapes: [] })).toBe(1200 + long.length * 65);
        // A hand-set time shorter than the reading time does not cut the reading short…
        expect(holdFor({ caption: long, shapes: [], hold: 2200 })).toBe(1200 + long.length * 65);
        // …and a longer one is kept.
        expect(holdFor({ caption: 'Watch.', shapes: [], hold: 6000 })).toBe(6000);
        expect(holdFor({ caption: 'word '.repeat(200), shapes: [] })).toBe(30000);
        // What changed is read too, so it adds to the time.
        const changes = ['+ A cache', '~ Each server: 60% → 90% busy'];
        expect(holdFor({ caption: long, shapes: [], changes })).toBe(1200 + `${long} ${changes.join(' ')}`.length * 65);
    });

    it('never asks a beginner to read faster than 260 words a minute', () => {
        const rushed: string[] = [];
        for (const registry of [foundationAnimations, sqlAnimations, sqlSolutionAnimations, systemDesignAnimations]) {
            for (const [id, build] of Object.entries(registry)) {
                for (const variant of build().variants) {
                    variant.frames.forEach((frame, index) => {
                        const perMinute = words(readingOf(frame)) / (holdFor(frame) / 60000);
                        if (perMinute > 260) rushed.push(`${id}/${variant.label}#${index + 1}: ${Math.round(perMinute)} words a minute`);
                    });
                }
            }
        }
        expect(rushed).toEqual([]);
    });
});

describe('moving from one step to the next', () => {
    it('lets every label and line glide, in every animation', () => {
        expect([foundationAnimations, sqlAnimations, sqlSolutionAnimations, systemDesignAnimations].flatMap(movingProblems)).toEqual([]);
    });

    it('catches a label that changes its anchor and a line that changes its number of points', () => {
        const caption = 'A step.';
        const label = { kind: 'text' as const, id: 'label', x: 100, y: 100, text: 'here', anchor: 'start' as const };
        const curve = { kind: 'path' as const, id: 'curve', points: [[0, 0], [10, 10]] as [number, number][] };
        const moved = { ...label, x: 200 };
        const spec = (second: AnimationSpec['variants'][number]['frames'][number]['shapes']): AnimationSpec => ({ title: 'T', variants: [{ label: 'v', frames: [{ caption, shapes: [label, curve] }, { caption, shapes: second }] }] });
        expect(movingProblems({ t: () => spec([moved, curve]) })).toEqual([]);
        expect(movingProblems({ t: () => spec([{ ...moved, anchor: 'end' }, curve]) })).toEqual(['t/v#2: the label label changes its anchor from the step before, so it jumps instead of gliding']);
        expect(movingProblems({ t: () => spec([moved, { ...curve, points: [[0, 0], [5, 5], [10, 10]] }]) })).toEqual(['t/v#2: the line curve has 3 points but had 2 the step before, so it snaps instead of moving']);
    });
});
