import { Alert, Button } from '@mui/material';
import GoogleIcon from '@mui/icons-material/Google';
import { signIn, useAccount } from '../../services/account';

/** Invites a signed-out learner to sign in, which is what saving progress needs. */
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
                ? 'Sign in with Google to tick checks and save your progress.'
                : 'Lessons are free to read. Sign in with Google to tick checks, keep your streak and see your progress on any device.')}
        </Alert>
    );
};

export default GuestNote;
