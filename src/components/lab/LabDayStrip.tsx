import { Box, ButtonBase, Stack, Typography } from '@mui/material';
import { C } from '../learning/anim/kit';
import { px, useTextSize } from '../learning/learning';
import type { DayResult } from '../../data/systemDesignLab/model';
import { goalValue, hourLabel, type Goal } from '../../data/systemDesignLab/missions';
import { ACCENT } from './labStyle';

// The whole day in one row, under the diagram: one cell per hour, green when
// every goal held that hour, red when one was missed, grey until the run gets
// there. It fills in as the day plays, right where the learner is looking, so
// the diagram and the result are never on different parts of the page.

export const LabDayStrip = ({
    day,
    goals,
    revealed,
    selected,
    onSelect,
}: {
    day: DayResult;
    goals: Goal[];
    revealed: number;
    selected: number;
    onSelect: (hour: number) => void;
}) => {
    const t = useTextSize();
    const hourly = goals.filter(g => g.kind !== 'budget');
    const missed = (hour: number) => hourly.some(g => !(goalValue(g.kind, day.hours[hour]) <= g.limit));
    return (
        <Box>
            <Stack direction="row" spacing={0.25} role="group" aria-label="The day, hour by hour">
                {day.hours.map(h => {
                    const shown = h.hour < revealed;
                    const bad = shown && missed(h.hour);
                    const fill = !shown ? 'rgba(255,255,255,0.07)' : bad ? C.red : C.green;
                    return (
                        <ButtonBase
                            key={h.hour}
                            onClick={() => onSelect(h.hour)}
                            aria-label={`${hourLabel(h.hour)}${shown ? (bad ? ': a goal was missed' : ': every goal held') : ''}`}
                            aria-pressed={h.hour === selected}
                            sx={{
                                flex: 1,
                                minWidth: 0,
                                height: 26,
                                p: 0,
                                borderRadius: 1,
                                bgcolor: fill,
                                opacity: shown ? 0.85 : 1,
                                outline: h.hour === selected ? `2px solid ${ACCENT}` : 'none',
                                outlineOffset: 1,
                                transition: 'background-color 200ms',
                                '&:hover': { opacity: 1 },
                            }}
                        />
                    );
                })}
            </Stack>
            <Stack direction="row" justifyContent="space-between" sx={{ mt: 0.5 }}>
                {[0, 6, 12, 18, 23].map(hour => (
                    <Typography key={hour} sx={{ color: 'text.secondary', fontSize: px(t.label * 0.9), fontFamily: 'ui-monospace, SFMono-Regular, Menlo, monospace' }}>
                        {hourLabel(hour)}
                    </Typography>
                ))}
            </Stack>
        </Box>
    );
};
