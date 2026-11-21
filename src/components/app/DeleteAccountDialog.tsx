// Delete your account, from the account menu: the account and everything
// saved in it (XP, streak, ticked checks, practice scores, saved SQL queries).
// It can't be undone, so the dialog says exactly what goes, and Google asks
// the person to sign in once more before anything is deleted.

import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Alert, Box, Button, CircularProgress, Dialog, DialogActions, DialogContent, DialogTitle, Typography } from '@mui/material';
import { useGameStats } from '../../game/useProgress';
import { deleteAccount } from '../../services/account';
import { WRONG } from '../practice/style';

type Step = 'ask' | 'working' | 'done';

const DeleteAccountDialog = ({ onClose }: { onClose: () => void }) => {
    const navigate = useNavigate();
    const { xp, streak } = useGameStats();
    const [step, setStep] = useState<Step>('ask');
    const [error, setError] = useState<string | null>(null);
    // While deleting, keep showing the numbers from before: they drop to 0 as the data goes.
    const [frozen, setFrozen] = useState<{ xp: number; streak: number } | null>(null);
    const saved = frozen ?? { xp, streak };

    const confirm = async () => {
        setError(null);
        setFrozen({ xp, streak });
        setStep('working');
        try {
            const result = await deleteAccount();
            setStep(result === 'deleted' ? 'done' : 'ask');
        } catch (problem) {
            setError((problem as Error).message);
            setStep('ask');
        }
        setFrozen(null);
    };

    const finish = () => {
        onClose();
        navigate('/');
    };

    return (
        <Dialog
            open
            onClose={step === 'working' ? undefined : step === 'done' ? finish : onClose}
            maxWidth="xs"
            fullWidth
            aria-labelledby="delete-account-title"
            slotProps={{ paper: { sx: { bgcolor: '#0f131b', backgroundImage: 'none', borderRadius: 3 } } }}
        >
            {step === 'done' ? (
                <>
                    <DialogTitle id="delete-account-title" sx={{ fontWeight: 800 }}>Your account is deleted</DialogTitle>
                    <DialogContent>
                        <Typography color="text.secondary" sx={{ lineHeight: 1.6 }}>
                            Your progress is gone from our records. You can keep reading every lesson, and sign in again any time to start fresh.
                        </Typography>
                    </DialogContent>
                    <DialogActions sx={{ px: 3, pb: 2.5 }}>
                        <Button variant="contained" onClick={finish} sx={{ minHeight: 44, fontWeight: 800 }} autoFocus>
                            OK
                        </Button>
                    </DialogActions>
                </>
            ) : (
                <>
                    <DialogTitle id="delete-account-title" sx={{ fontWeight: 800 }}>Delete your account?</DialogTitle>
                    <DialogContent>
                        <Typography sx={{ lineHeight: 1.6, mb: 1.5 }}>This deletes your account and everything saved in it:</Typography>
                        <Box component="ul" sx={{ m: 0, pl: 2.5, color: 'text.secondary', lineHeight: 1.8 }}>
                            <li>your {saved.xp} XP{saved.streak > 0 ? ` and your ${saved.streak}-day streak` : ''}</li>
                            <li>every lesson you ticked or practised, in all three courses</li>
                            <li>your saved SQL queries</li>
                            <li>and we stop emailing you</li>
                        </Box>
                        <Typography sx={{ mt: 1.5, fontWeight: 700, color: WRONG }}>It can't be undone.</Typography>
                        <Typography variant="body2" color="text.secondary" sx={{ mt: 1.5, lineHeight: 1.55 }}>
                            To be sure it's you, Google will ask you to sign in once more.
                        </Typography>
                        {error && (
                            <Alert severity="error" sx={{ mt: 2 }}>
                                {error}
                            </Alert>
                        )}
                    </DialogContent>
                    <DialogActions sx={{ px: 3, pb: 2.5, gap: 1 }}>
                        <Button onClick={onClose} disabled={step === 'working'} sx={{ minHeight: 44, fontWeight: 700 }} autoFocus>
                            Keep my account
                        </Button>
                        <Button
                            variant="contained"
                            color="error"
                            onClick={() => void confirm()}
                            disabled={step === 'working'}
                            startIcon={step === 'working' ? <CircularProgress size={16} color="inherit" /> : undefined}
                            sx={{ minHeight: 44, fontWeight: 800 }}
                        >
                            {step === 'working' ? 'Deleting…' : 'Delete my account'}
                        </Button>
                    </DialogActions>
                </>
            )}
        </Dialog>
    );
};

export default DeleteAccountDialog;
