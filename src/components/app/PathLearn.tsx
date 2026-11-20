// Learn mode on a course page. The address decides what shows:
//   /sql               the path of every topic, unit by unit
//   /sql?topic=<id>    one lesson, full page, with Back to path and Next
//   /sql?unit=<id>     a unit's guide: its big picture and extra practice
// So the browser's Back button works, and any lesson can be linked to.

import { useEffect, useState, type ReactNode } from 'react';
import { useLocation, useSearchParams } from 'react-router-dom';
import { Box, Button, ButtonBase, InputAdornment, Stack, TextField, Typography } from '@mui/material';
import ArrowBackRoundedIcon from '@mui/icons-material/ArrowBackRounded';
import ArrowForwardRoundedIcon from '@mui/icons-material/ArrowForwardRounded';
import SearchRoundedIcon from '@mui/icons-material/SearchRounded';
import { allTopicsOf, unitOf, type CourseInfo } from '../../game/courses';
import { checksPassedIn, type ChecksDoc } from '../../game/xp';
import { useCourseNav } from '../../game/useCourseNav';
import CoursePath from './CoursePath';
import GuestNote from './GuestNote';

const PathLearn = ({
    course,
    doc,
    intro,
    renderTopic,
    renderUnit,
}: {
    course: CourseInfo;
    doc: ChecksDoc | undefined;
    /** Shown above the path only (stats, how to study). */
    intro?: ReactNode;
    renderTopic: (topicId: string) => ReactNode;
    renderUnit: (unitId: string) => ReactNode;
}) => {
    const [params] = useSearchParams();
    const location = useLocation();
    const { openTopic, openUnit, backToPath } = useCourseNav(course);
    const [query, setQuery] = useState('');

    const topics = allTopicsOf(course);
    const topicId = params.get('topic');
    const topicIndex = topicId ? topics.findIndex(topic => topic.id === topicId) : -1;
    const unitId = params.get('unit');
    const unit = unitId ? course.units.find(u => u.id === unitId) : undefined;
    const from = (location.state as { from?: string } | null)?.from;

    // A lesson or a guide starts at its top.
    useEffect(() => {
        if (topicIndex >= 0 || unit) window.scrollTo(0, 0);
    }, [topicIndex, unit]);

    if (topicIndex >= 0) {
        const topic = topics[topicIndex];
        const topicUnit = unitOf(course, topic.id);
        const previous = topics[topicIndex - 1];
        const next = topics[topicIndex + 1];
        return (
            <Box>
                <Stack direction="row" justifyContent="space-between" alignItems="center" spacing={2} sx={{ mb: 2 }}>
                    <Button startIcon={<ArrowBackRoundedIcon />} onClick={() => backToPath(topic.id)} sx={{ fontWeight: 800, minHeight: 44, ml: -1 }}>
                        Back to path
                    </Button>
                    {topicUnit && (
                        <Typography variant="body2" color="text.secondary" sx={{ textAlign: 'right' }}>
                            Unit {topicUnit.number} · topic {topicUnit.topics.findIndex(t => t.id === topic.id) + 1} of {topicUnit.topics.length}
                        </Typography>
                    )}
                </Stack>
                {renderTopic(topic.id)}
                <Stack direction={{ xs: 'column-reverse', sm: 'row' }} justifyContent="space-between" spacing={1.5} sx={{ mt: 4, pb: 4 }}>
                    {previous ? (
                        <Button variant="outlined" startIcon={<ArrowBackRoundedIcon />} onClick={() => openTopic(previous.id)} sx={{ minHeight: 48, justifyContent: 'flex-start', textAlign: 'left' }}>
                            {previous.name}
                        </Button>
                    ) : <Box />}
                    {next && (
                        <Button variant="contained" endIcon={<ArrowForwardRoundedIcon />} onClick={() => openTopic(next.id)} sx={{ minHeight: 48, fontWeight: 800, justifyContent: 'flex-end', textAlign: 'right' }}>
                            Next: {next.name}
                        </Button>
                    )}
                </Stack>
            </Box>
        );
    }

    if (unit) {
        return (
            <Box>
                <Button startIcon={<ArrowBackRoundedIcon />} onClick={() => backToPath(unit.topics[0]?.id)} sx={{ fontWeight: 800, minHeight: 44, ml: -1, mb: 2 }}>
                    Back to path
                </Button>
                {renderUnit(unit.id)}
            </Box>
        );
    }

    const searching = query.trim() !== '';
    const words = query.trim().toLowerCase().split(/\s+/);
    const found = searching
        ? topics.filter(topic => words.every(word => `${topic.name} ${topic.definition}`.toLowerCase().includes(word)))
        : [];

    return (
        <Box>
            {intro}
            <GuestNote compact />
            <TextField
                type="search"
                value={query}
                onChange={event => setQuery(event.target.value)}
                placeholder="Search topics"
                sx={{ width: { xs: '100%', sm: 320 }, mb: 3, '& .MuiInputBase-root': { minHeight: 48 } }}
                slotProps={{
                    htmlInput: { 'aria-label': 'Search topics by name or definition' },
                    input: {
                        startAdornment: (
                            <InputAdornment position="start">
                                <SearchRoundedIcon sx={{ color: 'text.secondary' }} />
                            </InputAdornment>
                        ),
                    },
                }}
            />
            {searching ? (
                <Stack spacing={1.25} sx={{ pb: 6 }}>
                    <Typography variant="body2" color="text.secondary">
                        {found.length === 0 ? `No topics match "${query.trim()}".` : `${found.length} ${found.length === 1 ? 'topic matches' : 'topics match'}.`}
                    </Typography>
                    {found.map(topic => (
                        <ButtonBase
                            key={topic.id}
                            onClick={() => openTopic(topic.id)}
                            sx={{ display: 'block', textAlign: 'left', p: 2, borderRadius: 2, border: '1px solid rgba(255,255,255,0.1)', '&:hover': { bgcolor: 'rgba(255,255,255,0.04)' } }}
                        >
                            <Stack direction="row" justifyContent="space-between" spacing={2}>
                                <Typography fontWeight={800}>{topic.name}</Typography>
                                <Typography variant="body2" color="text.secondary" sx={{ whiteSpace: 'nowrap' }}>
                                    {checksPassedIn(doc, topic.id)}/4
                                </Typography>
                            </Stack>
                            <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>{topic.definition}</Typography>
                        </ButtonBase>
                    ))}
                </Stack>
            ) : (
                <Box sx={{ maxWidth: 560, mx: 'auto', pb: 4 }}>
                    <CoursePath course={course} doc={doc} onOpenTopic={openTopic} onOpenUnit={openUnit} focusTopicId={from} />
                </Box>
            )}
        </Box>
    );
};

export default PathLearn;
