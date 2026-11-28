import { useEffect, useId, useMemo, useRef, useState, useSyncExternalStore, type ReactNode } from 'react';
import { Box, ButtonBase, Dialog, IconButton, Stack, ToggleButton, ToggleButtonGroup, Tooltip, Typography, type SxProps, type Theme } from '@mui/material';
import PlayArrowRoundedIcon from '@mui/icons-material/PlayArrowRounded';
import PauseRoundedIcon from '@mui/icons-material/PauseRounded';
import NavigateBeforeRoundedIcon from '@mui/icons-material/NavigateBeforeRounded';
import NavigateNextRoundedIcon from '@mui/icons-material/NavigateNextRounded';
import ReplayRoundedIcon from '@mui/icons-material/ReplayRounded';
import CheckCircleRoundedIcon from '@mui/icons-material/CheckCircleRounded';
import CancelRoundedIcon from '@mui/icons-material/CancelRounded';
import OpenInFullRoundedIcon from '@mui/icons-material/OpenInFullRounded';
import CloseRoundedIcon from '@mui/icons-material/CloseRounded';
import { TAP, px, useTextSize } from '../learning';
import {
    DEFAULT_HEIGHT,
    DEFAULT_WIDTH,
    easeInOut,
    holdFor,
    tweenShapes,
    type AnimationSpec,
    type Frame,
    type Shape,
} from './scene';

// Plays an AnimationSpec: the picture, the caption for the current frame, and
// controls to play, pause and step. It starts by itself the first time it
// scrolls into view (unless the reader prefers reduced motion), pauses when it
// leaves the screen, and stops on the last frame.
//
// "Bigger picture" opens the same animation full-screen. On a phone held upright the
// labels of an inline picture are only about 7 px tall; the big view turns sideways
// there, so the picture uses the long side of the screen and its text is twice the size.

const TRANSITION_MS = 750;
const MONO = 'ui-monospace, SFMono-Regular, Menlo, Consolas, monospace';

const prefersReducedMotion = () =>
    typeof window !== 'undefined' && window.matchMedia?.('(prefers-reduced-motion: reduce)').matches === true;

/** A device you hold and can turn: a phone or a tablet, not a narrow window on a desk. */
const heldInTheHand = () => typeof window !== 'undefined' && window.matchMedia?.('(pointer: coarse)').matches === true;

/** An arrowhead at (x2, y2), pointing away from (x1, y1). */
const arrowHead = (x1: number, y1: number, x2: number, y2: number, size: number) => {
    const angle = Math.atan2(y2 - y1, x2 - x1);
    const spread = Math.PI / 7;
    const a = [x2 - size * Math.cos(angle - spread), y2 - size * Math.sin(angle - spread)];
    const b = [x2 - size * Math.cos(angle + spread), y2 - size * Math.sin(angle + spread)];
    return `${x2},${y2} ${a[0]},${a[1]} ${b[0]},${b[1]}`;
};

const Lines = ({ x, y, value, size }: { x: number; y: number; value: string; size: number }) => {
    const rows = value.split('\n');
    if (rows.length === 1) return <>{value}</>;
    const first = -((rows.length - 1) * 1.15) / 2;
    return (
        <>
            {rows.map((row, index) => (
                <tspan key={index} x={x} y={y} dy={`${first + index * 1.15}em`} style={{ fontSize: size }}>
                    {row}
                </tspan>
            ))}
        </>
    );
};

const Label = ({ x, y, value, size, color, weight, mono }: { x: number; y: number; value: string; size: number; color: string; weight?: number; mono?: boolean }) => (
    <text
        x={x}
        y={y}
        textAnchor="middle"
        dominantBaseline="central"
        fill={color}
        style={{ fontSize: size, fontWeight: weight ?? 600, fontFamily: mono ? MONO : 'inherit' }}
    >
        <Lines x={x} y={y} value={value} size={size} />
    </text>
);

