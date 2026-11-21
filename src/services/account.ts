// Google sign-in. When the build has a Firebase project (the VITE_FIREBASE_*
// variables, see README), anyone can read the lessons, and ticking a check
// needs a Google account: progress lives in the learner's own account, the
// same on every device. Without a Firebase project (a fork), there is no
// sign-in and progress is kept in the browser instead.

import { useSyncExternalStore } from 'react';
import { localBackend, markSeenToday, requireSignInToSave, runPendingSave, switchBackend } from './progress';

const config = {
    apiKey: import.meta.env.VITE_FIREBASE_API_KEY as string | undefined,
    authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN as string | undefined,
    projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID as string | undefined,
    appId: import.meta.env.VITE_FIREBASE_APP_ID as string | undefined,
};

export type FirebaseConfig = { apiKey: string; authDomain: string; projectId: string; appId: string };

export const cloudConfigured = Boolean(config.apiKey && config.authDomain && config.projectId && config.appId);

export interface AccountState {
    /** 'off': no Firebase project in this build, so guest only. */
    status: 'off' | 'loading' | 'guest' | 'signed-in';
    name?: string;
    photo?: string;
    /** Set when the last sign-in attempt failed, in words someone can act on. */
    error?: string;
}

let current: AccountState = { status: cloudConfigured ? 'loading' : 'off' };
const listeners = new Set<() => void>();

// With sign-in available, progress is saved only to an account. Without it
// (a fork with no Firebase project), it is saved in the browser.
// If sign-in itself fails to load ('off'), fall back to the browser rather than block every tick.
if (cloudConfigured) requireSignInToSave(() => current.status === 'signed-in' || current.status === 'off');

const set = (next: AccountState) => {
    current = next;
    listeners.forEach(fn => fn());
};

// Sign-in takes a moment to load. Remembering whether this browser was signed
// in lets the home page show the right layout (dashboard or front page) at once.
const SIGNED_IN_KEY = 'aep:v1:signed-in';

const rememberSignedIn = (signedIn: boolean) => {
    try {
        if (signedIn) localStorage.setItem(SIGNED_IN_KEY, '1');
        else localStorage.removeItem(SIGNED_IN_KEY);
    } catch {
        // Blocked storage: the home page waits for sign-in instead.
    }
};

/** Whether this browser was signed in last time; a guess, until sign-in has loaded. */
export const wasSignedIn = (): boolean => {
    try {
        return localStorage.getItem(SIGNED_IN_KEY) === '1';
    } catch {
        return false;
    }
};

type CloudModule = typeof import('./cloud');
let cloud: Promise<CloudModule> | null = null;

/** Start listening for a signed-in user. Called once, when the app opens. */
export const startAccount = () => {
    if (!cloudConfigured || cloud) return;
    cloud = import('./cloud');
    cloud
        .then(mod => mod.watchUser(config as FirebaseConfig, {
            onSignedIn: (user, backend) => {
                switchBackend(backend);
                rememberSignedIn(true);
                set({ status: 'signed-in', name: user.name, photo: user.photo });
                runPendingSave();
                void markSeenToday();
            },
            onSignedOut: () => {
                switchBackend(localBackend('guest'));
                rememberSignedIn(false);
                set({ status: 'guest' });
            },
        }))
        .catch(error => {
            // Offline on first visit, or a blocked script: carry on as a guest.
            console.error('Sign-in is unavailable:', error);
            cloud = null;
            set({ status: 'off' });
        });
};

export const signIn = async () => {
    if (!cloud) return;
    set({ ...current, error: undefined });
    try {
        await (await cloud).signInWithGoogle();
    } catch (error) {
        const code = (error as { code?: string }).code ?? '';
        if (code === 'auth/popup-closed-by-user' || code === 'auth/cancelled-popup-request') return;
        set({
            ...current,
            error: code === 'auth/popup-blocked'
                ? 'Your browser blocked the sign-in window. Allow pop-ups for this site and try again.'
                : 'Sign-in did not work. Your progress is still saved in this browser.',
        });
        console.error('Sign-in failed:', error);
    }
};

export const signOut = async () => {
    if (!cloud) return;
    await (await cloud).signOutUser();
};

/**
 * Delete the signed-in account and all its progress. Resolves 'deleted', or
 * 'cancelled' when the person closed Google's window (nothing was deleted).
 * Throws an Error whose message says what to do.
 */
export const deleteAccount = async (): Promise<'deleted' | 'cancelled'> => {
    if (!cloud) throw new Error('Sign-in is not available right now. Reload the page and try again.');
    if (typeof navigator !== 'undefined' && navigator.onLine === false) throw new Error('You are offline. Connect to the internet and try again.');
    try {
        await (await cloud).deleteAccountAndProgress();
        return 'deleted';
    } catch (error) {
        const code = (error as { code?: string }).code ?? '';
        if (code === 'auth/popup-closed-by-user' || code === 'auth/cancelled-popup-request') return 'cancelled';
        console.error('Could not delete the account:', error);
        if (code === 'auth/popup-blocked') throw new Error('Your browser blocked the Google window. Allow pop-ups for this site and try again.');
        if (code === 'auth/user-mismatch') throw new Error('That was a different Google account. Choose the account you are signed in with.');
        throw new Error('The account could not be deleted. Check your connection and try again.');
    }
};

export const useAccount = (): AccountState =>
    useSyncExternalStore(
        callback => {
            listeners.add(callback);
            return () => listeners.delete(callback);
        },
        () => current,
    );

/**
 * Whether to show progress (streak, XP, ticks, counts). Signed-out visitors
 * only read; their progress starts when they sign in. A build with no sign-in
 * at all ('off') shows the progress kept in the browser.
 */
export const useTracksProgress = (): boolean => {
    const { status } = useAccount();
    return status === 'signed-in' || status === 'off';
};
