import { useState, type ReactNode } from 'react';
import { Link as RouterLink } from 'react-router-dom';
import { Button, Chip, Stack, Typography } from '@mui/material';
import ArrowForwardRoundedIcon from '@mui/icons-material/ArrowForwardRounded';
import { TAP } from '../learning/learning';
import { topicPath } from '../../game/addresses';
import { LAB_PATH, labMissionPath } from '../../game/labAddresses';
import { MISSIONS, type Mission } from '../../data/systemDesignLab/missions';
import { ACCENT, ACCENT_HOVER, LESSON_NAMES, SD } from './labStyle';

// Small pieces the Lab's pages share.

export const Heading = ({ children }: { children: ReactNode }) => (
    <Typography variant="caption" sx={{ display: 'block', color: ACCENT, fontWeight: 800, letterSpacing: 1.2, mb: 1.25 }}>
        {children}
    </Typography>
);

export const LessonChips = ({ ids }: { ids: string[] }) => (
    <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
        {ids.map(id => (
            <Chip
                key={id}
                component={RouterLink}
                to={topicPath(SD, id)}
                clickable
                label={LESSON_NAMES.get(id) ?? id}
                sx={{ fontWeight: 700, bgcolor: 'rgba(179,157,219,0.12)', color: 'text.primary', height: 'auto', minHeight: 32, '& .MuiChip-label': { whiteSpace: 'normal', py: 0.5 } }}
            />
        ))}
    </Stack>
);

/** A button that shows its text once pressed: for help a learner should ask for. */
export const Reveal = ({ label, text }: { label: string; text: string }) => {
    const [open, setOpen] = useState(false);
    return open ? (
        <Typography variant="body1" sx={{ mt: 1.5, color: 'text.primary', p: 1.5, borderRadius: 2, bgcolor: 'rgba(255,255,255,0.04)' }}>{text}</Typography>
    ) : (
        <Button onClick={() => setOpen(true)} sx={{ mt: 1, minHeight: TAP, px: 1 }}>{label}</Button>
    );
};

export const NextMission = ({ after }: { after: Mission }) => {
    const next = MISSIONS[MISSIONS.indexOf(after) + 1];
    return (
        <Stack direction="row" spacing={1.5} sx={{ mt: 2.5 }} flexWrap="wrap" useFlexGap>
            {next ? (
                <Button component={RouterLink} to={labMissionPath(next.id)} variant="contained" endIcon={<ArrowForwardRoundedIcon />} sx={{ minHeight: TAP, fontWeight: 800, bgcolor: ACCENT, color: '#0b0f14', '&:hover': { bgcolor: ACCENT_HOVER } }}>
                    {`Next: ${next.title}`}
                </Button>
            ) : (
                <Typography sx={{ color: 'text.primary', fontWeight: 700 }}>That was the last mission. You have designed, broken and fixed nine systems.</Typography>
            )}
            <Button component={RouterLink} to={LAB_PATH} sx={{ minHeight: TAP }}>All missions</Button>
        </Stack>
    );
};
