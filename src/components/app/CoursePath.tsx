// A course drawn as a winding path: each unit (phase) is a banner, each topic a
// node to tap, with the next one marked START. Used on the home page and on
// each course page.

import { useEffect, useState } from 'react';
import { Box, Button, ButtonBase, Popover, Stack, Tooltip, Typography } from '@mui/material';
import CheckRoundedIcon from '@mui/icons-material/CheckRounded';
import PlayArrowRoundedIcon from '@mui/icons-material/PlayArrowRounded';
import MenuBookRoundedIcon from '@mui/icons-material/MenuBookRounded';
import EmojiEventsRoundedIcon from '@mui/icons-material/EmojiEventsRounded';
import type { CourseInfo, PathTopic, PathUnit } from '../../game/courses';
import { checksPassedIn, type ChecksDoc } from '../../game/xp';
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

const NODE = 76;

const ProgressRing = ({ passed, colour }: { passed: number; colour: string }) => {
    const size = NODE + 10;
    const r = size / 2 - 4;
    const c = 2 * Math.PI * r;
    return (
        <Box component="svg" viewBox={`0 0 ${size} ${size}`} sx={{ position: 'absolute', inset: -5, width: size, height: size, transform: 'rotate(-90deg)', pointerEvents: 'none' }}>
            <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="rgba(255,255,255,0.1)" strokeWidth={6} />
            <circle
                cx={size / 2}
                cy={size / 2}
                r={r}
                fill="none"
                stroke={colour}
                strokeWidth={6}
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
    onOpen,
}: {
    topic: PathTopic;
    state: NodeState;
    passed: number;
    accent: string;
    offset: number;
    onOpen: (el: HTMLElement) => void;
}) => {
    const fill = {
        mastered: accent,
        current: accent,
        started: `${accent}40`,
        upcoming: '#252b36',
    }[state];
    const icon = {
        mastered: <CheckRoundedIcon sx={{ fontSize: 38, color: '#0B0E14' }} />,
        current: <PlayArrowRoundedIcon sx={{ fontSize: 42, color: '#0B0E14' }} />,
        started: <Typography sx={{ fontWeight: 800, color: 'text.primary' }}>{passed}/4</Typography>,
        upcoming: <MenuBookRoundedIcon sx={{ fontSize: 30, color: '#6b7380' }} />,
    }[state];

    return (
        <Stack
            id={`node-${topic.id}`}
            alignItems="center"
            sx={{
                width: 200,
                // Stack resets its children's margins, so centre with alignSelf, not mx: auto.
                alignSelf: 'center',
                scrollMarginTop: 160,
                transform: { xs: `translateX(${offset * 38}px)`, sm: `translateX(${offset * 70}px)` },
            }}
        >
            <Box sx={{ position: 'relative', width: NODE, height: NODE, mt: state === 'current' ? 5 : 0 }}>
                {state === 'current' && (
                    <Box
                        sx={{
                            position: 'absolute',
                            bottom: '100%',
                            left: '50%',
                            mb: 1.25,
                            px: 1.5,
                            py: 0.5,
                            borderRadius: 2,
                            bgcolor: '#fff',
                            color: '#0B0E14',
                            fontWeight: 800,
                            fontSize: '0.8rem',
                            letterSpacing: 1,
                            whiteSpace: 'nowrap',
                            animation: 'aepBob 1.6s ease-in-out infinite',
                            '@keyframes aepBob': {
                                '0%, 100%': { transform: 'translate(-50%, 0)' },
                                '50%': { transform: 'translate(-50%, -5px)' },
                            },
                            '&::after': {
                                content: '""',
                                position: 'absolute',
                                top: '100%',
                                left: '50%',
                                transform: 'translateX(-50%)',
                                border: '6px solid transparent',
                                borderTopColor: '#fff',
                            },
                        }}
                    >
                        {passed > 0 ? 'CONTINUE' : 'START'}
                    </Box>
                )}
                {(state === 'current' || state === 'started') && <ProgressRing passed={passed} colour={state === 'current' ? '#fff' : accent} />}
                <ButtonBase
                    onClick={event => onOpen(event.currentTarget)}
                    aria-label={`${topic.name}: ${passed} of 4 checks${state === 'mastered' ? ', mastered' : ''}`}
                    sx={{
                        width: NODE,
                        height: NODE,
                        borderRadius: '50%',
                        bgcolor: fill,
                        boxShadow: state === 'upcoming' ? '0 6px 0 #161a22' : `0 6px 0 ${accent}88`,
                        transition: 'transform 0.12s',
                        '&:hover': { transform: 'translateY(-2px)' },
                        '&:active': { transform: 'translateY(3px)', boxShadow: 'none' },
                        ...(state === 'current' && {
                            animation: 'aepPulse 2s ease-out infinite',
                            '@keyframes aepPulse': {
                                '0%': { boxShadow: `0 6px 0 ${accent}88, 0 0 0 0 ${accent}88` },
                                '70%': { boxShadow: `0 6px 0 ${accent}88, 0 0 0 16px ${accent}00` },
                                '100%': { boxShadow: `0 6px 0 ${accent}88, 0 0 0 0 ${accent}00` },
                            },
                        }),
                    }}
                >
                    {icon}
                </ButtonBase>
            </Box>
            <Typography
                variant="body2"
                sx={{
                    mt: 1.5,
                    textAlign: 'center',
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

const UnitBanner = ({ unit, mastered, onOpenUnit }: { unit: PathUnit; mastered: number; onOpenUnit?: () => void }) => (
    <Box sx={{ ...CARD, borderLeft: `6px solid ${unit.accent}`, bgcolor: `${unit.accent}12`, mb: 4 }}>
        <Stack direction="row" justifyContent="space-between" alignItems="flex-start" spacing={2}>
            <Box sx={{ minWidth: 0 }}>
                <Typography variant="caption" sx={{ fontWeight: 800, letterSpacing: 1.2, color: unit.accent }}>
                    UNIT {unit.number}
                </Typography>
                <Typography variant="h6" sx={{ fontWeight: 800, lineHeight: 1.25 }}>
                    {unit.title}
                </Typography>
                <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5, display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
                    {unit.goal}
                </Typography>
            </Box>
            <Stack alignItems="flex-end" spacing={1} sx={{ flexShrink: 0 }}>
                <Typography sx={{ fontWeight: 800, whiteSpace: 'nowrap', color: mastered === unit.topics.length ? MASTERED : 'text.secondary' }}>
                    {mastered}/{unit.topics.length}
                </Typography>
                {onOpenUnit && (
                    <Button
                        size="small"
                        variant="outlined"
                        startIcon={<MenuBookRoundedIcon />}
                        onClick={onOpenUnit}
                        sx={{ borderColor: `${unit.accent}88`, color: 'text.primary', whiteSpace: 'nowrap', minHeight: 36 }}
                    >
                        Guide
                    </Button>
                )}
            </Stack>
        </Stack>
    </Box>
);

const UnitTrophy = ({ complete, unit, onOpenUnit }: { complete: boolean; unit: PathUnit; onOpenUnit?: () => void }) => (
    <Stack alignItems="center" sx={{ my: 1 }}>
        <Tooltip title={complete ? `Unit ${unit.number} complete` : `Master every topic in unit ${unit.number} to earn this`}>
            <ButtonBase
                onClick={onOpenUnit}
                disabled={!onOpenUnit}
                aria-label={`Unit ${unit.number} review`}
                sx={{
                    width: 64,
                    height: 64,
                    borderRadius: '50%',
                    bgcolor: complete ? `${XP_GOLD}26` : 'rgba(255,255,255,0.04)',
                    border: `3px solid ${complete ? XP_GOLD : 'rgba(255,255,255,0.1)'}`,
                }}
            >
                <EmojiEventsRoundedIcon sx={{ fontSize: 34, color: complete ? XP_GOLD : '#4a5160' }} />
            </ButtonBase>
        </Tooltip>
    </Stack>
);

const TopicPopover = ({
    course,
    topic,
    passed,
    anchor,
    onClose,
    onStart,
}: {
    course: CourseInfo;
    topic: PathTopic;
    passed: number;
    anchor: HTMLElement;
    onClose: () => void;
    onStart: () => void;
}) => (
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
        <CheckDots passed={passed} names={course.checkNames} colour={course.colour} />
        <Button fullWidth variant="contained" onClick={onStart} sx={{ mt: 2, fontWeight: 800, minHeight: 44 }}>
            {passed >= 4 ? 'Review lesson' : passed > 0 ? 'Continue lesson' : 'Start lesson'}
        </Button>
    </Popover>
);

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
    const [open, setOpen] = useState<{ topic: PathTopic; el: HTMLElement } | null>(null);
    const topics = course.units.flatMap(unit => unit.topics);
    const firstOpen = topics.find(topic => checksPassedIn(doc, topic.id) < 4)?.id;
    const order = new Map(topics.map((topic, i) => [topic.id, i]));

    useEffect(() => {
        if (!focusTopicId) return;
        const node = document.getElementById(`node-${focusTopicId}`);
        node?.scrollIntoView({ block: 'center' });
    }, [focusTopicId]);

    return (
        <Box>
            {course.units.map(unit => {
                const mastered = unit.topics.filter(topic => checksPassedIn(doc, topic.id) >= 4).length;
                const openUnit = onOpenUnit ? () => onOpenUnit(unit.id) : undefined;
                return (
                    <Box key={unit.id} sx={{ mb: 6 }}>
                        <UnitBanner unit={unit} mastered={mastered} onOpenUnit={openUnit} />
                        <Stack spacing={3.5} sx={{ overflow: 'hidden', py: 1 }}>
                            {unit.topics.map(topic => {
                                const passed = checksPassedIn(doc, topic.id);
                                const state: NodeState = passed >= 4 ? 'mastered' : topic.id === firstOpen ? 'current' : passed > 0 ? 'started' : 'upcoming';
                                return (
                                    <TopicNode
                                        key={topic.id}
                                        topic={topic}
                                        state={state}
                                        passed={passed}
                                        accent={course.colour}
                                        offset={WIND[(order.get(topic.id) ?? 0) % WIND.length]}
                                        onOpen={el => setOpen({ topic, el })}
                                    />
                                );
                            })}
                            <UnitTrophy complete={mastered === unit.topics.length} unit={unit} onOpenUnit={openUnit} />
                        </Stack>
                    </Box>
                );
            })}
            {open && (
                <TopicPopover
                    course={course}
                    topic={open.topic}
                    passed={checksPassedIn(doc, open.topic.id)}
                    anchor={open.el}
                    onClose={() => setOpen(null)}
                    onStart={() => {
                        setOpen(null);
                        onOpenTopic(open.topic.id);
                    }}
                />
            )}
        </Box>
    );
};

export default CoursePath;
