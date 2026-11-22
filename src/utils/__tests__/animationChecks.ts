import { DEFAULT_HEIGHT, DEFAULT_WIDTH, isColor, type Shape } from '../../components/learning/anim/scene';
import type { AnimationRegistry } from '../../components/learning/anim/useTopicAnimation';

// Checks every study page's animations share: each frame is valid data and
// fits the picture. Returns a list of problems, so a test can show them all.

const numbersIn = (shape: Shape): number[] => {
    const values: number[] = [];
    for (const value of Object.values(shape)) {
        if (typeof value === 'number') values.push(value);
        if (Array.isArray(value)) value.forEach(p => values.push(...p));
    }
    return values;
};

/** Roughly how wide a line of text is drawn: wide enough to catch labels that spill, not exact. */
const textWidth = (value: string, size: number, mono = false) => {
    const longest = Math.max(...value.split('\n').map(row => [...row].length));
    return longest * size * (mono ? 0.6 : 0.55);
};

const textHeight = (value: string, size: number) => value.split('\n').length * size * 1.15;

/** The points a shape covers, for the "inside the picture" check. With `textFit`, text counts at its drawn size. */
const extent = (shape: Shape, textFit: boolean): [number, number][] => {
    switch (shape.kind) {
        case 'rect': return [[shape.x, shape.y], [shape.x + shape.w, shape.y + shape.h]];
        case 'circle': return [[shape.x - shape.r, shape.y - shape.r], [shape.x + shape.r, shape.y + shape.r]];
        case 'line': return [[shape.x1, shape.y1], [shape.x2, shape.y2]];
        case 'path': return shape.points;
        case 'text': {
            if (!textFit) return [[shape.x, shape.y]];
            const size = shape.size ?? 13;
            const w = textWidth(shape.text, size, shape.mono);
            const h = textHeight(shape.text, size);
            const anchor = shape.anchor ?? 'middle';
            const left = anchor === 'start' ? shape.x : anchor === 'end' ? shape.x - w : shape.x - w / 2;
            return [[left, shape.y - h / 2], [left + w, shape.y + h / 2]];
        }
    }
};

/** A label inside a rect or circle that is too big for it. */
const labelOverflow = (shape: Shape): string | null => {
    if ((shape.kind !== 'rect' && shape.kind !== 'circle') || !shape.text) return null;
    const size = shape.size ?? (shape.kind === 'rect' ? 13 : 12);
    const w = textWidth(shape.text, size, shape.mono);
    const h = textHeight(shape.text, size);
    const [boxW, boxH] = shape.kind === 'rect' ? [shape.w, shape.h] : [2 * shape.r, 2 * shape.r];
    // Labels can sit right up to the edge; a few units of slack for the estimate.
    if (w > boxW + 6 || h > boxH + 6) return `label "${shape.text}" (${Math.round(w)}×${Math.round(h)}) does not fit its ${Math.round(boxW)}×${Math.round(boxH)} box`;
    return null;
};

export interface AnimationCheckOptions {
    /** Also check that text, at its drawn size, stays inside the picture and inside its box. */
    textFit?: boolean;
}

export const animationProblems = (registry: AnimationRegistry, o: AnimationCheckOptions = {}): string[] => {
    const { textFit = false } = o;
    const problems: string[] = [];
    for (const [topicId, build] of Object.entries(registry)) {
        const spec = build();
        const w = spec.width ?? DEFAULT_WIDTH;
        const h = spec.height ?? DEFAULT_HEIGHT;
        if (!spec.title.trim()) problems.push(`${topicId}: no title`);
        if (spec.variants.length === 0) problems.push(`${topicId}: no variants`);
        const labels = spec.variants.map(v => v.label);
        if (new Set(labels).size !== labels.length) problems.push(`${topicId}: repeated variant label`);
        for (const variant of spec.variants) {
            if (variant.frames.length < 2) problems.push(`${topicId}/${variant.label}: fewer than 2 frames`);
            if (variant.frames.length > 16) problems.push(`${topicId}/${variant.label}: more than 16 frames`);
            variant.frames.forEach((frame, index) => {
                const where = `${topicId}/${variant.label}#${index}`;
                if (!frame.caption.trim()) problems.push(`${where}: no caption`);
                const ids = frame.shapes.map(s => s.id);
                const repeated = ids.filter((id, i) => ids.indexOf(id) !== i);
                if (repeated.length) problems.push(`${where}: repeated ids ${repeated.join(', ')}`);
                for (const shape of frame.shapes) {
                    if (numbersIn(shape).some(n => !Number.isFinite(n))) problems.push(`${where}: ${shape.id} has a non-finite number`);
                    for (const key of ['fill', 'stroke', 'textColor'] as const) {
                        const value = (shape as unknown as Record<string, unknown>)[key];
                        if (typeof value === 'string' && !isColor(value)) problems.push(`${where}: ${shape.id} bad ${key} ${value}`);
                    }
                    if ((shape.opacity ?? 1) <= 0.01) continue;
                    // A little slack for strokes and arrowheads at the edge.
                    if (extent(shape, textFit).some(([x, y]) => x < -4 || y < -4 || x > w + 4 || y > h + 4)) problems.push(`${where}: ${shape.id} is outside the ${w}×${h} picture`);
                    if (textFit) {
                        const overflow = labelOverflow(shape);
                        if (overflow) problems.push(`${where}: ${shape.id} ${overflow}`);
                    }
                }
            });
        }
    }
    return problems;
};

