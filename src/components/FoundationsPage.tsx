import { useMemo, useState } from 'react';
import {
    Box,
    Typography,
    Stack,
    Chip,
    Accordion,
    AccordionSummary,
    AccordionDetails,
    Checkbox,
    Link,
    LinearProgress,
    Tooltip,
    Button,
    ToggleButton,
    ToggleButtonGroup,
} from '@mui/material';
import ExpandMoreRoundedIcon from '@mui/icons-material/ExpandMoreRounded';
import LaunchRoundedIcon from '@mui/icons-material/LaunchRounded';
import MenuBookRoundedIcon from '@mui/icons-material/MenuBookRounded';
import {
    foundationPhases,
    allFoundationTopics,
    allMiniBuilds,
    CHECK_KEYS,
    CHECK_LABELS,
    CHECK_MEANINGS,
    CHECK_EXAMPLES,
    CONFIDENT_RULE,
    RESOURCE_KIND_ORDER,
    RESOURCE_KIND_LABELS,
    topicLoop,
    foundationRules,
    type FoundationTopic,
    type FoundationResource,
    type TopicResource,
    type CheckKey,
} from '../data/foundations';
import { foundationAnimations } from '../data/foundationsAnimations';
import { foundationAnswers } from '../data/foundationsAnswers';
import { mlInterviewSet } from '../data/interviewPrep/ml';
import { genAiInterviewSet } from '../data/interviewPrep/genai';
import { InterviewQuestionsView } from './learning/InterviewQuestions';
import { useFoundations } from '../hooks/useFoundations';
import {
    checksPassed,
    isTopicConfident,
    confidentCount,
    buildsDone,
} from '../utils/foundationsProgress';
import type { FoundationsProgress } from '../services/progress';
import { foundationsGlossary } from '../utils/foundationsGlossary';
import { CONFIDENT, CYAN, TAP, px, stepId, useStudyMode, useTextSize, useTextSizeChoice } from './learning/learning';
import {
    LearningPageFrame,
    TextSizeControl,
    SectionLabel,
    Tag,
    TopicResourceRow,
    CheckDots,
    StepBar,
    ReferencePanel,
    Block,
    Bullets,
    NumberedSteps,
    CodeBlock,
    QuoteBox,
    FollowUps,
    AnswerReveal,
} from './learning/LearningParts';
import { AnimatedScene } from './learning/anim/AnimatedScene';
import { GlossaryProvider, GlossaryTopic, NewWordsBox, ProseText } from './learning/GlossaryText';
import { GlossaryDrawer } from './learning/GlossaryDrawer';
import { MermaidDiagram } from './learning/MermaidDiagram';
import { segmentSections } from './learning/glossaryContext';
import PathLearn from './app/PathLearn';
import QuickPracticePanel from './practice/QuickPracticePanel';
import { useTracksProgress } from '../services/account';
import { useCourseNav } from '../game/useCourseNav';
import { courseById } from '../game/courses';

const FOUNDATIONS_COURSE = courseById('foundations');

type Mode = 'learn' | 'interview';
const MODES: Mode[] = ['learn', 'interview'];
const MODE_KEY = 'foundations-mode';
const INTERVIEW_SETS = [genAiInterviewSet, mlInterviewSet];
/** Interview mode's colour, the same on every study page. */
const INTERVIEW_ACCENT = CYAN;

const topicName = (topicId: string) => allFoundationTopics.find(topic => topic.id === topicId)?.name;
/** Bullet colour for common mistakes, as on the other study pages. */
const WARNING = '#ffa726';

// ============ SMALL PIECES ============

const phaseIndexOf = (topicId: string) =>
    Math.max(0, foundationPhases.findIndex(phase => phase.topics.some(topic => topic.id === topicId)));

