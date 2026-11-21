// Opens a practice session. The session and the course's lessons load only
// when practice starts, so the pages that offer it stay small.

import { lazy, Suspense } from 'react';
import { CircularProgress, Dialog, Stack, Typography } from '@mui/material';
import type { Course } from '../../services/progress';
import Mascot from './Mascot';
import { guideFor, type Guide } from './guides';
import type { DueLesson } from '../../game/review';

const PracticeSession = lazy(() => import('./PracticeSession'));

const Waiting = ({ guide, onClose }: { guide: Guide; onClose: () => void }) => (
    <Dialog open onClose={onClose} maxWidth="xs" fullWidth slotProps={{ paper: { sx: { bgcolor: '#0f131b', backgroundImage: 'none', borderRadius: 3 } } }}>
        <Stack alignItems="center" spacing={2} sx={{ p: 5, textAlign: 'center' }}>
            <Mascot mood="think" size={110} who={guide} />
            <Typography sx={{ fontWeight: 800, fontSize: '1.2rem' }}>Getting your practice ready…</Typography>
            <CircularProgress size={26} />
        </Stack>
    </Dialog>
);

/**
 * A lesson's quick practice; or, with `learn`, the whole lesson step by step
 * with a question after each part; or a review of due lessons (`review`).
 */
const PracticeDialog = ({ course, topicId, onClose, learn, review }: { course: Course; topicId: string; onClose: () => void; learn?: boolean; review?: DueLesson[] }) => (
    <Suspense fallback={<Waiting guide={guideFor(topicId)} onClose={onClose} />}>
        <PracticeSession course={course} topicId={topicId} onClose={onClose} learn={learn} review={review} />
    </Suspense>
);

export default PracticeDialog;