const ShapeView = ({ shape }: { shape: Shape }) => {
    const opacity = Math.max(0, Math.min(1, shape.opacity ?? 1));
    if (opacity <= 0.01) return null;
    switch (shape.kind) {
        case 'rect':
            return (
                <g opacity={opacity}>
                    <rect
                        x={shape.x}
                        y={shape.y}
                        width={Math.max(0, shape.w)}
                        height={Math.max(0, shape.h)}
                        rx={shape.rx ?? 0}
                        fill={shape.fill ?? 'none'}
                        stroke={shape.stroke ?? 'none'}
                        strokeWidth={shape.sw ?? 0}
                        strokeDasharray={shape.dash}
                    />
                    {shape.text && (
                        <Label x={shape.x + shape.w / 2} y={shape.y + shape.h / 2} value={shape.text} size={shape.size ?? 13} color={shape.textColor ?? '#e6edf3'} weight={shape.weight} mono={shape.mono} />
                    )}
                </g>
            );
        case 'circle':
            return (
                <g opacity={opacity}>
                    <circle cx={shape.x} cy={shape.y} r={Math.max(0, shape.r)} fill={shape.fill ?? 'none'} stroke={shape.stroke ?? 'none'} strokeWidth={shape.sw ?? 0} strokeDasharray={shape.dash} />
                    {shape.text && (
                        <Label x={shape.x} y={shape.y} value={shape.text} size={shape.size ?? 12} color={shape.textColor ?? '#e6edf3'} weight={shape.weight} mono={shape.mono} />
                    )}
                </g>
            );
        case 'line': {
            const stroke = shape.stroke ?? '#90a4ae';
            const width = shape.sw ?? 2;
            return (
                <g opacity={opacity}>
                    <line x1={shape.x1} y1={shape.y1} x2={shape.x2} y2={shape.y2} stroke={stroke} strokeWidth={width} strokeDasharray={shape.dash} strokeLinecap="round" />
                    {shape.arrow && <polygon points={arrowHead(shape.x1, shape.y1, shape.x2, shape.y2, 6 + width * 1.5)} fill={stroke} />}
                </g>
            );
        }
        case 'path': {
            if (shape.points.length === 0) return null;
            const d = shape.points.map(([x, y], index) => `${index === 0 ? 'M' : 'L'}${x.toFixed(1)},${y.toFixed(1)}`).join(' ') + (shape.closed ? ' Z' : '');
            const stroke = shape.stroke ?? '#4dd0e1';
            const width = shape.sw ?? 2.5;
            const n = shape.points.length;
            return (
                <g opacity={opacity}>
                    <path d={d} fill={shape.fill ?? 'none'} stroke={stroke} strokeWidth={width} strokeDasharray={shape.dash} strokeLinejoin="round" strokeLinecap="round" />
                    {shape.arrow && n > 1 && (
                        <polygon points={arrowHead(shape.points[n - 2][0], shape.points[n - 2][1], shape.points[n - 1][0], shape.points[n - 1][1], 6 + width * 1.5)} fill={stroke} />
                    )}
                </g>
            );
        }
        case 'text': {
            const size = shape.size ?? 13;
            return (
                <text
                    x={shape.x}
                    y={shape.y}
                    opacity={opacity}
                    textAnchor={shape.anchor ?? 'middle'}
                    dominantBaseline="central"
                    fill={shape.fill ?? '#e6edf3'}
                    style={{ fontSize: size, fontWeight: shape.weight ?? 500, fontFamily: shape.mono ? MONO : 'inherit' }}
                >
                    <Lines x={shape.x} y={shape.y} value={shape.text} size={size} />
                </text>
            );
        }
    }
};

const GOOD = '#66bb6a';
const BAD = '#ef5350';

/**
 * The frame's numbers above the picture. A number that changed since the step
 * before is outlined in the accent colour, so the eye goes to it; a number
 * past a limit is red with a cross, one that was fixed is green with a tick
 * (never colour alone).
 */
