import { lazy, Suspense, useEffect, useState } from 'react';
import { Link as RouterLink, useLocation, useNavigate } from 'react-router-dom';
import {
    Alert,
    AppBar,
    Avatar,
    Box,
    Button,
    Divider,
    IconButton,
    ListItemIcon,
    ListItemText,
    Menu,
    MenuItem,
    Snackbar,
    Stack,
    Switch,
    Toolbar,
    Tooltip,
    Typography,
} from '@mui/material';
import LocalFireDepartmentRoundedIcon from '@mui/icons-material/LocalFireDepartmentRounded';
import BoltRoundedIcon from '@mui/icons-material/BoltRounded';
import MenuRoundedIcon from '@mui/icons-material/MenuRounded';
import RouteRoundedIcon from '@mui/icons-material/RouteRounded';
import LogoutRoundedIcon from '@mui/icons-material/LogoutRounded';
import DeleteForeverRoundedIcon from '@mui/icons-material/DeleteForeverRounded';
import MailOutlineRoundedIcon from '@mui/icons-material/MailOutlineRounded';
import GoogleIcon from '@mui/icons-material/Google';
import { COURSES } from '../../game/courses';
import { coursePath, placeOf } from '../../game/addresses';
import { useGameStats } from '../../game/useProgress';
import { signIn, signOut, useAccount, useTracksProgress } from '../../services/account';
import { setEmailReminders } from '../../services/progress';
import { FLAME, XP_GOLD } from './colours';
import { useProgressSummary } from './useProgressSummary';

// Loaded only when someone opens it.
const DeleteAccountDialog = lazy(() => import('./DeleteAccountDialog'));

const NAV = [{ to: '/', label: 'Path' }, ...COURSES.map(course => ({ to: coursePath(course), label: course.title }))];

/** A course's menu item stays selected on its lessons and unit guides too. */
const isCurrent = (pathname: string, to: string) => {
    const place = placeOf(pathname);
    return to === '/' ? !place : !!place && coursePath(place.course) === to;
};

const Stat = ({ icon, value, colour, label }: { icon: React.ReactNode; value: number; colour: string; label: string }) => (
    <Tooltip title={label}>
        <Stack direction="row" alignItems="center" spacing={0.5} aria-label={`${label}: ${value}`} sx={{ color: colour, fontWeight: 800 }}>
            {icon}
            <Typography component="span" sx={{ fontWeight: 800, fontSize: '1rem', color: colour }}>
                {value}
            </Typography>
        </Stack>
    </Tooltip>
);

/**
 * The "turn reminders off" link in every email opens /?emails=off. Signed in,
 * that turns them off at once; signed out, it asks to sign in first.
 */
const EmailOptOut = () => {
    const { pathname, search } = useLocation();
    const navigate = useNavigate();
    const account = useAccount();
    const asked = new URLSearchParams(search).get('emails') === 'off';
    const [done, setDone] = useState(false);

    useEffect(() => {
        if (!asked || account.status !== 'signed-in') return;
        void setEmailReminders(false).then(() => {
            setDone(true);
            navigate(pathname, { replace: true });
        });
    }, [asked, account.status, navigate, pathname]);

    return (
        <>
            <Snackbar open={asked && account.status === 'guest'} anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}>
                <Alert
                    severity="info"
                    variant="filled"
                    action={
                        <Button color="inherit" size="small" onClick={() => void signIn()} sx={{ fontWeight: 800 }}>
                            Sign in
                        </Button>
                    }
                >
                    Sign in to turn off reminder emails.
                </Alert>
            </Snackbar>
            <Snackbar open={done} autoHideDuration={7000} onClose={() => setDone(false)} anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}>
                <Alert severity="success" variant="filled" onClose={() => setDone(false)}>
                    Reminder emails are off. You can turn them back on from your account menu.
                </Alert>
            </Snackbar>
        </>
    );
};

