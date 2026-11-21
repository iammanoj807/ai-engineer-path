// The lesson, for reference, without leaving practice: every part of it (the
// idea, how it works, the example, what to remember, the mistakes), and a link
// to the full lesson page, which opens in a new tab so the practice stays open.

import { Box, Button, Drawer, IconButton, Stack, Typography } from '@mui/material';
import CloseRoundedIcon from '@mui/icons-material/CloseRounded';
import OpenInNewRoundedIcon from '@mui/icons-material/OpenInNewRounded';
import type { AnyTopic } from '../../practice/build';
import { lessonOutline } from '../../practice/lesson';
import { ProseText } from '../learning/GlossaryText';
import type { Prose } from '../learning/glossaryContext';
import { LessonPartBody } from './LessonPart';
import { PANEL } from './style';

const LessonNotes = ({
    topic,
    lessonUrl,
    accent,
    prose,
    open,
    onClose,
}: {
    topic: AnyTopic;
    lessonUrl: string;
    accent: string;
    prose: (text: string) => Prose;
    open: boolean;
    onClose: () => void;
}) => (
    <Drawer
        anchor="right"
        open={open}
        onClose={onClose}
        // Above the practice dialog it is opened from.
        sx={{ zIndex: theme => theme.zIndex.modal + 1 }}
        slotProps={{ paper: { sx: { width: { xs: '100%', sm: 480 }, bgcolor: PANEL, backgroundImage: 'none' } } }}
    >
        <Stack direction="row" alignItems="center" spacing={1} sx={{ px: 2, py: 1.25, borderBottom: '1px solid rgba(255,255,255,0.08)', position: 'sticky', top: 0, bgcolor: PANEL, zIndex: 1 }}>
            <Typography sx={{ flex: 1, fontWeight: 800, color: accent, letterSpacing: 1, fontSize: '0.8rem' }}>LESSON NOTES</Typography>
            <IconButton onClick={onClose} aria-label="Close the lesson notes">
                <CloseRoundedIcon />
            </IconButton>
        </Stack>
        <Box sx={{ px: { xs: 2, sm: 3 }, py: 2.5 }}>
            <Typography component="h2" sx={{ fontWeight: 800, fontSize: '1.35rem', color: '#fff', mb: 1 }}>
                {topic.name}
            </Typography>
            <Typography sx={{ color: 'text.secondary', lineHeight: 1.6, mb: 2 }}>
                <ProseText value={prose(topic.definition)} />
            </Typography>
            <Button
                href={lessonUrl}
                target="_blank"
                rel="noopener"
                variant="outlined"
                endIcon={<OpenInNewRoundedIcon />}
                sx={{ mb: 3, fontWeight: 700, minHeight: 44, color: 'text.primary', borderColor: 'rgba(255,255,255,0.25)' }}
            >
                Open the full lesson page
            </Button>
            <Stack spacing={3.5}>
                {lessonOutline(topic).map(part => (
                    <Box key={part.title}>
                        <Typography sx={{ fontWeight: 800, color: accent, mb: 1.25 }}>{part.title}</Typography>
                        <LessonPartBody part={part} prose={prose} accent={accent} />
                    </Box>
                ))}
            </Stack>
            <Typography variant="body2" color="text.secondary" sx={{ mt: 3.5 }}>
                The full lesson page also has the animation, a diagram, four deeper exercises with answers, and interview questions.
            </Typography>
        </Box>
    </Drawer>
);

export default LessonNotes;
