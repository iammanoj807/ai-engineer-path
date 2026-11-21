// Firebase: Google sign-in and each learner's progress in Firestore, at
// users/{uid}/progress/{doc}. Loaded only when the build has a Firebase
// project, so guests never download it. firestore.rules lets each signed-in
// person read and write their own documents and nothing else.

import { initializeApp } from 'firebase/app';
import {
    GoogleAuthProvider,
    deleteUser,
    getAuth,
    onAuthStateChanged,
    reauthenticateWithPopup,
    signInWithPopup,
    signOut,
    type Auth,
} from 'firebase/auth';
import {
    deleteField,
    doc,
    getDoc,
    initializeFirestore,
    onSnapshot,
    persistentLocalCache,
    persistentMultipleTabManager,
    setDoc,
    writeBatch,
    type Firestore,
} from 'firebase/firestore';
import type { FirebaseConfig } from './account';
import { DELETE, DOC_NAMES, clearGuestData, readGuestData, type Backend, type DocName, type Patch } from './progress';

let auth: Auth | null = null;
let db: Firestore | null = null;

const progressDoc = (uid: string, name: DocName) => doc(db!, 'users', uid, 'progress', name);

/** DELETE markers become Firestore's deleteField(). */
const toFirestore = (patch: Patch): Record<string, unknown> =>
    Object.fromEntries(Object.entries(patch).map(([key, value]) => [
        key,
        value === DELETE
            ? deleteField()
            : value && typeof value === 'object' && !Array.isArray(value)
                ? toFirestore(value as Patch)
                : value,
    ]));

const cloudBackend = (uid: string): Backend => ({
    listen: (name, onData) =>
        onSnapshot(
            progressDoc(uid, name),
            snap => onData(snap.data() ?? {}),
            error => console.error(`Could not load ${name}:`, error.code, error.message),
        ),
    write: async (name, patch) => {
        await setDoc(progressDoc(uid, name), toFirestore(patch), { merge: true });
    },
});

const onlyTrue = (map: unknown): Record<string, unknown> => {
    const out: Record<string, unknown> = {};
    for (const [key, value] of Object.entries((map ?? {}) as Record<string, unknown>)) {
        if (value === true) out[key] = true;
        else if (value && typeof value === 'object') {
            const inner = onlyTrue(value);
            if (Object.keys(inner).length > 0) out[key] = inner;
        }
    }
    return out;
};

/**
 * Anything ticked before signing in joins the account: ticks are added (never
 * removed), saved queries are kept, and each day's count takes the larger of
 * the two. Then the guest copy in this browser is cleared.
 */
const moveGuestProgress = async (uid: string) => {
    const guest = readGuestData();
    const writes: Promise<unknown>[] = [];
    for (const name of DOC_NAMES) {
        const data = guest[name] ?? {};
        let patch: Record<string, unknown> = {};
        if (name === 'foundations') patch = { checks: onlyTrue(data.checks), builds: onlyTrue(data.builds) };
        else if (name === 'sql_queries') patch = { queries: data.queries ?? {} };
        else if (name === 'activity') {
            const guestDays = (data.days ?? {}) as Record<string, number>;
            if (Object.keys(guestDays).length === 0) continue;
            const saved = (await getDoc(progressDoc(uid, name))).data()?.days ?? {};
            const days: Record<string, number> = {};
            for (const [day, count] of Object.entries(guestDays)) days[day] = Math.max(count, saved[day] ?? 0);
            patch = { days };
        } else patch = { checks: onlyTrue(data.checks) };
        const empty = Object.values(patch).every(value => Object.keys(value as object).length === 0);
        if (!empty) writes.push(setDoc(progressDoc(uid, name), patch, { merge: true }));
    }
    await Promise.all(writes);
    clearGuestData();
};

export const watchUser = (
    config: FirebaseConfig,
    handlers: {
        onSignedIn: (user: { name?: string; photo?: string }, backend: Backend) => void;
        onSignedOut: () => void;
    },
) => {
    const app = initializeApp(config);
    auth = getAuth(app);
    db = initializeFirestore(app, {
        localCache: persistentLocalCache({ tabManager: persistentMultipleTabManager() }),
    });
    onAuthStateChanged(auth, async user => {
        if (!user) {
            handlers.onSignedOut();
            return;
        }
        try {
            await moveGuestProgress(user.uid);
        } catch (error) {
            // The guest copy stays in this browser and is tried again next sign-in.
            console.error('Could not move guest progress into the account:', error);
        }
        handlers.onSignedIn(
            { name: user.displayName ?? undefined, photo: user.photoURL ?? undefined },
            cloudBackend(user.uid),
        );
    });
};

export const signInWithGoogle = async () => {
    if (!auth) throw new Error('Firebase is not ready');
    await signInWithPopup(auth, new GoogleAuthProvider());
};

export const signOutUser = async () => {
    if (auth) await signOut(auth);
};

/**
 * Delete the account and everything saved in it. Google asks the person to
 * sign in once more first: it confirms it's really them, and Firebase only
 * deletes an account that signed in moments ago. If they close that window,
 * nothing is deleted. Then the progress documents go, then the account.
 */
export const deleteAccountAndProgress = async () => {
    const user = auth?.currentUser;
    if (!auth || !db || !user) throw new Error('Not signed in');
    await reauthenticateWithPopup(user, new GoogleAuthProvider());
    const batch = writeBatch(db);
    for (const name of DOC_NAMES) batch.delete(progressDoc(user.uid, name));
    await batch.commit();
    await deleteUser(user);
};