const AccountButton = () => {
    const account = useAccount();
    const { progress } = useGameStats();
    // Off unless the learner turned them on.
    const reminders = progress.activity?.emails === true;
    const [anchor, setAnchor] = useState<HTMLElement | null>(null);
    const [deleting, setDeleting] = useState(false);
    // Stays open after the account is gone (signed out by then), to say it's done.
    const deleteDialog = deleting && (
        <Suspense fallback={null}>
            <DeleteAccountDialog onClose={() => setDeleting(false)} />
        </Suspense>
    );

    // One shape for every state, so the delete dialog keeps its place (and what it is showing)
    // when deleting signs the person out.
    return (
        <>
            {account.status === 'guest' && (
                <Tooltip title="Keep your progress on every device">
                    <Button
                        variant="outlined"
                        size="small"
                        startIcon={<GoogleIcon />}
                        onClick={() => void signIn()}
                        sx={{ minHeight: 40, borderColor: 'rgba(255,255,255,0.25)', color: 'text.primary', whiteSpace: 'nowrap' }}
                    >
                        Sign in
                    </Button>
                </Tooltip>
            )}
            {account.status === 'signed-in' && (
                <IconButton onClick={event => setAnchor(event.currentTarget)} aria-label="Your account" sx={{ p: 0.5 }}>
                    <Avatar src={account.photo} alt={account.name ?? 'You'} sx={{ width: 34, height: 34 }} />
                </IconButton>
            )}
            {account.status === 'signed-in' && (
                <Menu anchorEl={anchor} open={!!anchor} onClose={() => setAnchor(null)}>
                    <Box sx={{ px: 2, py: 1 }}>
                        <Typography fontWeight={700}>{account.name ?? 'Signed in'}</Typography>
                        <Typography variant="body2" color="text.secondary">
                            Progress saved to your account
                        </Typography>
                    </Box>
                    <Divider />
                    <MenuItem
                        onClick={() => {
                            setAnchor(null);
                            void signOut();
                        }}
                    >
                        <ListItemIcon>
                            <LogoutRoundedIcon fontSize="small" />
                        </ListItemIcon>
                        Sign out
                    </MenuItem>
                    <MenuItem role="menuitemcheckbox" aria-checked={reminders} onClick={() => void setEmailReminders(!reminders)} sx={{ alignItems: 'flex-start' }}>
                        <ListItemIcon sx={{ mt: 0.5 }}>
                            <MailOutlineRoundedIcon fontSize="small" />
                        </ListItemIcon>
                        <ListItemText
                            primary="Reminder emails"
                            secondary={"A nudge if you're away a week"}
                            slotProps={{ secondary: { sx: { fontSize: '0.8rem' } } }}
                        />
                        <Switch size="small" checked={reminders} tabIndex={-1} aria-hidden sx={{ ml: 1.5, pointerEvents: 'none' }} />
                    </MenuItem>
                    <Divider />
                    <MenuItem
                        onClick={() => {
                            setAnchor(null);
                            setDeleting(true);
                        }}
                        sx={{ color: '#ef9a9a' }}
                    >
                        <ListItemIcon sx={{ color: 'inherit' }}>
                            <DeleteForeverRoundedIcon fontSize="small" />
                        </ListItemIcon>
                        Delete account
                    </MenuItem>
                </Menu>
            )}
            {deleteDialog}
        </>
    );
};

const TopBar = () => {
    const { pathname } = useLocation();
    const navigate = useNavigate();
    const { xp, streak, today, progress, stats } = useGameStats();
    const tracking = useTracksProgress();
    useProgressSummary({ progress, stats, xp, streak });
    const [menu, setMenu] = useState<HTMLElement | null>(null);

    return (
        <AppBar
            position="sticky"
            elevation={0}
            sx={{ bgcolor: 'rgba(11,14,20,0.92)', backdropFilter: 'blur(8px)', borderBottom: '1px solid rgba(255,255,255,0.08)' }}
        >
            <Toolbar sx={{ gap: 1.5, minHeight: { xs: 60 }, px: { xs: 2, md: 4 } }}>
                <IconButton
                    onClick={event => setMenu(event.currentTarget)}
                    aria-label="Open menu"
                    sx={{ display: { md: 'none' }, ml: -1 }}
                >
                    <MenuRoundedIcon />
                </IconButton>
                <Menu anchorEl={menu} open={!!menu} onClose={() => setMenu(null)}>
                    {NAV.map(item => (
                        <MenuItem
                            key={item.to}
                            selected={isCurrent(pathname, item.to)}
                            onClick={() => {
                                setMenu(null);
                                navigate(item.to);
                            }}
                        >
                            {item.label}
                        </MenuItem>
                    ))}
                </Menu>

                <Stack
                    component={RouterLink}
                    to="/"
                    direction="row"
                    alignItems="center"
                    spacing={1}
                    sx={{ color: 'text.primary', textDecoration: 'none', mr: { md: 2 } }}
                >
                    <RouteRoundedIcon sx={{ color: 'primary.main' }} />
                    <Typography sx={{ fontWeight: 800, letterSpacing: 0.5, whiteSpace: 'nowrap', fontSize: { xs: '1rem', sm: '1.1rem' } }}>
                        AI Engineer Path
                    </Typography>
                </Stack>

                <Stack direction="row" spacing={0.5} sx={{ display: { xs: 'none', md: 'flex' }, flex: 1 }}>
                    {NAV.map(item => {
                        const active = isCurrent(pathname, item.to);
                        return (
                            <Button
                                key={item.to}
                                component={RouterLink}
                                to={item.to}
                                sx={{
                                    color: active ? 'text.primary' : 'text.secondary',
                                    fontWeight: active ? 800 : 600,
                                    borderBottom: '2px solid',
                                    borderColor: active ? 'primary.main' : 'transparent',
                                    borderRadius: 0,
                                    px: 1.5,
                                }}
                            >
                                {item.label}
                            </Button>
                        );
                    })}
                </Stack>
                <Box sx={{ flex: { xs: 1, md: 0 } }} />

                <Stack direction="row" spacing={2} alignItems="center">
                    {/* Streak and XP are progress, so they show once signed in. */}
                    {tracking && (
                        <Stat
                            icon={<LocalFireDepartmentRoundedIcon sx={{ color: streak > 0 && today > 0 ? FLAME : 'text.disabled' }} />}
                            value={streak}
                            colour={streak > 0 && today > 0 ? FLAME : '#90a4ae'}
                            label={today > 0 ? 'Day streak' : 'Day streak (practise or tick a check today to keep it)'}
                        />
                    )}
                    {tracking && (
                        <Box sx={{ display: { xs: 'none', sm: 'block' } }}>
                            <Stat icon={<BoltRoundedIcon sx={{ color: XP_GOLD }} />} value={xp} colour={XP_GOLD} label="Total XP" />
                        </Box>
                    )}
                    <AccountButton />
                    <EmailOptOut />
                </Stack>
            </Toolbar>
        </AppBar>
    );
};

export default TopBar;
