import type { ReactNode } from 'react';
import { Box, IconButton, Stack, Switch, ToggleButton, ToggleButtonGroup, Typography } from '@mui/material';
import AddRoundedIcon from '@mui/icons-material/AddRounded';
import RemoveRoundedIcon from '@mui/icons-material/RemoveRounded';
import { TAP, px, useTextSize } from '../learning/learning';
import {
    CACHE_HIT,
    COST,
    RATE_LIMIT_RPS,
    SERVER_SIZES,
    SERVICE_MS,
    formatCost,
    formatCount,
    type CacheSize,
    type LabConfig,
    type ServerSize,
} from '../../data/systemDesignLab/model';
import { LEVER_MAX, type Lever, type Mission } from '../../data/systemDesignLab/missions';

// The parts of the design a mission lets the learner change. Each control
// says in one line what it does, so a beginner can use it straight after the
// lesson that teaches it, without looking anything up.

const capacityOf = (size: ServerSize) => (SERVER_SIZES[size].workers * 1000) / SERVICE_MS;

const Row = ({ title, hint, children }: { title: string; hint: string; children: ReactNode }) => {
    const t = useTextSize();
    return (
        <Box sx={{ py: 1.25, borderTop: '1px solid rgba(255,255,255,0.07)', '&:first-of-type': { borderTop: 'none', pt: 0 } }}>
            <Stack direction="row" alignItems="center" justifyContent="space-between" spacing={1.5} flexWrap="wrap" useFlexGap>
                <Typography sx={{ fontWeight: 800, color: 'text.primary', fontSize: px(t.body2) }}>{title}</Typography>
                {children}
            </Stack>
            <Typography sx={{ color: 'text.secondary', fontSize: px(t.small), mt: 0.5, lineHeight: 1.45 }}>{hint}</Typography>
        </Box>
    );
};

const Stepper = ({ label, value, min, max, onChange, disabled }: { label: string; value: number; min: number; max: number; onChange: (n: number) => void; disabled?: boolean }) => (
    <Stack direction="row" alignItems="center" spacing={0.5}>
        <IconButton aria-label={`One fewer ${label}`} onClick={() => onChange(value - 1)} disabled={disabled || value <= min} sx={{ width: TAP, height: TAP, bgcolor: 'rgba(255,255,255,0.06)' }}>
            <RemoveRoundedIcon />
        </IconButton>
        <Typography aria-live="polite" sx={{ minWidth: 34, textAlign: 'center', fontWeight: 800, fontSize: '1.15rem', fontVariantNumeric: 'tabular-nums', color: disabled ? 'text.disabled' : 'text.primary' }}>
            {value}
        </Typography>
        <IconButton aria-label={`One more ${label}`} onClick={() => onChange(value + 1)} disabled={disabled || value >= max} sx={{ width: TAP, height: TAP, bgcolor: 'rgba(255,255,255,0.06)' }}>
            <AddRoundedIcon />
        </IconButton>
    </Stack>
);

const Choice = <T extends string>({ label, value, options, onChange }: { label: string; value: T; options: [T, string][]; onChange: (v: T) => void }) => {
    const t = useTextSize();
    return (
        <ToggleButtonGroup exclusive size="small" value={value} onChange={(_, v: T | null) => v && onChange(v)} aria-label={label} sx={{ flexWrap: 'wrap' }}>
            {options.map(([v, text]) => (
                <ToggleButton key={v} value={v} sx={{ minHeight: 40, px: 1.25, textTransform: 'none', fontWeight: 700, fontSize: px(t.small), lineHeight: 1.2, '&:focus': { outline: 'none' } }}>
                    {text}
                </ToggleButton>
            ))}
        </ToggleButtonGroup>
    );
};

const Toggle = ({ label, checked, onChange }: { label: string; checked: boolean; onChange: (on: boolean) => void }) => (
    <Stack direction="row" alignItems="center" spacing={0.5}>
        <Typography sx={{ color: checked ? 'text.primary' : 'text.secondary', fontWeight: 700, fontSize: '0.9rem' }}>{checked ? 'On' : 'Off'}</Typography>
        <Switch checked={checked} onChange={e => onChange(e.target.checked)} slotProps={{ input: { 'aria-label': label } }} />
    </Stack>
);

