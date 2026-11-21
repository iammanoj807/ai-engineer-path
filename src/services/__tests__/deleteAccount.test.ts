// Deleting an account: Google confirms it's the person first, and if they
// close that window nothing is deleted. Then every progress document goes,
// then the account itself. Firebase is replaced by stand-ins that record calls.

import { beforeEach, describe, expect, it, vi } from 'vitest';

const calls: string[] = [];
const user = { uid: 'learner-1' };
let reauth: () => Promise<void> = async () => {};

vi.mock('../progress', () => ({
    DELETE: Symbol('delete'),
    DOC_NAMES: ['foundations', 'system_design', 'sql', 'sql_queries', 'activity'],
    clearGuestData: () => {},
    readGuestData: () => ({}),
}));
vi.mock('firebase/app', () => ({ initializeApp: () => ({}) }));
vi.mock('firebase/auth', () => ({
    GoogleAuthProvider: class {},
    getAuth: () => ({ currentUser: user }),
    onAuthStateChanged: () => {},
    signInWithPopup: async () => {},
    signOut: async () => {},
    reauthenticateWithPopup: async () => {
        calls.push('confirm with Google');
        await reauth();
    },
    deleteUser: async (who: { uid: string }) => {
        calls.push(`delete account ${who.uid}`);
    },
}));
vi.mock('firebase/firestore', () => ({
    deleteField: () => null,
    doc: (_db: unknown, ...path: string[]) => path.join('/'),
    getDoc: async () => ({ data: () => undefined }),
    initializeFirestore: () => ({}),
    onSnapshot: () => () => {},
    persistentLocalCache: () => ({}),
    persistentMultipleTabManager: () => ({}),
    setDoc: async () => {},
    writeBatch: () => {
        const deletes: string[] = [];
        return {
            delete: (ref: string) => deletes.push(ref),
            commit: async () => {
                calls.push(`delete ${deletes.join(', ')}`);
            },
        };
    },
}));

const cloud = await import('../cloud');
cloud.watchUser({ apiKey: 'k', authDomain: 'd', projectId: 'p', appId: 'a' }, { onSignedIn: () => {}, onSignedOut: () => {} });

describe('deleting an account', () => {
    beforeEach(() => {
        calls.length = 0;
        reauth = async () => {};
    });

    it('confirms with Google, then deletes every progress document, then the account', async () => {
        await cloud.deleteAccountAndProgress();
        expect(calls).toEqual([
            'confirm with Google',
            'delete users/learner-1/progress/foundations, users/learner-1/progress/system_design, users/learner-1/progress/sql, users/learner-1/progress/sql_queries, users/learner-1/progress/activity',
            'delete account learner-1',
        ]);
    });

    it('deletes nothing when the Google window is closed', async () => {
        reauth = async () => {
            throw Object.assign(new Error('closed'), { code: 'auth/popup-closed-by-user' });
        };
        await expect(cloud.deleteAccountAndProgress()).rejects.toThrow('closed');
        expect(calls).toEqual(['confirm with Google']);
    });
});
