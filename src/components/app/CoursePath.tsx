// A course drawn as a winding path: each unit (phase) is a banner, each topic a
// node to tap, with the next one marked START. Used on the home page and on
// each course page.
//
// Kept short so it needs little scrolling: a topic's name sits beside its node,
// and only the unit you are working on is open. Tap any other unit to open it.

import { useEffect, useState } from 'react';
import { Box, Button, ButtonBase, Collapse, Popover, Stack, Tooltip, Typography } from '@mui/material';
import CheckRoundedIcon from '@mui/icons-material/CheckRounded';
import PlayArrowRoundedIcon from '@mui/icons-material/PlayArrowRounded';
import MenuBookRoundedIcon from '@mui/icons-material/MenuBookRounded';
import EmojiEventsRoundedIcon from '@mui/icons-material/EmojiEventsRounded';
import ExpandMoreRoundedIcon from '@mui/icons-material/ExpandMoreRounded';
import BoltRoundedIcon from '@mui/icons-material/BoltRounded';
import SchoolRoundedIcon from '@mui/icons-material/SchoolRounded';
import type { CourseInfo, PathTopic, PathUnit } from '../../game/courses';
import { checksPassedIn, type ChecksDoc } from '../../game/xp';
import type { PracticeRecord } from '../../services/progress';
import { useTracksProgress } from '../../services/account';
import PracticeDialog from '../practice/PracticeDialog';
import { primeVoice } from '../practice/voice';
import { MASTERED, XP_GOLD } from './colours';

export const CARD = { p: { xs: 2, sm: 2.5 }, borderRadius: 3, bgcolor: 'background.paper', border: '1px solid rgba(255,255,255,0.08)' } as const;

export const CheckDots = ({ passed, names, colour }: { passed: number; names: string[]; colour: string }) => (
    <Stack direction="row" spacing={0.75} alignItems="center" aria-label={`${passed} of 4 checks passed`}>
        {names.map((name, i) => (
            <Tooltip key={name} title={name}>
                <Box sx={{ width: 26, height: 8, borderRadius: 4, bgcolor: i < passed ? colour : 'rgba(255,255,255,0.12)' }} />
            </Tooltip>
        ))}
        <Typography variant="body2" color="text.secondary" sx={{ pl: 0.5 }}>
            {passed}/4 checks
        </Typography>
    </Stack>
);

/** How far each node sits from the centre line, in steps, so the path winds. */
const WIND = [0, 1, 1.6, 1, 0, -1, -1.6, -1];

type NodeState = 'mastered' | 'current' | 'started' | 'upcoming';

const NODE = 58;
/** A row is the node plus its name; narrower on a phone. */
const ROW = { xs: 180, sm: 220 };
const STEP = { xs: 26, sm: 56 };

const ProgressRing = ({ passed, colour }: { passed: number; colour: string }) => {
    const size = NODE + 10;
    const r = size / 2 - 4;
    const c = 2 * Math.PI * r;
    return (
        <Box component="svg" viewBox={`0 0 ${size} ${size}`} sx={{ position: 'absolute', inset: -5, width: size, height: size, transform: 'rotate(-90deg)', pointerEvents: 'none' }}>
            <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="rgba(255,255,255,0.1)" strokeWidth={5} />
            <circle
                cx={size / 2}
                cy={size / 2}
                r={r}
                fill="none"
                stroke={colour}
                strokeWidth={5}
                strokeLinecap="round"
                strokeDasharray={`${(passed / 4) * c} ${c}`}
            />
        </Box>
    );
};

