// The top of a course page, kept short and visual: how each lesson works as
// four pictured steps (learn, practise, prove, review), with the full "how to
// study" text a tap away in a dialog. And small buttons that open a course's
// tools (SQL: the practice database, saved queries, the cheat sheet) in a
// dialog instead of long panels down the page.

import { Fragment, useState, type ElementType, type ReactNode } from 'react';
import { Box, Button, Dialog, DialogContent, DialogTitle, IconButton, Stack, Typography } from '@mui/material';
import CloseRoundedIcon from '@mui/icons-material/CloseRounded';
import SchoolRoundedIcon from '@mui/icons-material/SchoolRounded';
import BoltRoundedIcon from '@mui/icons-material/BoltRounded';
import TaskAltRoundedIcon from '@mui/icons-material/TaskAltRounded';
import EventRepeatRoundedIcon from '@mui/icons-material/EventRepeatRounded';
import ArrowForwardRoundedIcon from '@mui/icons-material/ArrowForwardRounded';
import InfoOutlinedIcon from '@mui/icons-material/InfoOutlined';

/** A dialog for a course's reference content, the same look everywhere. */
const ReferenceDialog = ({ title, open, onClose, children }: { title: string; open: boolean; onClose: () => void; children: ReactNode }) => (
    <Dialog open={open} onClose={onClose} fullWidth maxWidth="md" scroll="paper" slotProps={{ paper: { sx: { bgcolor: '#121722', backgroundImage: 'none', borderRadius: 3 } } }}>
        <DialogTitle sx={{ fontWeight: 800, pr: 7 }}>
            {title}
            <IconButton onClick={onClose} aria-label="Close" sx={{ position: 'absolute', right: 10, top: 10 }}>
                <CloseRoundedIcon />
            </IconButton>
        </DialogTitle>
        <DialogContent dividers sx={{ borderColor: 'rgba(255,255,255,0.08)' }}>{children}</DialogContent>
    </Dialog>
);

/**
 * How each lesson works, as a picture: learn, practise, prove (`checks`, the
 * course's own), review. The full text (`children`) opens from "Details".
 */
export const StudyStrip = ({ title, checks, children }: { title: string; checks: string[]; children: ReactNode }) => {
    const [open, setOpen] = useState(false);
    // A few words each, one line: the full text is in Details.
    const steps: { icon: ElementType; colour: string; label: string; caption: string; hint?: string }[] = [
        { icon: SchoolRoundedIcon, colour: '#b39ddb', label: 'Learn', caption: 'Step by step' },
        { icon: BoltRoundedIcon, colour: '#ffca28', label: 'Practise', caption: '5-minute questions' },
        { icon: TaskAltRoundedIcon, colour: '#81c784', label: 'Prove', caption: `${checks.length} checks`, hint: checks.join(' · ') },
        { icon: EventRepeatRoundedIcon, colour: '#4dd0e1', label: 'Review', caption: '1, 3, 7… days later' },
    ];
    return (
        <Box component="section" aria-label="How each lesson works" sx={{ px: { xs: 2, sm: 2.5 }, py: { xs: 1.5, md: 1.25 }, borderRadius: 3, border: '1px solid rgba(255,255,255,0.08)', bgcolor: 'rgba(255,255,255,0.02)' }}>
            {/* On a phone the steps make a 2 × 2 grid, with this line above; on a wide screen, one row with Details at the end. */}
            <Stack direction="row" alignItems="center" justifyContent="space-between" sx={{ mb: 1, display: { xs: 'flex', md: 'none' } }}>
                <Typography variant="caption" sx={{ fontWeight: 800, letterSpacing: 1.2, color: 'text.secondary' }}>
                    HOW EACH LESSON WORKS
                </Typography>
                <Button size="small" startIcon={<InfoOutlinedIcon />} onClick={() => setOpen(true)} sx={{ textTransform: 'none', fontWeight: 700, color: 'text.secondary' }}>
                    Details
                </Button>
            </Stack>
            <Box
                component="ol"
                sx={{
                    listStyle: 'none',
                    m: 0,
                    p: 0,
                    display: 'grid',
                    gridTemplateColumns: { xs: 'repeat(2, minmax(0, 1fr))', md: 'minmax(0, 1fr) auto minmax(0, 1fr) auto minmax(0, 1fr) auto minmax(0, 1fr) auto' },
                    gap: { xs: 1.5, md: 1 },
                    alignItems: 'center',
                }}
            >
                {steps.map(({ icon: Icon, colour, label, caption, hint }, i) => (
                    <Fragment key={label}>
                        <Stack component="li" direction="row" spacing={1.25} alignItems="center" title={hint} sx={{ minWidth: 0 }}>
                            <Box sx={{ width: 36, height: 36, flexShrink: 0, borderRadius: '50%', display: 'grid', placeItems: 'center', bgcolor: `${colour}24`, color: colour }}>
                                <Icon fontSize="small" />
                            </Box>
                            <Box sx={{ minWidth: 0 }}>
                                <Typography sx={{ fontWeight: 800, lineHeight: 1.2, fontSize: '0.95rem', whiteSpace: 'nowrap' }}>
                                    {i + 1}. {label}
                                </Typography>
                                <Typography sx={{ color: 'text.secondary', lineHeight: 1.3, fontSize: '0.82rem', whiteSpace: { md: 'nowrap' } }}>
                                    {caption}
                                </Typography>
                            </Box>
                        </Stack>
                        {i < steps.length - 1 && (
                            <Box aria-hidden sx={{ display: { xs: 'none', md: 'block' }, color: 'rgba(255,255,255,0.25)' }}>
                                <ArrowForwardRoundedIcon fontSize="small" />
                            </Box>
                        )}
                    </Fragment>
                ))}
                <Box component="li" sx={{ display: { xs: 'none', md: 'block' }, pl: 1 }}>
                    <Button size="small" startIcon={<InfoOutlinedIcon />} onClick={() => setOpen(true)} sx={{ textTransform: 'none', fontWeight: 700, color: 'text.secondary', whiteSpace: 'nowrap' }}>
                        Details
                    </Button>
                </Box>
            </Box>
            <ReferenceDialog title={title} open={open} onClose={() => setOpen(false)}>
                {children}
            </ReferenceDialog>
        </Box>
    );
};

/** A small button for one of a course's tools; its content opens in a dialog. */
export const ToolButton = ({ icon: Icon, colour, label, title, children }: { icon: ElementType; colour: string; label: string; title: string; children: ReactNode }) => {
    const [open, setOpen] = useState(false);
    return (
        <>
            <Button
                variant="outlined"
                startIcon={<Icon sx={{ color: colour }} />}
                onClick={() => setOpen(true)}
                sx={{ textTransform: 'none', fontWeight: 700, minHeight: 44, color: 'text.primary', borderColor: 'rgba(255,255,255,0.15)', '&:hover': { borderColor: colour } }}
            >
                {label}
            </Button>
            <ReferenceDialog title={title} open={open} onClose={() => setOpen(false)}>
                {children}
            </ReferenceDialog>
        </>
    );
};
