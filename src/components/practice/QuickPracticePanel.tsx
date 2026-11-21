// The way into a lesson's practice from the lesson page (Step 3), the same in
// every course: the lesson's guide, what the practice holds, and a Start button.

import { useState } from 'react';
import { Box, Button, Stack, Typography } from '@mui/material';
import PlayArrowRoundedIcon from '@mui/icons-material/PlayArrowRounded';
import type { Course } from '../../services/progress';
import { TAP } from '../learning/learning';
import Mascot from './Mascot';
import { GUIDE_NAMES, guideFor } from './guides';
import PracticeDialog from './PracticeDialog';

const QuickPracticePanel = ({ course, topicId, accent }: { course: Course; topicId: string; accent: string }) => {
    const [open, setOpen] = useState(false);
    const guide = guideFor(topicId);
    return (
        <>
            <Stack
                direction="row"
                spacing={2}
                alignItems="center"
                flexWrap="wrap"
                useFlexGap
                sx={{ p: 2, borderRadius: 2.5, border: `1px solid ${accent}55`, background: `linear-gradient(135deg, ${accent}1f, rgba(255,255,255,0.02) 70%)` }}
            >
                <Mascot mood="happy" size={56} who={guide} />
                <Box sx={{ flex: 1, minWidth: 220 }}>
                    <Typography sx={{ fontWeight: 800 }}>Practise with {GUIDE_NAMES[guide]} · about 5 minutes</Typography>
                    <Typography variant="body2" color="text.secondary">
                        The idea and its words first, then quick questions: match the pairs, fill the gap, put the steps in order
                        {course === 'sql' ? ', predict and write queries. Write and Predict are ticked when you prove them.' : '. Every answer is checked at once.'}
                    </Typography>
                </Box>
                <Button
                    variant="contained"
                    onClick={() => setOpen(true)}
                    startIcon={<PlayArrowRoundedIcon />}
                    sx={{ minHeight: TAP, px: 2.5, fontWeight: 800, textTransform: 'none', bgcolor: accent, color: '#0b0f14', '&:hover': { bgcolor: accent, filter: 'brightness(1.1)' } }}
                >
                    Start
                </Button>
            </Stack>
            {open && <PracticeDialog course={course} topicId={topicId} onClose={() => setOpen(false)} />}
        </>
    );
};

export default QuickPracticePanel;