const TopicNode = ({
    topic,
    state,
    passed,
    accent,
    offset,
    practised,
    onOpen,
}: {
    topic: PathTopic;
    state: NodeState;
    passed: number;
    accent: string;
    offset: number;
    practised: boolean;
    onOpen: (el: HTMLElement) => void;
}) => {
    const fill = {
        mastered: accent,
        current: accent,
        started: `${accent}40`,
        upcoming: '#252b36',
    }[state];
    const icon = {
        mastered: <CheckRoundedIcon sx={{ fontSize: 30, color: '#0B0E14' }} />,
        current: <PlayArrowRoundedIcon sx={{ fontSize: 34, color: '#0B0E14' }} />,
        started: <Typography sx={{ fontWeight: 800, fontSize: '0.9rem', color: 'text.primary' }}>{passed}/4</Typography>,
        upcoming: <MenuBookRoundedIcon sx={{ fontSize: 24, color: '#6b7380' }} />,
    }[state];
    // The name sits on the side away from the bend, so it never runs off the edge.
    const labelLeft = offset > 0;

    return (
        <Stack
            id={`node-${topic.id}`}
            direction={labelLeft ? 'row-reverse' : 'row'}
            alignItems="center"
            spacing={1.5}
            sx={{
                width: { xs: ROW.xs, sm: ROW.sm },
                // Stack resets its children's margins, so centre with alignSelf, not mx: auto.
                alignSelf: 'center',
                scrollMarginTop: 160,
                // The node, not the whole row, follows the winding line.
                transform: {
                    xs: `translateX(${offset * STEP.xs + (labelLeft ? -1 : 1) * (ROW.xs / 2 - NODE / 2)}px)`,
                    sm: `translateX(${offset * STEP.sm + (labelLeft ? -1 : 1) * (ROW.sm / 2 - NODE / 2)}px)`,
                },
            }}
        >
            <Box sx={{ position: 'relative', width: NODE, height: NODE, flexShrink: 0 }}>
                {state === 'current' && (
                    <Box
                        sx={{
                            position: 'absolute',
                            bottom: '100%',
                            left: '50%',
                            mb: 1,
                            px: 1.25,
                            py: 0.25,
                            borderRadius: 2,
                            bgcolor: '#fff',
                            color: '#0B0E14',
                            fontWeight: 800,
                            fontSize: '0.72rem',
                            letterSpacing: 1,
                            whiteSpace: 'nowrap',
                            zIndex: 1,
                            animation: 'aepBob 1.6s ease-in-out infinite',
                            '@keyframes aepBob': {
                                '0%, 100%': { transform: 'translate(-50%, 0)' },
                                '50%': { transform: 'translate(-50%, -4px)' },
                            },
                            '&::after': {
                                content: '""',
                                position: 'absolute',
                                top: '100%',
                                left: '50%',
                                transform: 'translateX(-50%)',
                                border: '5px solid transparent',
                                borderTopColor: '#fff',
                            },
                        }}
                    >
                        {passed > 0 ? 'CONTINUE' : 'START'}
                    </Box>
                )}
                {(state === 'current' || state === 'started') && <ProgressRing passed={passed} colour={state === 'current' ? '#fff' : accent} />}
                {practised && (
                    <Box
                        aria-hidden
                        sx={{ position: 'absolute', top: -4, right: -4, zIndex: 1, width: 22, height: 22, borderRadius: '50%', bgcolor: XP_GOLD, border: '2px solid #0B0E14', display: 'grid', placeItems: 'center' }}
                    >
                        <BoltRoundedIcon sx={{ fontSize: 14, color: '#0B0E14' }} />
                    </Box>
                )}
                <ButtonBase
                    onClick={event => onOpen(event.currentTarget)}
                    aria-label={`${topic.name}: ${passed} of 4 checks${state === 'mastered' ? ', mastered' : ''}${practised ? ', practised' : ''}`}
                    sx={{
                        width: NODE,
                        height: NODE,
                        borderRadius: '50%',
                        bgcolor: fill,
                        boxShadow: state === 'upcoming' ? '0 5px 0 #161a22' : `0 5px 0 ${accent}88`,
                        transition: 'transform 0.12s',
                        '&:hover': { transform: 'translateY(-2px)' },
                        '&:active': { transform: 'translateY(3px)', boxShadow: 'none' },
                        ...(state === 'current' && {
                            animation: 'aepPulse 2s ease-out infinite',
                            '@keyframes aepPulse': {
                                '0%': { boxShadow: `0 5px 0 ${accent}88, 0 0 0 0 ${accent}88` },
                                '70%': { boxShadow: `0 5px 0 ${accent}88, 0 0 0 14px ${accent}00` },
                                '100%': { boxShadow: `0 5px 0 ${accent}88, 0 0 0 0 ${accent}00` },
                            },
                        }),
                    }}
                >
                    {icon}
                </ButtonBase>
            </Box>
            <Typography
                component="button"
                onClick={(event: React.MouseEvent<HTMLElement>) => onOpen(event.currentTarget)}
                tabIndex={-1}
                sx={{
                    all: 'unset',
                    cursor: 'pointer',
                    flex: 1,
                    minWidth: 0,
                    textAlign: labelLeft ? 'right' : 'left',
                    fontSize: '0.875rem',
                    fontWeight: state === 'current' ? 800 : 600,
                    color: state === 'upcoming' ? 'text.secondary' : 'text.primary',
                    display: '-webkit-box',
                    WebkitLineClamp: 2,
                    WebkitBoxOrient: 'vertical',
                    overflow: 'hidden',
                    lineHeight: 1.3,
                }}
            >
                {topic.name}
            </Typography>
        </Stack>
    );
};