const MetricStrip = ({ frame, before, accent, size }: { frame: Frame; before?: Frame; accent: string; size: number }) => (
    <Box role="group" aria-label="This step's numbers" sx={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(104px, 1fr))', gap: 0.75 }}>
        {(frame.metrics ?? []).map((metric, index) => {
            const was = before?.metrics?.[index];
            const changed = was !== undefined && was.label === metric.label && was.value !== metric.value;
            const border = metric.tone === 'bad' ? `${BAD}aa` : metric.tone === 'good' ? `${GOOD}aa` : changed ? accent : 'rgba(255,255,255,0.08)';
            return (
                <Box
                    key={metric.label}
                    sx={{ px: 1, py: 0.5, borderRadius: 1.5, bgcolor: 'rgba(255,255,255,0.04)', border: '1px solid', borderColor: border, transition: 'border-color 400ms', minWidth: 0 }}
                >
                    <Typography sx={{ color: 'text.secondary', fontSize: px(size * 0.85), fontWeight: 700, lineHeight: 1.25, overflowWrap: 'anywhere' }}>{metric.label}</Typography>
                    <Stack direction="row" alignItems="center" spacing={0.5}>
                        <Typography sx={{ color: 'text.primary', fontWeight: 800, fontSize: px(size * 1.05), fontVariantNumeric: 'tabular-nums', lineHeight: 1.35, minWidth: 0, overflowWrap: 'anywhere' }}>{metric.value}</Typography>
                        {metric.tone === 'bad' && <CancelRoundedIcon aria-label="too high" sx={{ fontSize: 15, color: BAD }} />}
                        {metric.tone === 'good' && <CheckCircleRoundedIcon aria-label="fixed" sx={{ fontSize: 15, color: GOOD }} />}
                    </Stack>
                </Box>
            );
        })}
    </Box>
);

const CHANGE_MARKS: Record<string, [string, string]> = { '+': ['+', GOOD], '~': ['~', '#ffb74d'], '−': ['−', BAD] };

/** What this step changed in the system: one line each, marked + added, ~ changed, − removed. */
const ChangeList = ({ changes, size }: { changes: string[]; size: number }) => (
    <Box component="ul" aria-label="What changed" sx={{ listStyle: 'none', m: 0, p: 0 }}>
        {changes.map(change => {
            const [mark, color] = CHANGE_MARKS[change[0]] ?? ['•', '#90a4ae'];
            const rest = CHANGE_MARKS[change[0]] ? change.slice(1).trim() : change;
            return (
                <Box component="li" key={change} sx={{ display: 'flex', gap: 1, fontSize: px(size), lineHeight: 1.5, color: 'text.primary' }}>
                    <Box component="span" aria-hidden="true" sx={{ color, fontWeight: 800, width: 12, flexShrink: 0, textAlign: 'center', fontFamily: MONO }}>{mark}</Box>
                    <span>{rest}</span>
                </Box>
            );
        })}
    </Box>
);

/** `tip`: show the label as a tooltip too. Off in the big view, where a turned picture would get an upright tooltip. */
const ControlButton = ({ label, onClick, disabled, children, tip = true, size = TAP }: { label: string; onClick: () => void; disabled?: boolean; children: ReactNode; tip?: boolean; size?: number }) => (
    <Tooltip title={tip ? label : ''} arrow>
        <span>
            <IconButton
                aria-label={label}
                onClick={onClick}
                disabled={disabled}
                sx={{
                    width: size,
                    height: size,
                    p: 0,
                    color: 'text.primary',
                    bgcolor: 'rgba(255,255,255,0.05)',
                    '&:hover': { bgcolor: 'rgba(255,255,255,0.1)' },
                    '&:focus': { outline: 'none' },
                    '&.Mui-focusVisible': { outline: '2px solid rgba(255,255,255,0.6)', outlineOffset: 2 },
                }}
            >
                {children}
            </IconButton>
        </span>
    </Tooltip>
);

const onResize = (notify: () => void) => {
    window.addEventListener('resize', notify);
    return () => window.removeEventListener('resize', notify);
};

/** The window's width and height, kept up to date. */
const useWindowSize = () => ({
    w: useSyncExternalStore(onResize, () => window.innerWidth, () => 0),
    h: useSyncExternalStore(onResize, () => window.innerHeight, () => 0),
});

/**
 * The big view adds one entry to the browser history, so Back closes the view instead of leaving the lesson.
 * The entry carries the id of the animation that opened it: a page can hold more than one.
 */