// ============ EASY TO READ ============
// What a learner would trip over even though every shape is valid: a step that shows nothing new,
// a caption too long to hold in mind, a box cut off at the edge, a label with a line through it,
// two labels on top of each other.

type Box = { x0: number; y0: number; x1: number; y1: number };

/** How see-through a colour is: 0 for none, 1 for solid. */
const alphaOf = (color?: string) => (!color || color === 'none' ? 0 : color.length >= 9 ? parseInt(color.slice(7, 9), 16) / 255 : 1);

/** How bright a colour is on the dark background, 0 to 1. */
const brightness = (color?: string) => {
    if (!color || color.length < 7) return 0;
    const n = parseInt(color.slice(1, 7), 16);
    return alphaOf(color) * (0.2126 * (n >> 16) + 0.7152 * ((n >> 8) & 255) + 0.0722 * (n & 255)) / 255;
};

/** The box a label is drawn in. `inset` shrinks it to the part the letters really fill. */
const labelBox = (shape: Shape, inset = 0): (Box & { value: string }) | null => {
    if ((shape.opacity ?? 1) <= 0.05) return null;
    if (shape.kind === 'text') {
        if (!shape.text.trim()) return null;
        const size = shape.size ?? 13;
        const w = textWidth(shape.text, size, shape.mono);
        const h = textHeight(shape.text, size);
        const anchor = shape.anchor ?? 'middle';
        const left = anchor === 'start' ? shape.x : anchor === 'end' ? shape.x - w : shape.x - w / 2;
        return { x0: left + size * inset, x1: left + w - size * inset, y0: shape.y - h / 2 + size * inset, y1: shape.y + h / 2 - size * inset, value: shape.text };
    }
    if ((shape.kind === 'rect' || shape.kind === 'circle') && shape.text?.trim()) {
        const size = shape.size ?? (shape.kind === 'rect' ? 13 : 12);
        const w = textWidth(shape.text, size, shape.mono);
        const h = textHeight(shape.text, size);
        const [cx, cy] = shape.kind === 'rect' ? [shape.x + shape.w / 2, shape.y + shape.h / 2] : [shape.x, shape.y];
        return { x0: cx - w / 2 + size * inset, x1: cx + w / 2 - size * inset, y0: cy - h / 2 + size * inset, y1: cy + h / 2 - size * inset, value: shape.text };
    }
    return null;
};

/** How much of the line from (x1, y1) to (x2, y2) lies inside the box. */
const lengthInside = (box: Box, x1: number, y1: number, x2: number, y2: number) => {
    let from = 0;
    let to = 1;
    const dx = x2 - x1;
    const dy = y2 - y1;
    for (const [p, q] of [[-dx, x1 - box.x0], [dx, box.x1 - x1], [-dy, y1 - box.y0], [dy, box.y1 - y1]]) {
        if (p === 0) {
            if (q < 0) return 0;
            continue;
        }
        const r = q / p;
        if (p < 0) from = Math.max(from, r);
        else to = Math.min(to, r);
        if (from > to) return 0;
    }
    return (to - from) * Math.hypot(dx, dy);
};

/** How much of a line or a path lies inside the box. */
const strokeInside = (box: Box, stroke: Extract<Shape, { kind: 'line' | 'path' }>) => {
    const points: [number, number][] = stroke.kind === 'line' ? [[stroke.x1, stroke.y1], [stroke.x2, stroke.y2]] : stroke.closed ? [...stroke.points, stroke.points[0]] : stroke.points;
    let total = 0;
    for (let i = 1; i < points.length; i++) total += lengthInside(box, points[i - 1][0], points[i - 1][1], points[i][0], points[i][1]);
    return total;
};

/** A thin, dark line: a grid line, meant to pass behind things. */
const isFaint = (stroke: Extract<Shape, { kind: 'line' | 'path' }>) => brightness(stroke.stroke) * (stroke.opacity ?? 1) < 0.5 && (stroke.sw ?? 2) <= 1.5;

/** A filled box that covers the whole of `area`. */
const covers = (cover: Shape, area: Box, solidFrom: number) => cover.kind === 'rect' && alphaOf(cover.fill) >= solidFrom
    && cover.x <= area.x0 + 1 && cover.y <= area.y0 + 1 && cover.x + cover.w >= area.x1 - 1 && cover.y + cover.h >= area.y1 - 1;

const short = (value: string) => value.replace(/\n/g, ' ').slice(0, 28);

