import { Link as RouterLink, useLocation } from 'react-router-dom';
import { Box, Link, Stack, Typography } from '@mui/material';
import CheckCircleRoundedIcon from '@mui/icons-material/CheckCircleRounded';
import ScienceRoundedIcon from '@mui/icons-material/ScienceRounded';
import { CONFIDENT, px, useTextSize, useTextSizeChoice } from '../learning/learning';
import { LearningPageFrame, TextSizeControl } from '../learning/LearningParts';
import { coursePath } from '../../game/addresses';
import { LAB_PATH, labMissionPath } from '../../game/labAddresses';
import {
    CACHE_HIT,
    COST,
    DB_MS,
    DB_WORKERS,
    SERVER_SIZES,
    SERVICE_MS,
    TIMEOUT_MS,
    formatCost,
    formatCount,
    formatMs,
    queue,
} from '../../data/systemDesignLab/model';
import { MISSIONS, type Mission } from '../../data/systemDesignLab/missions';
import { MissionView } from './LabMission';
import { Heading } from './labParts';
import { ACCENT, CARD, LESSON_NAMES, SD } from './labStyle';
import { useLabProgress } from './labProgress';

// The System Design Lab: build a system, run a day of traffic through it,
// and see where it breaks. Each mission teaches the one idea it needs and
// links to the lessons that go deeper; the mission makes you use the idea,
// and the model shows the consequence in numbers.

// ============ THE LIST OF MISSIONS ============

const HOW = [
    ['Learn the idea', 'Each mission explains the one idea it needs, in plain words, and links to the full lessons.'],
    ['Build the system', 'Add servers, a cache, replicas, a queue… Every part says what it does and what it costs.'],
    ['Run a whole day', 'Watch 24 hours of traffic go through it, with a crash or a spike on the way, and see the hour it breaks.'],
    ['Fix what broke', 'The Lab tells you which part broke, why, and what to try next. Change it and run again.'],
] as const;

const Overview = ({ done }: { done: string[] }) => {
    const t = useTextSize();
    return (
        <Box>
            <Typography component="h1" sx={{ fontWeight: 800, color: 'text.primary', fontSize: { xs: `${2 * t.heading}rem`, sm: `${3 * t.heading}rem` }, lineHeight: 1.1, mb: 1 }}>
                Build it. Break it. Fix it.
            </Typography>
            <Typography variant="body1" sx={{ color: 'text.secondary', maxWidth: 760, mb: 3 }}>
                Reading about load balancers is not the same as watching one save you at 8 pm. In the Lab you design a system, send a day of real-looking traffic through it, and see exactly where and why it breaks. No lessons needed to start: each mission explains what you need.
            </Typography>

            <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: 'repeat(2, 1fr)', md: 'repeat(4, 1fr)' }, gap: 1.5, mb: 4 }}>
                {HOW.map(([title, text], i) => (
                    <Box key={title} sx={{ ...CARD, p: 2 }}>
                        <Typography sx={{ color: ACCENT, fontWeight: 800, fontSize: px(t.small) }}>{`${i + 1}`}</Typography>
                        <Typography sx={{ color: 'text.primary', fontWeight: 800, mb: 0.5 }}>{title}</Typography>
                        <Typography sx={{ color: 'text.secondary', fontSize: px(t.small), lineHeight: 1.5 }}>{text}</Typography>
                    </Box>
                ))}
            </Box>

            <Heading>{`THE MISSIONS · ${done.filter(id => MISSIONS.some(m => m.id === id)).length} OF ${MISSIONS.length} COMPLETE`}</Heading>
            <Stack spacing={1.5} sx={{ mb: 4 }}>
                {MISSIONS.map((mission, i) => {
                    const complete = done.includes(mission.id);
                    return (
                        <Box
                            key={mission.id}
                            component={RouterLink}
                            to={labMissionPath(mission.id)}
                            sx={{
                                ...CARD,
                                display: 'flex',
                                gap: 2,
                                alignItems: 'flex-start',
                                textDecoration: 'none',
                                color: 'inherit',
                                transition: 'border-color 150ms',
                                '&:hover': { borderColor: `${ACCENT}88` },
                                '&:focus-visible': { outline: `2px solid ${ACCENT}`, outlineOffset: 2 },
                            }}
                        >
                            <Box sx={{ flexShrink: 0, width: 40, height: 40, borderRadius: '50%', display: 'grid', placeItems: 'center', bgcolor: complete ? `${CONFIDENT}26` : 'rgba(179,157,219,0.14)', color: complete ? CONFIDENT : ACCENT, fontWeight: 800 }}>
                                {complete ? <CheckCircleRoundedIcon aria-label="complete" /> : i + 1}
                            </Box>
                            <Box sx={{ minWidth: 0 }}>
                                <Typography sx={{ color: 'text.primary', fontWeight: 800, fontSize: px(t.body1) }}>{mission.title}</Typography>
                                <Typography sx={{ color: 'text.secondary', fontSize: px(t.small), mt: 0.25 }}>{mission.story.split(/(?<=\.) /)[0]}</Typography>
                                <Typography sx={{ color: 'text.secondary', fontSize: px(t.label), mt: 0.75 }}>
                                    {`Uses: ${mission.lessons.map(id => LESSON_NAMES.get(id) ?? id).join(' · ')}`}
                                </Typography>
                            </Box>
                        </Box>
                    );
                })}
            </Stack>

            <HowTheNumbers />
        </Box>
    );
};