export const LabLevers = ({ mission, design, onChange }: { mission: Mission; design: LabConfig; onChange: (changes: Partial<LabConfig>) => void }) => {
    const has = (lever: Lever) => mission.levers.includes(lever);
    const max = (key: keyof typeof LEVER_MAX) => mission.max?.[key] ?? LEVER_MAX[key];
    const each = formatCount(capacityOf(design.size));
    return (
        <Box>
            {has('servers') && (
                <Row title="App servers" hint={`Press + to add a server, − to remove one. Each ${SERVER_SIZES[design.size].label.toLowerCase()} server handles about ${each} requests a second and costs ${formatCost(SERVER_SIZES[design.size].cost)} a month. With two or more, a load balancer (${formatCost(COST.loadBalancer)}) shares the requests between them.`}>
                    <Stepper label="server" value={design.servers} min={1} max={max('servers')} onChange={servers => onChange({ servers })} />
                </Row>
            )}
            {has('size') && (
                <Row title="Server size" hint="Pick a size. A bigger server handles more requests a second and costs more, but it is still one machine.">
                    <Choice<ServerSize>
                        label="Server size"
                        value={design.size}
                        onChange={size => onChange({ size })}
                        options={(Object.keys(SERVER_SIZES) as ServerSize[]).map(size => [size, `${SERVER_SIZES[size].label} · ${formatCount(capacityOf(size))}/s`])}
                    />
                </Row>
            )}
            {has('balancer') && (
                <Row title="Load balancing" hint="Pick how the load balancer chooses a server. Round robin takes turns. Least connections picks the server with the fewest requests in progress.">
                    <Choice
                        label="Load balancing rule"
                        value={design.balancer}
                        onChange={balancer => onChange({ balancer })}
                        options={[['round-robin', 'Round robin'], ['least-connections', 'Least connections']]}
                    />
                </Row>
            )}
            {has('healthChecks') && (
                <Row title="Health checks" hint="Switch on, and every few seconds the load balancer asks each server if it is OK, and stops sending requests to one that doesn't answer.">
                    <Toggle label="Health checks" checked={design.healthChecks} onChange={healthChecks => onChange({ healthChecks })} />
                </Row>
            )}
            {has('rateLimit') && (
                <Row title="Rate limit" hint={`Switch on, and each client may send at most ${RATE_LIMIT_RPS} requests a second. The rest are turned away with 429 Too Many Requests.`}>
                    <Toggle label="Rate limit" checked={design.rateLimit} onChange={rateLimit => onChange({ rateLimit })} />
                </Row>
            )}
            {has('cdn') && (
                <Row title="CDN" hint={`Switch on to copy your images and scripts to servers near your users (${formatCost(COST.cdn)} a month).`}>
                    <Toggle label="CDN" checked={design.cdn} onChange={cdn => onChange({ cdn })} />
                </Row>
            )}
            {has('cache') && (
                <Row title="Cache" hint="Pick a size, or None. A cache keeps popular data in fast memory, so those reads never reach the database. The % is the share of reads each size answers.">
                    <Choice<CacheSize>
                        label="Cache size"
                        value={design.cache}
                        onChange={cache => onChange({ cache })}
                        options={(['none', 'small', 'medium', 'large'] as CacheSize[]).map(size => [
                            size,
                            size === 'none' ? 'None' : `${size[0].toUpperCase()}${size.slice(1)} · ${Math.round(CACHE_HIT[size] * 100)}% · ${formatCost(COST.cache[size])}`,
                        ])}
                    />
                </Row>
            )}
            {has('replicas') && (
                <Row title="Read replicas" hint={`Press + to add a copy of the database (${formatCost(COST.dbNode)} each). Copies share the reads, but each one must also apply every write.`}>
                    <Stepper label="replica" value={design.replicas} min={0} max={max('replicas')} onChange={replicas => onChange({ replicas })} />
                </Row>
            )}
            {has('shards') && (
                <Row title="Shards" hint={`Press + to split the data across more databases (${formatCost(COST.dbNode)} each), for example by user. Each takes its share of the reads and the writes.`}>
                    <Stepper label="shard" value={design.shards} min={1} max={max('shards')} onChange={shards => onChange({ shards })} />
                </Row>
            )}
            {has('queue') && (
                <Row title="Job queue" hint={`Switch on to put slow jobs on a queue (${formatCost(COST.queue)}): the request answers at once, and background workers do the jobs.`}>
                    <Toggle label="Job queue" checked={design.queue} onChange={queue => onChange(queue ? { queue, workers: Math.max(design.workers, 1) } : { queue })} />
                </Row>
            )}
            {has('workers') && (
                <Row title="Workers" hint={`Press + to add a worker (${formatCost(COST.worker)} each). Each makes one photo's thumbnails a second. Workers only run when the job queue is on.`}>
                    <Stepper label="worker" value={design.workers} min={0} max={max('workers')} onChange={workers => onChange({ workers })} disabled={!design.queue} />
                </Row>
            )}
        </Box>
    );
};