export const readingProblems = (registry: AnimationRegistry): string[] => {
    const problems: string[] = [];
    for (const [topicId, build] of Object.entries(registry)) {
        const spec = build();
        const w = spec.width ?? DEFAULT_WIDTH;
        const h = spec.height ?? DEFAULT_HEIGHT;
        for (const variant of spec.variants) {
            let before = '';
            variant.frames.forEach((frame, index) => {
                const where = `${topicId}/${variant.label}#${index + 1}`;
                const shapes = frame.shapes.filter(shape => (shape.opacity ?? 1) > 0.05);

                // Each step must show something new: if only the caption changes, the eye has nothing to follow.
                const now = JSON.stringify(frame.shapes);
                if (index > 0 && now === before) problems.push(`${where}: the picture is the same as the step before`);
                before = now;

                const words = frame.caption.trim().split(/\s+/).length;
                if (words > 50) problems.push(`${where}: the caption has ${words} words (50 at most)`);

                // A box or a dot that leaves the picture is cut off there.
                for (const shape of shapes) {
                    const edge = shape.kind === 'rect' && (shape.text || alphaOf(shape.fill) > 0 || alphaOf(shape.stroke) > 0)
                        ? [shape.x, shape.y, shape.x + shape.w, shape.y + shape.h]
                        : shape.kind === 'circle' ? [shape.x - shape.r, shape.y - shape.r, shape.x + shape.r, shape.y + shape.r] : null;
                    if (edge && Math.max(-edge[0], -edge[1], edge[2] - w, edge[3] - h) > 1.5) problems.push(`${where}: ${shape.id} is cut off at the edge of the ${w}×${h} picture`);
                }

                // A label with a line drawn through it. Thin, dark grid lines are meant to pass behind labels,
                // and a filled box drawn between the two hides the line.
                shapes.forEach((label, labelAt) => {
                    if (label.kind !== 'text') return;
                    const inner = labelBox(label, 0.21);
                    const outer = labelBox(label);
                    if (!inner || !outer || (label.opacity ?? 1) <= 0.3) return;
                    shapes.forEach((stroke, strokeAt) => {
                        if ((stroke.kind !== 'line' && stroke.kind !== 'path') || alphaOf(stroke.stroke) === 0 || (stroke.opacity ?? 1) <= 0.3 || isFaint(stroke)) return;
                        if (strokeInside(inner, stroke) < 3) return;
                        const hidden = shapes.some((cover, coverAt) => coverAt > strokeAt && coverAt < labelAt && covers(cover, outer, 0.6));
                        if (!hidden) problems.push(`${where}: the line ${stroke.id} runs through the label "${short(label.text)}"`);
                    });
                });

                // The words inside a box. A line drawn after the box lies on top of them; a bright line drawn before
                // a see-through box shows through them; a box or a chip drawn later can cover them.
                shapes.forEach((box, boxAt) => {
                    if ((box.kind !== 'rect' && box.kind !== 'circle') || (box.opacity ?? 1) <= 0.3) return;
                    const words = labelBox(box, 0.21);
                    if (!words) return;
                    const solid = alphaOf(box.fill) >= 0.75;
                    shapes.forEach((other, otherAt) => {
                        if (other === box || (other.opacity ?? 1) <= 0.3) return;
                        if (other.kind === 'line' || other.kind === 'path') {
                            if (alphaOf(other.stroke) === 0 || strokeInside(words, other) < 3) return;
                            if (otherAt < boxAt && (solid || isFaint(other) || shapes.some((cover, coverAt) => coverAt > otherAt && coverAt < boxAt && covers(cover, words, 0.75)))) return;
                            problems.push(`${where}: the line ${other.id} crosses the words "${short(words.value)}" in ${box.id}`);
                        } else if (other.kind === 'rect' && otherAt > boxAt && alphaOf(other.fill) >= 0.3) {
                            const overlapW = Math.min(words.x1, other.x + other.w) - Math.max(words.x0, other.x);
                            const overlapH = Math.min(words.y1, other.y + other.h) - Math.max(words.y0, other.y);
                            if (overlapW >= 2 && overlapH >= 2) problems.push(`${where}: ${other.id} is drawn over the words "${short(words.value)}" in ${box.id}`);
                        }
                    });
                });

                // Two labels on top of each other.
                const labels = shapes.map(shape => labelBox(shape)).filter((box): box is Box & { value: string } => box !== null);
                for (let i = 0; i < labels.length; i++) {
                    for (let j = i + 1; j < labels.length; j++) {
                        const a = labels[i];
                        const b = labels[j];
                        const overlapW = Math.min(a.x1, b.x1) - Math.max(a.x0, b.x0);
                        const overlapH = Math.min(a.y1, b.y1) - Math.max(a.y0, b.y0);
                        if (overlapW <= 0 || overlapH <= 0) continue;
                        const smaller = Math.min((a.x1 - a.x0) * (a.y1 - a.y0), (b.x1 - b.x0) * (b.y1 - b.y0));
                        if ((overlapW * overlapH) / smaller > 0.25) problems.push(`${where}: the labels "${short(a.value)}" and "${short(b.value)}" overlap`);
                    }
                }
            });
        }
    }
    return problems;
};
