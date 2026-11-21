// The home page's review: lessons practised before, brought back just as they
// would start to fade (src/game/review.ts). A five-minute mixed review now
// makes them last for weeks. Shown once something has been practised.

import { useState } from 'react';
import { Box, Button, Stack, Typography } from '@mui/material';
import EventRepeatRoundedIcon from '@mui/icons-material/EventRepeatRounded';
import { courseById } from '../../game/courses';
import { localDay } from '../../game/day';
import { reviewsByCourse, LESSONS_PER_REVIEW, type CourseReviews } from '../../game/review';
import type { useGameStats } from '../../game/useProgress';
import PracticeDialog from '../practice/PracticeDialog';
import { primeVoice } from '../practice/voice';
import { CARD } from './CoursePath';

const ACCENT = '#4dd0e1';

/** "tomorrow", "in 3 days". */
const whenIs = (day: string, today: string) => {
    const days = Math.round((Date.parse(`${day}T12:00:00`) - Date.parse(`${today}T12:00:00`)) / 86_400_000);
    return days <= 1 ? 'tomorrow' : `in ${days} days`;
};

const ReviewCard = ({ progress }: { progress: ReturnType<typeof useGameStats>['progress'] }) => {
    const [open, setOpen] = useState<CourseReviews | null>(null);
    const today = localDay();
    const reviews = reviewsByCourse(
        { foundations: progress.foundations?.practice, sql: progress.sql?.practice, system_design: progress.system_design?.practice },
        today,
    );
    if (reviews.length === 0 && !open) return null;

    const due = reviews.filter(r => r.due.length > 0).sort((a, b) => b.due.length - a.due.length);
    const total = due.reduce((n, r) => n + r.due.length, 0);
    const next = reviews
        .map(r => r.next)
        .filter((n): n is { day: string; count: number } => !!n)
        .sort((a, b) => a.day.localeCompare(b.day))[0];

    return (
        <Box sx={{ ...CARD, mb: 4, borderColor: total ? `${ACCENT}66` : undefined, background: total ? `linear-gradient(135deg, ${ACCENT}1a, rgba(21,25,33,1) 55%)` : undefined }}>
            <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2} alignItems={{ xs: 'flex-start', sm: 'center' }}>
                <Box sx={{ width: 48, height: 48, flexShrink: 0, borderRadius: 3, display: 'grid', placeItems: 'center', bgcolor: `${ACCENT}24`, color: ACCENT }}>
                    <EventRepeatRoundedIcon />
                </Box>
                <Box sx={{ flex: 1, minWidth: 0 }}>
                    <Typography variant="caption" sx={{ fontWeight: 800, letterSpacing: 1.2, color: total ? ACCENT : 'text.secondary' }}>
                        REVIEW
                    </Typography>
                    {total > 0 ? (
                        <>
                            <Typography sx={{ fontWeight: 800, fontSize: '1.15rem' }}>
                                Time to review {total} lesson{total === 1 ? '' : 's'}
                            </Typography>
                            <Typography variant="body2" color="text.secondary">
                                About five minutes, with the cards you missed first. Reviewing just before you forget is what makes it stick.
                            </Typography>
                        </>
                    ) : (
                        <>
                            <Typography sx={{ fontWeight: 800, fontSize: '1.05rem' }}>All caught up</Typography>
                            {next && (
                                <Typography variant="body2" color="text.secondary">
                                    Next review {whenIs(next.day, today)}: {next.count} lesson{next.count === 1 ? '' : 's'}.
                                </Typography>
                            )}
                        </>
                    )}
                </Box>
                {total > 0 && (
                    <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1} sx={{ width: { xs: '100%', sm: 'auto' } }}>
                        {due.map(r => {
                            const course = courseById(r.course);
                            return (
                                <Button
                                    key={r.course}
                                    variant="contained"
                                    onClick={() => {
                                        // This tap lets an iPhone play the guides' voices.
                                        primeVoice();
                                        setOpen(r);
                                    }}
                                    sx={{ minHeight: 44, fontWeight: 800, whiteSpace: 'nowrap', bgcolor: course.colour, color: '#0b0f14', '&:hover': { bgcolor: course.colour, filter: 'brightness(1.1)' } }}
                                >
                                    {due.length > 1 ? `${course.title} · ${Math.min(r.due.length, LESSONS_PER_REVIEW)}` : 'Start review'}
                                </Button>
                            );
                        })}
                    </Stack>
                )}
            </Stack>
            {open && <PracticeDialog course={open.course} topicId={open.due[0].topicId} review={open.due} onClose={() => setOpen(null)} />}
        </Box>
    );
};

export default ReviewCard;