const UnitBanner = ({
    unit,
    mastered,
    open,
    tracking,
    onToggle,
    onOpenUnit,
}: {
    unit: PathUnit;
    mastered: number;
    open: boolean;
    tracking: boolean;
    onToggle: () => void;
    onOpenUnit?: () => void;
}) => (
    <Box sx={{ ...CARD, p: 0, borderLeft: `6px solid ${unit.accent}`, bgcolor: `${unit.accent}12`, overflow: 'hidden' }}>
        <Stack direction="row" alignItems="center" spacing={1}>
            <ButtonBase
                onClick={onToggle}
                aria-expanded={open}
                sx={{ flex: 1, minWidth: 0, display: 'block', textAlign: 'left', p: { xs: 1.75, sm: 2 } }}
            >
                <Stack direction="row" alignItems="center" spacing={1.5}>
                    <Box sx={{ minWidth: 0, flex: 1 }}>
                        <Typography variant="caption" sx={{ fontWeight: 800, letterSpacing: 1.2, color: unit.accent }}>
                            UNIT {unit.number} · {unit.topics.length} LESSONS
                        </Typography>
                        <Typography sx={{ fontWeight: 800, lineHeight: 1.25, fontSize: '1.05rem' }}>
                            {unit.title}
                        </Typography>
                        {open && (
                            <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5, display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
                                {unit.goal}
                            </Typography>
                        )}
                    </Box>
                    {tracking && (
                        <Typography sx={{ fontWeight: 800, whiteSpace: 'nowrap', color: mastered === unit.topics.length ? MASTERED : 'text.secondary' }}>
                            {mastered}/{unit.topics.length}
                        </Typography>
                    )}
                    <ExpandMoreRoundedIcon sx={{ color: 'text.secondary', transform: open ? 'rotate(180deg)' : 'none', transition: 'transform 0.2s' }} />
                </Stack>
            </ButtonBase>
            {onOpenUnit && (
                <Button
                    size="small"
                    variant="outlined"
                    startIcon={<MenuBookRoundedIcon />}
                    onClick={onOpenUnit}
                    sx={{ borderColor: `${unit.accent}88`, color: 'text.primary', whiteSpace: 'nowrap', minHeight: 36, mr: { xs: 1.25, sm: 2 }, flexShrink: 0 }}
                >
                    Guide
                </Button>
            )}
        </Stack>
    </Box>
);

const UnitTrophy = ({ complete, unit, onOpenUnit }: { complete: boolean; unit: PathUnit; onOpenUnit?: () => void }) => (
    <Stack alignItems="center">
        <Tooltip title={complete ? `Unit ${unit.number} complete` : `Unit ${unit.number} review: its guide and practice questions`}>
            <ButtonBase
                onClick={onOpenUnit}
                disabled={!onOpenUnit}
                aria-label={`Unit ${unit.number} review`}
                sx={{
                    width: 52,
                    height: 52,
                    borderRadius: '50%',
                    bgcolor: complete ? `${XP_GOLD}26` : 'rgba(255,255,255,0.04)',
                    border: `3px solid ${complete ? XP_GOLD : 'rgba(255,255,255,0.1)'}`,
                }}
            >
                <EmojiEventsRoundedIcon sx={{ fontSize: 28, color: complete ? XP_GOLD : '#4a5160' }} />
            </ButtonBase>
        </Tooltip>
    </Stack>
);

