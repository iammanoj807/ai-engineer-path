// Shown when a signed-out learner ticks a check: progress is saved to a Google
// account, so they sign in first. The tick they made is saved right after.

import { useEffect, useState } from 'react';
import { Alert, Box, Button, Dialog, DialogContent, Stack, Typography } from '@mui/material';
import GoogleIcon from '@mui/icons-material/Google';
import LockRoundedIcon from '@mui/icons-material/LockRounded';
import { signIn, useAccount } from '../../services/account';
import { clearPendingSave, onSignInNeeded } from '../../services/progress';

const SignInNeeded = () => {
    const account = useAccount();
    const [open, setOpen] = useState(false);

    useEffect(() => onSignInNeeded(() => setOpen(true)), []);

    // Signed in (or the session finished restoring): the held tick is saved, so
    // close, and stay closed if they sign out later.
    const signedIn = account.status === 'signed-in';
    if (open && signedIn) setOpen(false);
    const shown = open && !signedIn;

    const notNow = () => {
        clearPendingSave();
        setOpen(false);
    };

    return (
        <Dialog open={shown} onClose={notNow} maxWidth="xs" fullWidth slotProps={{ paper: { sx: { borderRadius: 4 } } }}>
            <DialogContent sx={{ textAlign: 'center', p: { xs: 3, sm: 4 } }}>
                <Box sx={{ width: 64, height: 64, borderRadius: '50%', mx: 'auto', mb: 1.5, display: 'flex', alignItems: 'center', justifyContent: 'center', bgcolor: 'rgba(41,121,255,0.12)' }}>
                    <LockRoundedIcon sx={{ fontSize: 32, color: 'primary.main' }} />
                </Box>
                <Typography variant="h6" sx={{ fontWeight: 800 }}>
                    Sign in to track your progress
                </Typography>
                <Typography color="text.secondary" sx={{ mt: 1 }}>
                    You need to sign in to tick checks. Your progress, XP and streak are saved to your account, so you can pick up
                    where you left off on any device. Reading the lessons stays free.
                </Typography>
                {account.error && <Alert severity="warning" sx={{ mt: 2, textAlign: 'left' }}>{account.error}</Alert>}
                <Stack spacing={1} sx={{ mt: 3 }}>
                    <Button
                        variant="contained"
                        size="large"
                        startIcon={<GoogleIcon />}
                        onClick={() => void signIn()}
                        disabled={account.status === 'loading'}
                        sx={{ fontWeight: 800, minHeight: 48 }}
                    >
                        {account.status === 'loading' ? 'Checking your sign-in…' : 'Sign in with Google'}
                    </Button>
                    <Button onClick={notNow} sx={{ color: 'text.secondary' }}>
                        Not now
                    </Button>
                </Stack>
            </DialogContent>
        </Dialog>
    );
};

export default SignInNeeded;