const BIG_VIEW = 'bigPicture';
const bigViewInHistory = () => (typeof window === 'undefined' ? undefined : (window.history.state as Record<string, unknown> | null)?.[BIG_VIEW]);

interface View {
    index: number;
    /** Progress of the move into `index`, 0 to 1. */
    t: number;
    /** Bumped on every jump, so a new move restarts even to the same frame. */
    seq: number;
}

export const AnimatedScene = ({ spec, accent }: { spec: AnimationSpec; accent: string }) => {
    const t = useTextSize();
    const reduced = useMemo(prefersReducedMotion, []);
    const [variant, setVariant] = useState(0);
    const frames = spec.variants[Math.min(variant, spec.variants.length - 1)].frames;
    const [view, setView] = useState<View>({ index: 0, t: 1, seq: 0 });
    const [playing, setPlaying] = useState(false);
    const fromRef = useRef<Shape[]>(frames[0].shapes);
    const shownRef = useRef<Shape[]>(frames[0].shapes);
    /** Once the reader takes control, it never starts by itself again. */
    const touchedRef = useRef(false);
    const boxRef = useRef<HTMLDivElement>(null);
    const [big, setBig] = useState(false);
    const viewId = useId();
    const handheld = useMemo(heldInTheHand, []);
    const win = useWindowSize();

    const width = spec.width ?? DEFAULT_WIDTH;
    const height = spec.height ?? DEFAULT_HEIGHT;
    const current = frames[Math.min(view.index, frames.length - 1)];
    const settled = view.t >= 1;
    const shown = settled ? current.shapes : tweenShapes(fromRef.current, current.shapes, easeInOut(view.t));
    shownRef.current = shown;
    const atEnd = view.index >= frames.length - 1;
    const hasMetrics = frames.some(f => f.metrics?.length);
    const hasChanges = frames.some(f => f.changes?.length);
    const before = view.index > 0 ? frames[view.index - 1] : undefined;
    const shownIndex = Math.min(view.index, frames.length - 1);
    // Every step's numbers (and changes) are drawn in the same place, and only the current one is
    // visible: the space always fits the tallest step, so nothing below jumps as the steps go by.
    const stacked = (sx: SxProps<Theme>, part: (frame: Frame, index: number) => ReactNode) => (
        <Box sx={{ display: 'grid', ...sx }}>
            {frames.map((frame, index) => (
                <Box key={index} aria-hidden={index !== shownIndex} sx={{ gridArea: '1 / 1', minWidth: 0, visibility: index === shownIndex ? 'visible' : 'hidden' }}>
                    {part(frame, index)}
                </Box>
            ))}
        </Box>
    );
    const metrics = (sx: SxProps<Theme> = {}) =>
        hasMetrics && stacked(sx, (frame, index) => <MetricStrip frame={frame} before={index === shownIndex ? before : undefined} accent={accent} size={t.small} />);
    const changeList = (sx: SxProps<Theme> = {}) => hasChanges && stacked(sx, frame => <ChangeList changes={frame.changes ?? []} size={t.small} />);

    const go = (index: number) => {
        fromRef.current = shownRef.current;
        setView(v => ({ index: Math.max(0, Math.min(frames.length - 1, index)), t: reduced ? 1 : 0, seq: v.seq + 1 }));
    };

    // The move between two frames.
    useEffect(() => {
        if (view.t >= 1) return;
        let raf = 0;
        const start = performance.now();
        const tick = (now: number) => {
            const progress = Math.min(1, (now - start) / TRANSITION_MS);
            setView(v => ({ ...v, t: progress }));
            if (progress < 1) raf = requestAnimationFrame(tick);
        };
        raf = requestAnimationFrame(tick);
        return () => cancelAnimationFrame(raf);
        // Only a new jump (seq) starts a move.
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [view.seq]);

    // Playing: wait on each frame long enough to read it, then move on.
    useEffect(() => {
        if (!playing || !settled) return;
        if (atEnd) {
            setPlaying(false);
            return;
        }
        const timer = window.setTimeout(() => go(view.index + 1), holdFor(current));
        return () => window.clearTimeout(timer);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [playing, settled, view.index, view.seq]);

    // Start the first time it is on screen; pause whenever it leaves.
    useEffect(() => {
        const element = boxRef.current;
        if (!element || typeof IntersectionObserver === 'undefined') return;
        const observer = new IntersectionObserver(
            ([entry]) => {
                if (entry.isIntersecting && entry.intersectionRatio >= 0.5) {
                    if (!touchedRef.current && !reduced) {
                        touchedRef.current = true;
                        setPlaying(true);
                    }
                } else if (!entry.isIntersecting) {
                    setPlaying(false);
                }
            },
            { threshold: [0, 0.5] },
        );
        observer.observe(element);
        return () => observer.disconnect();
    }, [reduced]);

    const takeControl = () => {
        touchedRef.current = true;
    };

    // The big view adds one history entry, so the phone's Back button closes it rather than leaving the lesson.
    useEffect(() => {
        const onPop = () => setBig(bigViewInHistory() === viewId);
        window.addEventListener('popstate', onPop);
        return () => window.removeEventListener('popstate', onPop);
    }, [viewId]);
    const openBig = () => {
        window.history.pushState({ ...(window.history.state as object | null), [BIG_VIEW]: viewId }, '');
        setBig(true);
    };
    const closeBig = () => {
        // Going back takes our entry off the history again; the listener above then closes the view.
        if (bigViewInHistory() === viewId) window.history.back();
        else setBig(false);
    };
    // A phone held upright: turn the big view a quarter-turn, so the picture lies along the long side.
    // Only on a device the reader can turn in their hand: a narrow window on a desk stays upright.
    const turned = handheld && win.w > 0 && win.w < 600 && win.h > win.w;
    const bigW = turned ? win.h : win.w;
    const bigH = turned ? win.w : win.h;
    // Wide enough for the caption and the buttons to sit beside the picture instead of under it.
    const beside = bigW > bigH;
    const restart = () => {
        takeControl();
        fromRef.current = frames[0].shapes;
        setView(v => ({ index: 0, t: 1, seq: v.seq + 1 }));
        setPlaying(true);
    };
    const togglePlay = () => {
        takeControl();
        if (atEnd && !playing) restart();
        else setPlaying(p => !p);
    };
    const step = (delta: number) => {
        takeControl();
        setPlaying(false);
        go(view.index + delta);
    };
    const chooseVariant = (next: number | null) => {
        if (next === null || next === variant) return;
        takeControl();
        const nextFrames = spec.variants[next].frames;
        fromRef.current = nextFrames[0].shapes;
        setVariant(next);
        setView(v => ({ index: 0, t: 1, seq: v.seq + 1 }));
        setPlaying(!reduced);
    };

    // The pieces below are drawn twice while the big view is open: once in the lesson, once full-screen.
    const versions = (sx: SxProps<Theme>) => spec.variants.length > 1 && (
        <ToggleButtonGroup
            exclusive
            size="small"
            value={variant}
            onChange={(_, value: number | null) => chooseVariant(value)}
            aria-label="Choose a version"
            sx={{ flexWrap: 'wrap', gap: 0.75, '& .MuiToggleButtonGroup-grouped': { border: '1px solid rgba(255,255,255,0.15) !important', borderRadius: '999px !important', m: 0 }, ...sx }}
        >
            {spec.variants.map((v, index) => (
                <ToggleButton
                    key={v.label}
                    value={index}
                    sx={{
                        minHeight: 36,
                        px: 1.5,
                        textTransform: 'none',
                        fontWeight: 700,
                        fontSize: px(t.small),
                        color: 'text.secondary',
                        '&.Mui-selected': { color: '#0b0f14', bgcolor: accent, '&:hover': { bgcolor: accent } },
                    }}
                >
                    {v.label}
                </ToggleButton>
            ))}
        </ToggleButtonGroup>
    );

    const picture = (sx: SxProps<Theme>) => (
        <Box component="svg" viewBox={`0 0 ${width} ${height}`} role="img" aria-label={spec.title} sx={{ display: 'block', fontFamily: 'inherit', ...sx }}>
            {shown.map(shape => <ShapeView key={shape.id} shape={shape} />)}
        </Box>
    );

    const caption = (sx: SxProps<Theme> = {}) => (
        <Typography variant="body2" aria-live="polite" sx={{ color: 'text.primary', ...sx }}>
            <Box component="span" sx={{ color: accent, fontWeight: 800, mr: 1 }}>
                {view.index + 1}/{frames.length}
            </Box>
            {current.caption}
        </Typography>
    );

    const buttons = (tip: boolean, size = TAP) => (
        <>
            <ControlButton label="Back" onClick={() => step(-1)} disabled={view.index === 0} tip={tip} size={size}>
                <NavigateBeforeRoundedIcon />
            </ControlButton>
            <ControlButton label={playing ? 'Pause' : atEnd ? 'Play again' : 'Play'} onClick={togglePlay} tip={tip} size={size}>
                {playing ? <PauseRoundedIcon /> : atEnd ? <ReplayRoundedIcon /> : <PlayArrowRoundedIcon />}
            </ControlButton>
            <ControlButton label="Next" onClick={() => step(1)} disabled={atEnd} tip={tip} size={size}>
                <NavigateNextRoundedIcon />
            </ControlButton>
        </>
    );

    // One dash per frame: tap one to jump there.
    const dashes = (tall: number = TAP) => (
        <Stack direction="row" spacing={0.5} sx={{ flex: 1, minWidth: 0, pl: 0.5 }}>
            {frames.map((_, index) => (
                <ButtonBase
                    key={index}
                    aria-label={`Go to step ${index + 1}`}
                    onClick={() => {
                        takeControl();
                        setPlaying(false);
                        go(index);
                    }}
                    sx={{
                        flex: 1,
                        minWidth: 0,
                        height: tall,
                        display: 'flex',
                        alignItems: 'center',
                        // The global button style adds padding, a background and a focus ring on click.
                        p: 0,
                        border: 'none',
                        borderRadius: 0,
                        bgcolor: 'transparent',
                        '&:focus': { outline: 'none' },
                        '&.Mui-focusVisible': { outline: `2px solid ${accent}`, outlineOffset: 2 },
                    }}
                >
                    <Box
                        sx={{
                            width: '100%',
                            height: 5,
                            borderRadius: 3,
                            bgcolor: index <= view.index ? accent : 'rgba(255,255,255,0.12)',
                            transition: 'background-color 300ms',
                        }}
                    />
                </ButtonBase>
            ))}
        </Stack>
    );

    const closeButton = (size = TAP) => (
        <ControlButton label="Close the bigger picture" onClick={closeBig} tip={false} size={size}>
            <CloseRoundedIcon />
        </ControlButton>
    );

    // In the narrow column beside a big picture there is no room for a row of version buttons:
    // one button names the version on show, and a tap moves on to the next.
    const nextVersion = spec.variants.length > 1 && (
        <ButtonBase
            onClick={() => chooseVariant((variant + 1) % spec.variants.length)}
            aria-label={`Version ${variant + 1} of ${spec.variants.length}: ${spec.variants[variant].label}. Show the next version`}
            sx={{
                minHeight: 36,
                py: 0,
                px: 1.5,
                gap: 1,
                justifyContent: 'space-between',
                border: 'none',
                borderRadius: '999px',
                bgcolor: accent,
                color: '#0b0f14',
                fontWeight: 700,
                fontSize: px(t.small),
                '&:hover': { bgcolor: accent },
                '&:focus': { outline: 'none' },
                '&.Mui-focusVisible': { outline: '2px solid rgba(255,255,255,0.8)', outlineOffset: 2 },
            }}
        >
            <Box component="span" sx={{ minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{spec.variants[variant].label}</Box>
            <Box component="span" sx={{ flexShrink: 0, opacity: 0.7 }}>
                {variant + 1}/{spec.variants.length} ›
            </Box>
        </ButtonBase>
    );

    return (
        <Box
            ref={boxRef}
            sx={{
                borderRadius: 3,
                overflow: 'hidden',
                border: '1px solid',
                borderColor: `${accent}55`,
                bgcolor: '#0d1117',
            }}
        >
            <Stack direction="row" alignItems="center" spacing={1} sx={{ px: 2, pt: 1.5, flexWrap: 'wrap' }} useFlexGap>
                <Typography variant="caption" sx={{ color: accent, fontWeight: 800, letterSpacing: 1 }}>
                    ANIMATION
                </Typography>
                <Typography sx={{ color: 'text.primary', fontWeight: 700, fontSize: px(t.small) }}>{spec.title}</Typography>
            </Stack>

            {versions({ px: 2, pt: 1.25 })}

            {metrics({ px: 2, pt: 1.25 })}

            {picture({ width: '100%', maxWidth: 640, height: 'auto', mx: 'auto', my: 1, px: 1 })}

            <Box sx={{ px: 2, pb: 1, minHeight: `${3 * 1.6 * t.body2}px` }}>{caption()}</Box>

            {changeList({ px: 2, pb: 1 })}

            <Stack direction="row" alignItems="center" spacing={1} sx={{ px: 1.5, pb: 1.5, pt: 0.5 }}>
                {buttons(true)}
                {dashes()}
                <ControlButton label="Bigger picture" onClick={openBig}>
                    <OpenInFullRoundedIcon fontSize="small" />
                </ControlButton>
            </Stack>

            <Dialog
                fullScreen
                open={big}
                onClose={closeBig}
                slotProps={{ paper: { 'aria-label': `${spec.title}: bigger picture`, sx: { bgcolor: '#0d1117', backgroundImage: 'none', overflow: 'hidden' } } }}
            >
                <Box
                    sx={{
                        position: 'absolute',
                        top: '50%',
                        left: '50%',
                        width: bigW,
                        height: bigH,
                        transform: `translate(-50%, -50%)${turned ? ' rotate(90deg)' : ''}`,
                        display: 'flex',
                        flexDirection: beside ? 'row' : 'column',
                    }}
                >
                    {!beside && (
                        <Stack direction="row" alignItems="center" spacing={1} sx={{ px: 1.5, pt: 1 }}>
                            <Typography sx={{ flex: 1, color: 'text.primary', fontWeight: 700, fontSize: px(t.small) }}>{spec.title}</Typography>
                            {closeButton()}
                        </Stack>
                    )}
                    <Box sx={{ flex: 1, minWidth: 0, minHeight: 0, p: 1 }}>{picture({ width: '100%', height: '100%' })}</Box>
                    {beside ? (
                        // Beside the picture: buttons on top (Close at the far end), then the words, then the dashes.
                        <Stack sx={{ flexShrink: 0, minHeight: 0, width: 'clamp(200px, 30%, 300px)', gap: 1, p: 1.5, borderLeft: '1px solid rgba(255,255,255,0.1)' }}>
                            <Stack direction="row" alignItems="center" justifyContent="space-between">
                                <Stack direction="row" alignItems="center" spacing={0.5}>
                                    {buttons(false, 40)}
                                </Stack>
                                {closeButton(40)}
                            </Stack>
                            {nextVersion}
                            <Box sx={{ flex: 1, minHeight: 0, overflowY: 'auto' }}>
                                {metrics({ mb: 1 })}
                                {caption({ fontSize: '0.875rem', lineHeight: 1.45 })}
                                {changeList({ mt: 1 })}
                            </Box>
                            <Stack direction="row">{dashes(28)}</Stack>
                        </Stack>
                    ) : (
                        // Under the picture: the same order as in the lesson.
                        <Stack sx={{ flexShrink: 0, minHeight: 0, maxHeight: '45%', gap: 1, p: 1.5, borderTop: '1px solid rgba(255,255,255,0.1)' }}>
                            {versions({})}
                            <Box sx={{ flex: 1, minHeight: 0, overflowY: 'auto' }}>
                                {metrics({ mb: 1 })}
                                {caption()}
                                {changeList({ mt: 1 })}
                            </Box>
                            <Stack direction="row" alignItems="center" spacing={1}>
                                {buttons(false)}
                                {dashes()}
                            </Stack>
                        </Stack>
                    )}
                </Box>
            </Dialog>
        </Box>
    );
};
