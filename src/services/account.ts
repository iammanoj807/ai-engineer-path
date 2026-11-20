// Google sign-in, optional. The site works fully without it: progress is kept
// in the browser. Sign-in only appears when the build has a Firebase project
// (the VITE_FIREBASE_* variables, see README), and then it keeps progress in
// the learner's own account, the same on every device.

import { useSyncExternalStore } from 'react';
import { localBackend, switchBackend } from './progress';

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

const set = (next: AccountState) => {
    current = next;
    listeners.forEach(fn => fn());
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
                set({ status: 'signed-in', name: user.name, photo: user.photo });
            },
            onSignedOut: () => {
                switchBackend(localBackend('guest'));
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

export const useAccount = (): AccountState =>
    useSyncExternalStore(
        callback => {
            listeners.add(callback);
            return () => listeners.delete(callback);
        },
        () => current,
    );