/** The model in plain words, for anyone who wants to check the Lab's numbers. */
const HowTheNumbers = () => {
    const t = useTextSize();
    const small = (SERVER_SIZES.small.workers * 1000) / SERVICE_MS;
    const db = (DB_WORKERS * 1000) / DB_MS;
    const points = [
        `A small server works on ${SERVER_SIZES.small.workers} requests at once, ${SERVICE_MS} ms each, so it handles about ${formatCount(small)} a second (large: ${formatCount(small * 4)}, extra large: ${formatCount(small * 16)}). A database node handles about ${formatCount(db)} queries a second.`,
        `When all the workers are busy, requests wait in line. How long is worked out with queueing theory (Erlang C, for a place with several workers), so the wait stays tiny at half load, then climbs very steeply near 100%: at 90% busy a small server adds about ${formatMs(queue(small * 0.9, SERVER_SIZES.small.workers, SERVICE_MS).waitP95Ms)} at the slow end, at 99% about ${formatMs(queue(small * 0.99, SERVER_SIZES.small.workers, SERVICE_MS).waitP95Ms)}.`,
        `Above 100% busy, the extra requests fail, and the rest wait until they give up after ${formatMs(TIMEOUT_MS)}.`,
        'Response time is shown as p95: the time 95 requests in 100 beat. It adds the network, the time at the server, the wait in line, and the database when more than 1 request in 20 reaches it.',
        `A cache answers a share of the reads (small ${Math.round(CACHE_HIT.small * 100)}%, medium ${Math.round(CACHE_HIT.medium * 100)}%, large ${Math.round(CACHE_HIT.large * 100)}%). A read replica takes a share of the reads but applies every write. A shard takes its share of both.`,
        `Prices are round, made-up numbers in realistic proportion: a small server ${formatCost(SERVER_SIZES.small.cost)} a month, a database node ${formatCost(COST.dbNode)}.`,
    ];
    return (
        <Box sx={{ ...CARD }}>
            <Heading>HOW THE LAB WORKS OUT THE NUMBERS</Heading>
            <Typography variant="body1" sx={{ color: 'text.primary', mb: 1.5 }}>
                It is a model, not a benchmark: the sizes are round so you can check them with napkin maths. What it gets right is how systems behave as they fill up, which is what interviews ask about.
            </Typography>
            <Stack component="ul" spacing={0.75} sx={{ m: 0, pl: 2.5 }}>
                {points.map(point => (
                    <Typography component="li" key={point} sx={{ color: 'text.secondary', fontSize: px(t.body2) }}>{point}</Typography>
                ))}
            </Stack>
        </Box>
    );
};

// ============ THE PAGE ============

/** The mission an address names, or none for the list. */
const missionFromPath = (pathname: string): Mission | undefined => {
    const rest = pathname.slice(LAB_PATH.length).split('/').filter(Boolean);
    return rest.length === 1 ? MISSIONS.find(m => m.id === rest[0]) : undefined;
};

const LabPage = () => {
    const { pathname } = useLocation();
    const { textSize, t, theme, changeTextSize } = useTextSizeChoice();
    const { done, markDone } = useLabProgress();
    const mission = missionFromPath(pathname);
    return (
        <LearningPageFrame t={t} theme={theme}>
            <Box sx={{ width: '100%', maxWidth: 1180, mx: 'auto', minWidth: 0 }}>
                <Stack direction={{ xs: 'column', sm: 'row' }} justifyContent="space-between" alignItems={{ xs: 'flex-start', sm: 'center' }} spacing={2} sx={{ pb: 2.5, mb: 3, borderBottom: 1, borderColor: 'rgba(255,255,255,0.1)' }}>
                    <Box>
                        <Stack direction="row" spacing={1} alignItems="center">
                            <ScienceRoundedIcon sx={{ color: ACCENT, fontSize: 20 }} />
                            <Typography variant="caption" color="text.secondary" fontWeight="bold" sx={{ letterSpacing: 1.5 }}>
                                SYSTEM DESIGN LAB
                            </Typography>
                        </Stack>
                        <Typography variant="body1" color="text.primary" sx={{ mt: 0.5 }}>
                            {`${MISSIONS.length} missions · part of the free `}
                            <Link component={RouterLink} to={coursePath(SD)} color="inherit">System Design course</Link>
                        </Typography>
                    </Box>
                    <TextSizeControl value={textSize} onChange={changeTextSize} />
                </Stack>
                {mission ? (
                    <MissionView key={mission.id} mission={mission} number={MISSIONS.indexOf(mission) + 1} done={done.includes(mission.id)} onDone={markDone} />
                ) : (
                    <Overview done={done} />
                )}
            </Box>
        </LearningPageFrame>
    );
};

export default LabPage;