const TopicPopover = ({
    course,
    topic,
    passed,
    tracking,
    practised,
    anchor,
    onClose,
    onStart,
    onPractice,
}: {
    course: CourseInfo;
    topic: PathTopic;
    passed: number;
    tracking: boolean;
    practised: PracticeRecord | undefined;
    anchor: HTMLElement;
    onClose: () => void;
    onStart: () => void;
    /** `learn`: the whole lesson step by step; else the quick practice. */
    onPractice: (learn: boolean) => void;
}) => {
    const learnButton = (main: boolean) => (
        <Button
            fullWidth
            variant={main ? 'contained' : 'outlined'}
            startIcon={<SchoolRoundedIcon />}
            onClick={() => onPractice(true)}
            sx={main
                ? { mt: 2, fontWeight: 800, minHeight: 48, bgcolor: course.colour, color: '#0B0E14', '&:hover': { bgcolor: course.colour, filter: 'brightness(1.1)' } }
                : { mt: 1, fontWeight: 700, minHeight: 44, color: 'text.primary', borderColor: 'rgba(255,255,255,0.2)' }}
        >
            {main ? 'Learn it step by step' : 'Learn it again, step by step'} · about 15 min
        </Button>
    );
    const quickButton = (main: boolean) => (
        <Button
            fullWidth
            variant={main ? 'contained' : 'outlined'}
            startIcon={<BoltRoundedIcon />}
            onClick={() => onPractice(false)}
            sx={main
                ? { mt: 2, fontWeight: 800, minHeight: 48, bgcolor: course.colour, color: '#0B0E14', '&:hover': { bgcolor: course.colour, filter: 'brightness(1.1)' } }
                : { mt: 1, fontWeight: 700, minHeight: 44, color: 'text.primary', borderColor: 'rgba(255,255,255,0.2)' }}
        >
            Quick practice · 5 min
        </Button>
    );
    return (
    <Popover
        open
        anchorEl={anchor}
        onClose={onClose}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
        transformOrigin={{ vertical: 'top', horizontal: 'center' }}
        slotProps={{ paper: { sx: { p: 2.5, maxWidth: 360, mt: 1, border: `1px solid ${course.colour}55` } } }}
    >
        <Typography sx={{ fontWeight: 800, mb: 0.75 }}>{topic.name}</Typography>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
            {topic.definition}
        </Typography>
        {tracking && <CheckDots passed={passed} names={course.checkNames} colour={course.colour} />}
        {tracking && practised && (
            <Typography variant="body2" sx={{ mt: 1, color: XP_GOLD, fontWeight: 700 }}>
                Practised {practised.times === 1 ? 'once' : `${practised.times} times`} · best {practised.best}% right first time
            </Typography>
        )}
        {/* New lesson: learn it step by step first. Already practised: a quick practice first. */}
        {practised ? quickButton(true) : learnButton(true)}
        {practised ? learnButton(false) : quickButton(false)}
        <Button fullWidth onClick={onStart} sx={{ mt: 1, fontWeight: 700, minHeight: 40, color: 'text.secondary' }}>
            {passed >= 4 ? 'Review the full lesson' : passed > 0 ? 'Continue the full lesson' : 'Read the full lesson'}
        </Button>
    </Popover>
    );
};

