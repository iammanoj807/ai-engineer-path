// One part of a lesson (src/practice/lesson.ts), drawn the same way in "Learn
// it step by step" and in the lesson notes: its text, a quieter note, a list
// (numbered steps, the points to remember, the mistakes) and any code.

import { Box, Stack, Typography } from '@mui/material';
import type { LessonPart } from '../../practice/lesson';
import { CodeBlock, MISTAKE, MUST_KNOW } from '../learning/LearningParts';
import { ProseText } from '../learning/GlossaryText';
import type { Prose } from '../learning/glossaryContext';

const MARKER: Partial<Record<LessonPart['slot'], string>> = { facts: MUST_KNOW, mistakes: MISTAKE };

export const LessonPartBody = ({
    part,
    prose,
    accent,
    shown,
}: {
    part: LessonPart;
    prose: (text: string) => Prose;
    accent: string;
    /** Steps shown so far, when they are revealed one at a time; all when not given. */
    shown?: number;
}) => {
    const items = part.items ?? [];
    const visible = shown === undefined ? items.length : Math.min(shown, items.length);
    const marker = MARKER[part.slot] ?? accent;
    return (
        <Stack spacing={2}>
            {part.text && (
                <Typography sx={{ fontSize: { xs: '1.05rem', sm: '1.1rem' }, lineHeight: 1.65, whiteSpace: 'pre-line' }}>
                    <ProseText value={prose(part.text)} />
                </Typography>
            )}
            {part.note && (
                <Box sx={{ p: 2, borderRadius: 2.5, bgcolor: 'rgba(255,255,255,0.04)', borderLeft: `3px solid ${MISTAKE}` }}>
                    <Typography color="text.secondary" sx={{ lineHeight: 1.6 }}>
                        {part.slot === 'analogy' && (
                            <Box component="span" sx={{ fontWeight: 800, color: MISTAKE }}>
                                Where it breaks:{' '}
                            </Box>
                        )}
                        <ProseText value={prose(part.note)} />
                    </Typography>
                </Box>
            )}
            {items.length > 0 && (
                <Stack component={part.numbered ? 'ol' : 'ul'} spacing={1.25} sx={{ listStyle: 'none', p: 0, m: 0 }}>
                    {items.slice(0, visible).map((item, i) => {
                        const newest = shown !== undefined && i === visible - 1 && visible > 1;
                        return (
                            <Stack
                                key={item}
                                component="li"
                                direction="row"
                                spacing={1.5}
                                alignItems="flex-start"
                                sx={{
                                    p: part.numbered ? 1.5 : 0,
                                    borderRadius: 2.5,
                                    bgcolor: part.numbered ? (newest ? `${accent}1a` : 'rgba(255,255,255,0.03)') : 'transparent',
                                    border: part.numbered ? `1px solid ${newest ? `${accent}66` : 'rgba(255,255,255,0.06)'}` : 'none',
                                    ...(newest ? { animation: 'stepIn 0.35s ease-out', '@keyframes stepIn': { from: { opacity: 0, transform: 'translateY(8px)' }, to: { opacity: 1, transform: 'none' } } } : {}),
                                }}
                            >
                                {part.numbered ? (
                                    <Box sx={{ width: 28, height: 28, flexShrink: 0, borderRadius: '50%', display: 'grid', placeItems: 'center', bgcolor: `${accent}26`, color: accent, fontWeight: 800, fontSize: '0.9rem' }}>
                                        {i + 1}
                                    </Box>
                                ) : (
                                    <Box sx={{ width: 8, height: 8, flexShrink: 0, mt: '0.6em', borderRadius: '50%', bgcolor: marker }} />
                                )}
                                <Typography sx={{ lineHeight: 1.6, pt: part.numbered ? 0.25 : 0 }}>
                                    <ProseText value={prose(item)} />
                                </Typography>
                            </Stack>
                        );
                    })}
                </Stack>
            )}
            {part.code && <CodeBlock code={part.code.code} language={part.code.language} />}
        </Stack>
    );
};
