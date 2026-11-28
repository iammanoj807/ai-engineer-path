import { Link as RouterLink } from 'react-router-dom';
import { Box, Button, Stack, Typography } from '@mui/material';
import ScienceRoundedIcon from '@mui/icons-material/ScienceRounded';
import ArrowForwardRoundedIcon from '@mui/icons-material/ArrowForwardRounded';
import { TAP, px, useTextSize } from '../learning/learning';
import { LAB_PATH, labMissionPath } from '../../game/labAddresses';
import { MISSIONS } from '../../data/systemDesignLab/missions';

// Ways into the Lab from the System Design course: a button by the course's
// modes, and, in a lesson's practice step, the missions that use that lesson.
// They come after the teaching, so the lesson is read before the mission asks
// for it.

const ACCENT = '#b39ddb';

export const LabButton = () => (
    <Button
        component={RouterLink}
        to={LAB_PATH}
        variant="outlined"
        startIcon={<ScienceRoundedIcon />}
        sx={{ minHeight: TAP, px: 2, textTransform: 'none', fontWeight: 700, color: 'text.primary', borderColor: 'rgba(255,255,255,0.2)' }}
    >
        Lab
    </Button>
);

/** The Lab missions that use this lesson, or nothing. */
export const LessonLabMissions = ({ topicId }: { topicId: string }) => {
    const t = useTextSize();
    const missions = MISSIONS.filter(m => m.lessons.includes(topicId));
    if (missions.length === 0) return null;
    return (
        <Box sx={{ p: 2, borderRadius: 2, border: `1px solid ${ACCENT}55`, bgcolor: `${ACCENT}0f` }}>
            <Stack direction="row" spacing={1} alignItems="center" sx={{ mb: 0.75 }}>
                <ScienceRoundedIcon sx={{ color: ACCENT, fontSize: 20 }} />
                <Typography variant="caption" sx={{ color: ACCENT, fontWeight: 800, letterSpacing: 1 }}>
                    TRY IT IN THE LAB
                </Typography>
            </Stack>
            <Typography sx={{ color: 'text.secondary', fontSize: px(t.small), mb: 1.25 }}>
                Build a system that needs this idea, run a day of traffic through it, and see what happens without it.
            </Typography>
            <Stack spacing={1}>
                {missions.map(m => (
                    <Button
                        key={m.id}
                        component={RouterLink}
                        to={labMissionPath(m.id)}
                        endIcon={<ArrowForwardRoundedIcon />}
                        sx={{ minHeight: TAP, justifyContent: 'space-between', textAlign: 'left', px: 1.5, bgcolor: 'rgba(255,255,255,0.04)', color: 'text.primary', fontWeight: 700, '&:hover': { bgcolor: 'rgba(255,255,255,0.08)' } }}
                    >
                        {`Mission ${MISSIONS.indexOf(m) + 1}: ${m.title}`}
                    </Button>
                ))}
            </Stack>
        </Box>
    );
};
