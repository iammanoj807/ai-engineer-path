// Opens a practice session. The session and the course's lessons load only
// when practice starts, so the pages that offer it stay small.

import { lazy, Suspense } from 'react';
import { CircularProgress, Dialog, Stack, Typography } from '@mui/material';
import type { Course } from '../../services/progress';
import Mascot from './Mascot';

const PracticeSession = lazy(() => import('./PracticeSession'));

const Waiting = ({ onClose }: { onClose: () => void }) => (
    <Dialog open onClose={onClose} maxWidth="xs" fullWidth slotProps={{ paper: { sx: { bgcolor: '#0f131b', backgroundImage: 'none', borderRadius: 3 } } }}>
        <Stack alignItems="center" spacing={2} sx={{ p: 5, textAlign: 'center' }}>
            <Mascot mood="think" size={110} />
            <Typography sx={{ fontWeight: 800, fontSize: '1.2rem' }}>Getting your practice ready…</Typography>
            <CircularProgress size={26} />
        </Stack>
    </Dialog>
);

const PracticeDialog = ({ course, topicId, onClose }: { course: Course; topicId: string; onClose: () => void }) => (
    <Suspense fallback={<Waiting onClose={onClose} />}>
        <PracticeSession course={course} topicId={topicId} onClose={onClose} />
    </Suspense>
);

export default PracticeDialog;
