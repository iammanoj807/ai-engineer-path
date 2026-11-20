import { useState } from 'react';
import { Link as RouterLink, useLocation, useNavigate } from 'react-router-dom';
import {
    AppBar,
    Avatar,
    Box,
    Button,
    Divider,
    IconButton,
    ListItemIcon,
    Menu,
    MenuItem,
    Stack,
    Toolbar,
    Tooltip,
    Typography,
} from '@mui/material';
import LocalFireDepartmentRoundedIcon from '@mui/icons-material/LocalFireDepartmentRounded';
import BoltRoundedIcon from '@mui/icons-material/BoltRounded';
import MenuRoundedIcon from '@mui/icons-material/MenuRounded';
import RouteRoundedIcon from '@mui/icons-material/RouteRounded';
import LogoutRoundedIcon from '@mui/icons-material/LogoutRounded';
import GoogleIcon from '@mui/icons-material/Google';
import { COURSES } from '../../game/courses';
import { useGameStats } from '../../game/useProgress';
import { signIn, signOut, useAccount } from '../../services/account';
import { FLAME, XP_GOLD } from './colours';

const NAV = [{ to: '/', label: 'Path' }, ...COURSES.map(course => ({ to: course.route, label: course.title }))];

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

const AccountButton = () => {
    const account = useAccount();
    const [anchor, setAnchor] = useState<HTMLElement | null>(null);

    if (account.status === 'off' || account.status === 'loading') return null;

    if (account.status === 'guest') {
        return (
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
        );
    }

    return (
        <>
            <IconButton onClick={event => setAnchor(event.currentTarget)} aria-label="Your account" sx={{ p: 0.5 }}>
                <Avatar src={account.photo} alt={account.name ?? 'You'} sx={{ width: 34, height: 34 }} />
            </IconButton>
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
            </Menu>
        </>
    );
};

const TopBar = () => {
    const { pathname } = useLocation();
    const navigate = useNavigate();
    const { xp, streak, today } = useGameStats();
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
                            selected={pathname === item.to}
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
                        const active = pathname === item.to;
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
                    <Stat
                        icon={<LocalFireDepartmentRoundedIcon sx={{ color: streak > 0 && today > 0 ? FLAME : 'text.disabled' }} />}
                        value={streak}
                        colour={streak > 0 && today > 0 ? FLAME : '#90a4ae'}
                        label={today > 0 ? 'Day streak' : 'Day streak (tick a check today to keep it)'}
                    />
                    <Box sx={{ display: { xs: 'none', sm: 'block' } }}>
                        <Stat icon={<BoltRoundedIcon sx={{ color: XP_GOLD }} />} value={xp} colour={XP_GOLD} label="Total XP" />
                    </Box>
                    <AccountButton />
                </Stack>
            </Toolbar>
        </AppBar>
    );
};

export default TopBar;
