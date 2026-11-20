import { Alert, Button } from '@mui/material';
import GoogleIcon from '@mui/icons-material/Google';
import { signIn, useAccount } from '../../services/account';

/**
 * Tells a guest where their progress is kept, and invites them to sign in so
 * it is saved to their account and shows on every device.
 */
const GuestNote = ({ compact = false }: { compact?: boolean }) => {
    const account = useAccount();
    if (account.status === 'off') {
        return compact ? null : (
            <Alert severity="info" variant="outlined" sx={{ mb: 3 }}>
                Your progress is saved in this browser. Clearing your browser data clears it too.
            </Alert>
        );
    }
    if (account.status !== 'guest') {
        return account.error ? <Alert severity="warning" sx={{ mb: 3 }}>{account.error}</Alert> : null;
    }
    return (
        <Alert
            severity="info"
            variant="outlined"
            icon={<GoogleIcon fontSize="inherit" />}
            sx={{ mb: 3, alignItems: 'center' }}
            action={
                <Button color="inherit" variant="outlined" onClick={() => void signIn()} sx={{ fontWeight: 800, whiteSpace: 'nowrap' }}>
                    Sign in
                </Button>
            }
        >
            {account.error ?? (compact
                ? 'Sign in with Google to save your progress.'
                : 'Want to see your progress on any device? Sign in with Google and we save it to your account. Until then it stays in this browser.')}
        </Alert>
    );
};

export default GuestNote;