const CoursePath = ({
    course,
    doc,
    onOpenTopic,
    onOpenUnit,
    focusTopicId,
}: {
    course: CourseInfo;
    doc: ChecksDoc | undefined;
    onOpenTopic: (topicId: string) => void;
    /** Opens a unit's guide (its big picture, extra practice and resources). */
    onOpenUnit?: (unitId: string) => void;
    /** Scrolled into view when the path first shows, e.g. the lesson just left. */
    focusTopicId?: string;
}) => {
    const tracking = useTracksProgress();
    const [popover, setPopover] = useState<{ topic: PathTopic; el: HTMLElement } | null>(null);
    /** The lesson being practised, straight from the path, and how. */
    const [practising, setPractising] = useState<{ topicId: string; learn: boolean } | null>(null);
    const topics = course.units.flatMap(unit => unit.topics);
    const firstOpen = topics.find(topic => checksPassedIn(doc, topic.id) < 4)?.id;
    const order = new Map(topics.map((topic, i) => [topic.id, i]));
    const unitIdOf = (topicId?: string) => course.units.find(unit => unit.topics.some(topic => topic.id === topicId))?.id;

    // Open: the unit you are working on, and the one holding the lesson you just left.
    // Other units fold to their banner until tapped.
    const [toggled, setToggled] = useState<Record<string, boolean>>({});
    const openByDefault = new Set([unitIdOf(firstOpen) ?? course.units[0]?.id, unitIdOf(focusTopicId)]);
    const isOpen = (unitId: string) => toggled[unitId] ?? openByDefault.has(unitId);

    useEffect(() => {
        if (!focusTopicId) return;
        // After the unit has opened.
        const timer = window.setTimeout(() => document.getElementById(`node-${focusTopicId}`)?.scrollIntoView({ block: 'center' }), 50);
        return () => window.clearTimeout(timer);
    }, [focusTopicId]);

    return (
        <Stack spacing={2}>
            {course.units.map(unit => {
                const mastered = unit.topics.filter(topic => checksPassedIn(doc, topic.id) >= 4).length;
                const openUnit = onOpenUnit ? () => onOpenUnit(unit.id) : undefined;
                const open = isOpen(unit.id);
                return (
                    <Box key={unit.id}>
                        <UnitBanner
                            unit={unit}
                            mastered={mastered}
                            open={open}
                            tracking={tracking}
                            onToggle={() => setToggled(t => ({ ...t, [unit.id]: !open }))}
                            onOpenUnit={openUnit}
                        />
                        <Collapse in={open} timeout={200} unmountOnExit>
                            <Stack spacing={2.25} sx={{ overflow: 'hidden', pt: 4, pb: 2 }}>
                                {unit.topics.map(topic => {
                                    const passed = checksPassedIn(doc, topic.id);
                                    const state: NodeState = passed >= 4 ? 'mastered' : topic.id === firstOpen ? 'current' : passed > 0 ? 'started' : 'upcoming';
                                    return (
                                        <Box key={topic.id} sx={{ display: 'flex', justifyContent: 'center', pt: state === 'current' ? 2.5 : 0 }}>
                                            <TopicNode
                                                topic={topic}
                                                state={state}
                                                passed={passed}
                                                accent={course.colour}
                                                offset={WIND[(order.get(topic.id) ?? 0) % WIND.length]}
                                                practised={tracking && !!doc?.practice?.[topic.id]}
                                                onOpen={el => setPopover({ topic, el })}
                                            />
                                        </Box>
                                    );
                                })}
                                <UnitTrophy complete={tracking && mastered === unit.topics.length} unit={unit} onOpenUnit={openUnit} />
                            </Stack>
                        </Collapse>
                    </Box>
                );
            })}
            {popover && (
                <TopicPopover
                    course={course}
                    topic={popover.topic}
                    passed={checksPassedIn(doc, popover.topic.id)}
                    tracking={tracking}
                    practised={doc?.practice?.[popover.topic.id]}
                    anchor={popover.el}
                    onClose={() => setPopover(null)}
                    onStart={() => {
                        setPopover(null);
                        onOpenTopic(popover.topic.id);
                    }}
                    onPractice={learn => {
                        // This tap lets an iPhone speak: the coach reads the questions aloud.
                        primeVoice();
                        setPopover(null);
                        setPractising({ topicId: popover.topic.id, learn });
                    }}
                />
            )}
            {practising && <PracticeDialog course={course.id} topicId={practising.topicId} learn={practising.learn} onClose={() => setPractising(null)} />}
        </Stack>
    );
};

export default CoursePath;