const PhaseResource = ({ resource, accent }: { resource: FoundationResource; accent: string }) => (
    <Box sx={{ pl: 2, py: 1, borderLeft: '3px solid', borderColor: accent }}>
        <Stack direction="row" spacing={1} alignItems="center" flexWrap="wrap" useFlexGap>
            {resource.url ? (
                <Link
                    href={resource.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    sx={{ display: 'inline-flex', alignItems: 'center', gap: 0.5, fontWeight: 700, color: 'text.primary' }}
                >
                    {resource.title} <LaunchRoundedIcon sx={{ fontSize: '1em', color: accent }} />
                </Link>
            ) : (
                <Typography fontWeight={700} color="text.primary">{resource.title}</Typography>
            )}
            <Tag label={resource.kind} />
            {resource.free && <Tag label="Free" color={CONFIDENT} bgcolor={`${CONFIDENT}1f`} />}
            {resource.paid && <Tag label="Paid" />}
        </Stack>
        <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
            {resource.why}
        </Typography>
    </Box>
);

// ============ THE TOPIC CARD ============

const STEPS = [
    { title: 'Understand', time: 'the lesson', label: 'STEP 1 · UNDERSTAND IT' },
    { title: 'Go further', time: 'optional', label: 'STEP 2 · GO FURTHER (OPTIONAL)' },
    { title: 'Practise', time: 'about 1 hour', label: 'STEP 3 · PRACTISE, IN THIS ORDER' },
    { title: 'Prove', time: 'next day', label: 'STEP 4 · CHECK YOURSELF, THEN PROVE IT' },
];

/** Derive on paper first, so the code has something to be checked against. */
const PRACTICE_ORDER: { key: CheckKey; hint?: string }[] = [
    { key: 'derive', hint: 'on paper, before any code' },
    { key: 'build' },
    { key: 'break' },
    { key: 'explain' },
];

type Section =
    | 'definition'
    | 'problem'
    | 'idea'
    | 'howItWorks'
    | 'analogy'
    | 'breaks'
    | 'example'
    | 'keyPoints'
    | 'mistakes'
    | 'practice'
    | 'followUps'
    | 'answers';

/**
 * The card's prose in the order it is shown, so only the first mention of each
 * word is underlined. Code, names, labels and resource titles are left out.
 * The hidden practice answers come last, so a word is never underlined only
 * inside an answer that isn't open.
 */
const cardSections = (topic: FoundationTopic): [Section, string[]][] => [
    ['definition', [topic.definition]],
    ['problem', [topic.problem]],
    ['idea', [topic.note.idea]],
    ['howItWorks', topic.howItWorks],
    ['analogy', [topic.note.analogy]],
    ['breaks', [topic.note.breaks]],
    ['example', topic.note.example ? [topic.note.example] : []],
    ['keyPoints', topic.keyPoints],
    ['mistakes', topic.mistakes],
    ['practice', PRACTICE_ORDER.map(({ key }) => topic.practice[key])],
    ['followUps', topic.followUps.flatMap(item => [item.q, item.a])],
    ['answers', PRACTICE_ORDER.map(({ key }) => foundationAnswers[topic.id]?.[key].answer ?? '')],
];

/** The topic's animation, if it has one. Its frames are only worked out once the card is open. */
const TopicAnimation = ({ topicId, accent }: { topicId: string; accent: string }) => {
    const spec = useMemo(() => foundationAnimations[topicId]?.(), [topicId]);
    if (!spec) return null;
    return <AnimatedScene spec={spec} accent={accent} />;
};

/** Worth-it extras first, then the rest by kind; papers last and unnumbered. */
const orderResources = (resources: TopicResource[]) => {
    const sorted = [...resources].sort(
        (a, b) =>
            Number(Boolean(b.recommended)) - Number(Boolean(a.recommended)) ||
            RESOURCE_KIND_ORDER.indexOf(a.kind) - RESOURCE_KIND_ORDER.indexOf(b.kind)
    );
    return { core: sorted.filter(r => r.kind !== 'paper'), papers: sorted.filter(r => r.kind === 'paper') };
};

const TopicCard = ({
    topic,
    number,
    accent,
    progress,
    expanded,
    onExpand,
    onToggleCheck,
}: {
    topic: FoundationTopic;
    number: number;
    accent: string;
    progress: FoundationsProgress;
    expanded: boolean;
    onExpand: (open: boolean) => void;
    onToggleCheck: (check: CheckKey) => void;
}) => {
    const t = useTextSize();
    const passed = checksPassed(progress, topic.id);
    const confident = isTopicConfident(progress, topic.id);
    const { note } = topic;
    const { core, papers } = orderResources(topic.resources);
    const marked = useMemo(() => segmentSections(foundationsGlossary, cardSections(topic)), [topic]);
    const answers = foundationAnswers[topic.id];

    return (
        <Accordion
            id={`topic-${topic.id}`}
            expanded={expanded}
            onChange={(_, open) => onExpand(open)}
            disableGutters
            slotProps={{ transition: { unmountOnExit: true } }}
            sx={{
                bgcolor: confident ? 'rgba(102,187,106,0.06)' : 'rgba(255,255,255,0.02)',
                border: '1px solid',
                borderColor: confident ? 'rgba(102,187,106,0.35)' : 'rgba(255,255,255,0.08)',
                borderRadius: 2,
                '&:before': { display: 'none' },
                scrollMarginTop: 16,
            }}
        >
            <AccordionSummary
                expandIcon={<ExpandMoreRoundedIcon />}
                sx={{ minHeight: TAP }}
                // The open topic's title heads the section rail.
                {...(expanded && { 'data-nav': 'topic', 'data-nav-label': topic.name })}
            >
                <Stack direction="row" spacing={1.5} alignItems="center" sx={{ width: '100%', pr: 1 }} flexWrap="wrap" useFlexGap>
                    <Typography sx={{ color: accent, fontWeight: 800, minWidth: 24, fontVariantNumeric: 'tabular-nums' }}>
                        {number}
                    </Typography>
                    <Typography fontWeight={700} color="text.primary" sx={{ flex: 1, minWidth: 160 }}>
                        {topic.name}
                    </Typography>
                    {confident ? (
                        <Tag label="CONFIDENT" color={CONFIDENT} bgcolor={`${CONFIDENT}1f`} />
                    ) : (
                        <CheckDots passed={passed} total={CHECK_KEYS.length} accent={accent} />
                    )}
                </Stack>
            </AccordionSummary>

            <AccordionDetails sx={{ pt: 0, pb: 3, px: { xs: 2, sm: 3 } }}>
                <GlossaryTopic topicId={topic.id}>
                    <StepBar topicId={topic.id} accent={accent} steps={STEPS} />

                    {/* ---- STEP 1 ---- the lesson, written to be enough on its own */}
                    <SectionLabel color={accent} id={stepId(topic.id, 1)}>{STEPS[0].label}</SectionLabel>
                    <Stack spacing={3} sx={{ maxWidth: 760 }}>
                        <QuoteBox accent={accent}>
                            <Typography variant="body1">
                                <strong style={{ color: accent }}>In one line.</strong> <ProseText value={marked('definition')[0]} />
                            </Typography>
                        </QuoteBox>
                        <NewWordsBox topicId={topic.id} accent={accent} />
                        <Block title="The problem it solves">
                            <Typography variant="body1"><ProseText value={marked('problem')[0]} /></Typography>
                        </Block>
                        <Block title="Watch it happen">
                            <TopicAnimation topicId={topic.id} accent={accent} />
                        </Block>
                        <Block title="The idea">
                            <Typography variant="body1"><ProseText value={marked('idea')[0]} /></Typography>
                        </Block>
                        <Block title="How it works, step by step">
                            <NumberedSteps items={marked('howItWorks')} accent={accent} />
                        </Block>
                        <Block title="Picture it">
                            <MermaidDiagram code={topic.diagram.code} caption={topic.diagram.caption} title={topic.name} />
                        </Block>
                        <Block title="Analogy">
                            <Typography variant="body1"><ProseText value={marked('analogy')[0]} /></Typography>
                        </Block>
                        <Block title="Where the analogy breaks">
                            <Typography variant="body1" color="text.secondary"><ProseText value={marked('breaks')[0]} /></Typography>
                        </Block>
                        {(note.example || note.code) && (
                            <Block title="Worked example">
                                <Stack spacing={1.5}>
                                    {note.example && (
                                        <Typography variant="body1"><ProseText value={marked('example')[0]} /></Typography>
                                    )}
                                    {note.code && <CodeBlock code={note.code} language={note.codeLanguage} />}
                                </Stack>
                            </Block>
                        )}
                        <Block title="Must-know points">
                            <Bullets items={marked('keyPoints')} marker={accent} />
                        </Block>
                        <Block title="Common mistakes">
                            <Bullets items={marked('mistakes')} marker={WARNING} />
                        </Block>
                    </Stack>

                    {/* ---- STEP 2 ---- optional extras */}
                    <SectionLabel color={accent} id={stepId(topic.id, 2)}>{STEPS[1].label}</SectionLabel>
                    <Typography variant="body2" color="text.secondary" sx={{ mb: 1.75, maxWidth: 760 }}>
                        The lesson above is enough on its own. These free extras are optional: a second explanation, more pictures, or more practice.
                        {core.some(r => r.recommended) && ' If you only open one, open the one marked Worth it.'}
                    </Typography>
                    <Stack spacing={1.75} sx={{ maxWidth: 760 }}>
                        {core.map((resource, index) => (
                            <TopicResourceRow key={`${resource.kind}-${resource.title}`} resource={resource} accent={accent} number={index + 1} kindLabels={RESOURCE_KIND_LABELS} allOptional />
                        ))}
                        {papers.map(resource => (
                            <TopicResourceRow key={`${resource.kind}-${resource.title}`} resource={resource} accent={accent} number={null} kindLabels={RESOURCE_KIND_LABELS} allOptional />
                        ))}
                    </Stack>

                    {/* ---- STEP 3 ---- */}
                    <SectionLabel color={accent} id={stepId(topic.id, 3)}>{STEPS[2].label}</SectionLabel>
                    <Stack spacing={2} sx={{ maxWidth: 760 }}>
                        <QuickPracticePanel course="foundations" topicId={topic.id} accent={accent} />
                        <Typography color="text.secondary" sx={{ fontSize: px(t.small) }}>
                            Then the four exercises below. Try each one yourself first: on paper, in code or out loud. Then tap Show answer to check.
                        </Typography>
                        {PRACTICE_ORDER.map(({ key, hint }, index) => (
                            <Stack key={key} direction="row" spacing={1.5} alignItems="flex-start">
                                <Typography sx={{ color: accent, fontWeight: 800, minWidth: 22, flexShrink: 0 }}>
                                    {index + 1}
                                </Typography>
                                <Box sx={{ minWidth: 0 }}>
                                    <Typography variant="caption" sx={{ display: 'block', color: accent, fontWeight: 800, letterSpacing: 0.8 }}>
                                        {CHECK_LABELS[key].toUpperCase()}
                                        {hint && (
                                            <Box component="span" sx={{ color: 'text.secondary', fontWeight: 600, letterSpacing: 0 }}>
                                                {' '}({hint})
                                            </Box>
                                        )}
                                    </Typography>
                                    <Typography variant="body2" sx={{ color: 'text.primary' }}>
                                        <ProseText value={marked('practice')[index]} />
                                    </Typography>
                                    {answers && (
                                        <AnswerReveal id={`answer-${topic.id}-${key}`} text={marked('answers')[index]} accent={accent}>
                                            {answers[key].code && <CodeBlock code={answers[key].code} language={answers[key].codeLanguage} />}
                                        </AnswerReveal>
                                    )}
                                </Box>
                            </Stack>
                        ))}
                        <Typography color="text.secondary" sx={{ pt: 0.5, fontStyle: 'italic', fontSize: px(t.small) }}>
                            Yours can use different words and still be right: compare the key steps, not the wording.
                            Not sure yours counts? Ask an AI assistant: "check my answer: {topic.name}".
                        </Typography>
                    </Stack>

                    {/* ---- STEP 4 ---- check understanding, then the checks, at the end of the work */}
                    <SectionLabel color={accent} id={stepId(topic.id, 4)}>{STEPS[3].label}</SectionLabel>
                    <Stack spacing={3} sx={{ maxWidth: 760 }}>
                        <Block title="Check you understood">
                            <Typography color="text.secondary" sx={{ mb: 1.25, fontSize: px(t.small) }}>
                                Answer in your head first, then tap to compare.
                            </Typography>
                            <FollowUps topic={topic} accent={accent} marked={marked} />
                        </Block>
                        <Box>
                            <Typography variant="body2" sx={{ color: 'text.primary', mb: 1.5 }}>
                                Then prove it the next day with your notes closed. Tick only what you can do from memory.
                            </Typography>
                            <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
                                {CHECK_KEYS.map(key => {
                                    const done = progress.checks[topic.id]?.[key] === true;
                                    const fill = confident ? CONFIDENT : accent;
                                    return (
                                        <Tooltip key={key} title={CHECK_MEANINGS[key]} arrow>
                                            <Chip
                                                label={CHECK_LABELS[key]}
                                                onClick={() => onToggleCheck(key)}
                                                aria-pressed={done}
                                                sx={{
                                                    height: TAP,
                                                    px: 1,
                                                    borderRadius: TAP / 2,
                                                    fontSize: px(t.small),
                                                    fontWeight: 700,
                                                    color: done ? '#0b0f14' : 'text.secondary',
                                                    bgcolor: done ? fill : 'rgba(255,255,255,0.05)',
                                                    border: '1px solid',
                                                    borderColor: done ? 'transparent' : 'rgba(255,255,255,0.14)',
                                                    '&:hover': { bgcolor: done ? fill : 'rgba(255,255,255,0.1)' },
                                                }}
                                            />
                                        </Tooltip>
                                    );
                                })}
                            </Stack>
                        </Box>
                    </Stack>
                </GlossaryTopic>
            </AccordionDetails>
        </Accordion>
    );
};

// ============ THE PAGE ============

/**
 * ML Foundations: the self-paced roadmap, taken in order.
 *
 * Every topic is worked in four steps: understand the lesson (written to be
 * enough on its own, with an animation), optionally go further with free
 * extras, practise its exercises, and the next day prove it with the four
 * checks. A topic only counts once all four are ticked, and ticks can come off
 * again — the re-test rule depends on it.
 *
 * Self-paced: no dates, no weeks. The next thing to do is simply the first
 * topic that is not yet confident.
 */
const FoundationsPage = () => {
    const { progress, toggleCheck, toggleBuild } = useFoundations();
    const tracking = useTracksProgress();

    const { textSize, t, theme, changeTextSize } = useTextSizeChoice();

    const [mode, changeMode] = useStudyMode(MODE_KEY, MODES);

    const [glossaryOpen, setGlossaryOpen] = useState(false);

    const { openTopic: showTopic } = useCourseNav(FOUNDATIONS_COURSE);
    const openTopic = (topicId: string) => {
        changeMode('learn');
        showTopic(topicId);
    };

    // One lesson on its own page, opened from the path.
    const renderTopic = (topicId: string) => {
        const phase = foundationPhases[phaseIndexOf(topicId)];
        const index = phase.topics.findIndex(topic => topic.id === topicId);
        const topic = phase.topics[index];
        return (
            <TopicCard
                topic={topic}
                number={index + 1}
                accent={phase.accent}
                progress={progress}
                expanded
                onExpand={() => {}}
                onToggleCheck={check => { void toggleCheck(topic.id, check); }}
            />
        );
    };

    const confident = confidentCount(progress, allFoundationTopics);
    const checksDone = allFoundationTopics.reduce((sum, topic) => sum + checksPassed(progress, topic.id), 0);
    const builds = buildsDone(progress, foundationPhases);

    return (
        <LearningPageFrame t={t} theme={theme}>
            <GlossaryProvider source={foundationsGlossary} openTopic={openTopic}>
                <Box sx={{ width: '100%', maxWidth: 940, mx: 'auto' }}>
                    {/* ---- HEADER ---- */}
                    <Box sx={{ mb: 4 }}>
                        <Stack
                            direction={{ xs: 'column', sm: 'row' }}
                            justifyContent="space-between"
                            alignItems={{ xs: 'flex-start', sm: 'center' }}
                            spacing={2}
                            sx={{ pb: 3, mb: 4, borderBottom: 1, borderColor: 'rgba(255,255,255,0.1)' }}
                        >
                            <Box>
                                <Typography variant="caption" color="text.secondary" fontWeight="bold" sx={{ letterSpacing: 1.5, display: 'block', mb: 0.5 }}>
                                    ML FOUNDATIONS
                                </Typography>
                                <Typography variant="body1" fontWeight="medium" color="text.primary">
                                    Self-paced · {foundationPhases.length} units · {allFoundationTopics.length} lessons · in order
                                </Typography>
                            </Box>
                            <Stack direction="row" spacing={1.5} alignItems="flex-end" flexWrap="wrap" useFlexGap>
                                <TextSizeControl value={textSize} onChange={changeTextSize} />
                                <Button
                                    variant="outlined"
                                    startIcon={<MenuBookRoundedIcon />}
                                    onClick={() => setGlossaryOpen(true)}
                                    aria-haspopup="dialog"
                                    sx={{ minHeight: TAP, px: 2, textTransform: 'none', fontWeight: 700, color: 'text.primary', borderColor: 'rgba(255,255,255,0.2)' }}
                                >
                                    Glossary
                                </Button>
                            </Stack>
                        </Stack>
                        <GlossaryDrawer open={glossaryOpen} onClose={() => setGlossaryOpen(false)} onOpenTopic={openTopic} />
                        <Typography
                            variant="h2"
                            fontWeight="bold"
                            sx={{ color: 'text.primary', mb: 1, fontSize: { xs: `${2 * t.heading}rem`, sm: `${3 * t.heading}rem` } }}
                        >
                            Learn it, practise it, prove it
                        </Typography>
                        <Typography variant="body1" color="text.secondary">
                            AI and ML from scratch. Every topic is a full lesson: an animation, the idea step by step, a worked example and exercises with answers. Videos and readings are optional extras.
                        </Typography>
                        <ToggleButtonGroup
                            exclusive
                            value={mode}
                            onChange={(_, value: Mode | null) => changeMode(value)}
                            aria-label="Mode"
                            sx={{ mt: 2.5 }}
                        >
                            {MODES.map(value => (
                                <ToggleButton
                                    key={value}
                                    value={value}
                                    sx={{ minHeight: TAP, px: 3, textTransform: 'none', fontWeight: 700, '&:focus': { outline: 'none' } }}
                                >
                                    {value === 'learn' ? 'Learn' : 'Interview questions'}
                                </ToggleButton>
                            ))}
                        </ToggleButtonGroup>
                    </Box>

                    {mode === 'interview' ? (
                        <InterviewQuestionsView
                            sets={INTERVIEW_SETS}
                            glossary={foundationsGlossary}
                            accent={INTERVIEW_ACCENT}
                            topicName={topicName}
                            openTopic={openTopic}
                        />
                    ) : (
                        <>

                        <PathLearn
                            course={FOUNDATIONS_COURSE}
                            doc={progress}
                            intro={<>
                        {/* ---- STATS ---- */}
                        {tracking && (
                        <Stack direction="row" spacing={4} sx={{ mb: 3 }} flexWrap="wrap" useFlexGap>
                            {[
                                { value: confident, total: allFoundationTopics.length, label: 'TOPICS CONFIDENT', color: CONFIDENT },
                                { value: checksDone, total: allFoundationTopics.length * CHECK_KEYS.length, label: 'CHECKS PASSED', color: CYAN },
                                { value: builds, total: allMiniBuilds.length, label: 'MINI-BUILDS', color: 'text.primary' },
                            ].map(stat => (
                                <Box key={stat.label}>
                                    <Typography variant="h3" fontWeight="bold" sx={{ color: stat.color, lineHeight: 1 }}>
                                        {stat.value}
                                        <Typography component="span" variant="h5" color="text.secondary"> / {stat.total}</Typography>
                                    </Typography>
                                    <Typography variant="caption" color="text.secondary" sx={{ letterSpacing: 1.2, fontWeight: 700 }}>
                                        {stat.label}
                                    </Typography>
                                </Box>
                            ))}
                        </Stack>
                        )}

                        {/* ---- HOW TO LEARN A TOPIC ---- said once, and closed once read */}
                        <Box sx={{ mb: 3 }}>
                            <ReferencePanel title="How to learn a topic (read once)" tint="rgba(77,208,225,0.07)" border="rgba(77,208,225,0.25)">
                                <Typography variant="body1" sx={{ color: 'text.primary' }}>
                                    {CONFIDENT_RULE}
                                </Typography>
                                <Stack spacing={1.25} sx={{ mt: 2.5 }}>
                                    {topicLoop.map((step, index) => (
                                        <Stack key={step.step} direction={{ xs: 'column', sm: 'row' }} spacing={{ xs: 0.25, sm: 1.5 }} alignItems="baseline">
                                            <Typography variant="caption" sx={{ color: CYAN, fontWeight: 800, letterSpacing: 0.8, minWidth: 110, flexShrink: 0 }}>
                                                STEP {index + 1} · {step.step}
                                            </Typography>
                                            <Typography variant="body2" color="text.secondary">
                                                {step.detail}
                                            </Typography>
                                        </Stack>
                                    ))}
                                </Stack>
                                <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr' }, gap: 1.5, mt: 3 }}>
                                    {CHECK_KEYS.map((key, index) => (
                                        <Box key={key} sx={{ p: 1.5, borderRadius: 2, bgcolor: 'rgba(0,0,0,0.2)' }}>
                                            <Typography variant="body2" fontWeight={800} color="text.primary">
                                                {index + 1}. {CHECK_LABELS[key]}
                                            </Typography>
                                            <Typography variant="body2" color="text.secondary" sx={{ mt: 0.25 }}>
                                                {CHECK_MEANINGS[key]}
                                            </Typography>
                                            <Typography sx={{ mt: 0.75, fontSize: px(t.small), color: CYAN }}>
                                                e.g. {CHECK_EXAMPLES[key]}
                                            </Typography>
                                        </Box>
                                    ))}
                                </Box>
                            </ReferencePanel>
                        </Box>

                            </>}
                            renderTopic={renderTopic}
                            renderUnit={unitId => {
                                const phase = foundationPhases.find(p => p.id === unitId) ?? foundationPhases[0];
                                const phaseConfident = confidentCount(progress, phase.topics);
                                return (
                            <Box sx={{ pb: 6 }}>
                                {/* Title and goal */}
                                <Typography variant="caption" sx={{ color: phase.accent, fontWeight: 800, letterSpacing: 1.2 }}>
                                    UNIT {phase.number}
                                </Typography>
                                <Typography variant="h4" fontWeight="bold" color="text.primary" sx={{ mt: 0.5, mb: 1 }}>
                                    {phase.title}
                                </Typography>
                                <Typography variant="body1" color="text.secondary" sx={{ maxWidth: 760 }}>
                                    {phase.goal}
                                </Typography>

                                {tracking && (
                                <Stack direction="row" spacing={2} alignItems="center" sx={{ mt: 2.5, maxWidth: 760 }}>
                                    <LinearProgress
                                        variant="determinate"
                                        value={(phaseConfident / phase.topics.length) * 100}
                                        sx={{ flex: 1, height: 4, borderRadius: 2, bgcolor: 'rgba(255,255,255,0.06)', '& .MuiLinearProgress-bar': { bgcolor: CONFIDENT } }}
                                    />
                                    <Typography color="text.secondary" sx={{ whiteSpace: 'nowrap', fontSize: px(t.small) }}>
                                        {phaseConfident} of {phase.topics.length} confident
                                    </Typography>
                                </Stack>
                                )}

                                {/* Big picture */}
                                <Box sx={{ mt: 3, p: 2, borderRadius: 2, maxWidth: 760, bgcolor: `${phase.accent}14`, borderLeft: '3px solid', borderColor: phase.accent }}>
                                    <Typography variant="body1">
                                        <strong style={{ color: phase.accent }}>The big picture.</strong> {phase.bigPicture}
                                    </Typography>
                                </Box>

                                {/* Mini-builds */}
                                <SectionLabel>MINI-BUILDS</SectionLabel>
                                <Stack spacing={1}>
                                    {phase.builds.map(build => {
                                        const done = progress.builds[build.id] === true;
                                        return (
                                            <Stack
                                                key={build.id}
                                                component="label"
                                                direction="row"
                                                spacing={1}
                                                alignItems="flex-start"
                                                sx={{
                                                    p: 1.25, minHeight: TAP, borderRadius: 2, cursor: 'pointer',
                                                    border: '1px solid',
                                                    borderColor: done ? 'rgba(102,187,106,0.35)' : 'rgba(255,255,255,0.08)',
                                                    bgcolor: done ? 'rgba(102,187,106,0.06)' : 'transparent',
                                                }}
                                            >
                                                <Checkbox
                                                    checked={done}
                                                    onChange={() => { void toggleBuild(build.id); }}
                                                    sx={{ p: 0.25, color: 'text.secondary', '&.Mui-checked': { color: CONFIDENT } }}
                                                />
                                                <Typography variant="body2" sx={{ pt: 0.25 }}>
                                                    {build.text}
                                                </Typography>
                                            </Stack>
                                        );
                                    })}
                                </Stack>

                                {/* Ready questions, answers hidden until asked for */}
                                <SectionLabel>READY WHEN YOU CAN ANSWER</SectionLabel>
                                <Typography color="text.secondary" sx={{ mb: 1.25, fontSize: px(t.small), maxWidth: 760 }}>
                                    Interview-style questions across this phase. Say your answer out loud, then tap to compare.
                                </Typography>
                                <Box sx={{ maxWidth: 760 }}>
                                    <FollowUps
                                        topic={{ id: `ready-${phase.id}`, followUps: phase.ready }}
                                        accent={phase.accent}
                                        marked={() => phase.ready.flatMap(item => [item.q, item.a])}
                                    />
                                </Box>

                                {/* Phase books and courses — reference, not the path */}
                                <Box sx={{ mt: 4 }}>
                                    <ReferencePanel
                                        key={phase.id}
                                        title="Books and courses for this unit (for reference)"
                                        tint="rgba(255,255,255,0.02)"
                                        border="rgba(255,255,255,0.08)"
                                    >
                                        <Typography variant="body2" color="text.secondary" sx={{ mb: 1.5, maxWidth: 760 }}>
                                            The main courses and books for this whole phase. Each topic above already lists its own exact chapters and videos.
                                        </Typography>
                                        <SectionLabel>MAIN RESOURCES FOR THIS UNIT</SectionLabel>
                                        <Stack spacing={1.5}>
                                            {phase.main.map(resource => <PhaseResource key={resource.title} resource={resource} accent={phase.accent} />)}
                                        </Stack>
                                        {phase.deeper.length > 0 && (
                                            <>
                                                <SectionLabel>GO DEEPER (OPTIONAL)</SectionLabel>
                                                <Stack spacing={1.5}>
                                                    {phase.deeper.map(resource => <PhaseResource key={resource.title} resource={resource} accent="rgba(255,255,255,0.15)" />)}
                                                </Stack>
                                            </>
                                        )}
                                    </ReferencePanel>
                                </Box>

                                {/* Rules */}
                                <SectionLabel>RULES</SectionLabel>
                                <Stack component="ol" spacing={0.75} sx={{ pl: 2.5, m: 0, maxWidth: 760 }}>
                                    {foundationRules.map(rule => (
                                        <Typography key={rule} component="li" variant="body2" color="text.secondary">
                                            {rule}
                                        </Typography>
                                    ))}
                                </Stack>
                            </Box>
                                );
                            }}
                        />
                        </>
                    )}
                </Box>
            </GlossaryProvider>
        </LearningPageFrame>
    );
};

export default FoundationsPage;
