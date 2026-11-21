// node send.mjs: the email job, as GitHub Actions runs it (.github/workflows/emails.yml).
// Connects run.mjs to Firebase (who signed up, their activity, the mail log)
// and to a mail server (SMTP: Gmail, Resend, Brevo, SendGrid... any of them).
//
// Settings, all from the environment:
//   PASS                      "welcome" (every 15 minutes), "reminders" (daily), or "test":
//                             every email once, to TEST_TO only (no Firebase needed)
//   EMAILS_START              when emails were switched on, e.g. 2026-11-22T00:00:00Z
//   LIVE                      "true" to really send; anything else is a dry run
//   FIREBASE_SERVICE_ACCOUNT  the service account key, as JSON
//   SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS, MAIL_FROM   only needed when LIVE (or a test)
//   MAIL_REPLY_TO             optional: where replies go, if not to MAIL_FROM
//   TEST_TO                   the address a test goes to

import { cert, initializeApp } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';
import { getFirestore } from 'firebase-admin/firestore';
import nodemailer from 'nodemailer';
import { runEmails } from './run.mjs';
import { testEmails } from './templates.mjs';

const env = process.env;
const pass = env.PASS === 'reminders' || env.PASS === 'test' ? env.PASS : 'welcome';
const live = env.LIVE === 'true';
const start = Date.parse(env.EMAILS_START ?? '');

/** The mail server, from the SMTP settings; exits when one is missing. */
const connect = async () => {
    const missing = ['SMTP_HOST', 'SMTP_USER', 'SMTP_PASS', 'MAIL_FROM'].filter(name => !env[name]);
    if (missing.length) {
        console.log(`Not sending: ${missing.join(', ')} ${missing.length === 1 ? 'is' : 'are'} not set.`);
        process.exit(1);
    }
    const port = Number(env.SMTP_PORT || 465);
    const transport = nodemailer.createTransport({ host: env.SMTP_HOST, port, secure: port === 465, auth: { user: env.SMTP_USER, pass: env.SMTP_PASS } });
    await transport.verify();
    return { send: message => transport.sendMail({ from: env.MAIL_FROM, ...(env.MAIL_REPLY_TO ? { replyTo: env.MAIL_REPLY_TO } : {}), ...message }) };
};

// A test: every email once, to your own address, to see them in a real inbox.
if (pass === 'test') {
    if (!env.TEST_TO) {
        console.log('Not sending a test: the EMAILS_TEST_TO secret (your own address) is not set.');
        process.exit(1);
    }
    const mailer = await connect();
    for (const email of testEmails()) await mailer.send({ to: env.TEST_TO, ...email });
    console.log(`Sent ${testEmails().length} test emails: the welcome and the four reminders.`);
    process.exit(0);
}

if (Number.isNaN(start)) {
    console.log('EMAILS_START is not set (for example 2026-11-22T00:00:00Z), so no emails are sent.');
    process.exit(0);
}
if (!env.FIREBASE_SERVICE_ACCOUNT) {
    console.log('The FIREBASE_SERVICE_ACCOUNT secret is not set, so no emails are sent.');
    process.exit(0);
}

const app = initializeApp({ credential: cert(JSON.parse(env.FIREBASE_SERVICE_ACCOUNT)) });
const auth = getAuth(app);
const db = getFirestore(app);

/** Read many documents in batches; missing ones come back undefined. */
const readAll = async refs => {
    const out = {};
    for (let i = 0; i < refs.length; i += 100) {
        const batch = refs.slice(i, i + 100);
        const snaps = await db.getAll(...batch.map(([, ref]) => ref));
        snaps.forEach((snap, j) => {
            out[batch[j][0]] = snap.exists ? snap.data() : undefined;
        });
    }
    return out;
};

const store = {
    async listUsers() {
        const users = [];
        let pageToken;
        do {
            const page = await auth.listUsers(1000, pageToken);
            for (const user of page.users) {
                users.push({ uid: user.uid, email: user.email, name: user.displayName, createdAt: Date.parse(user.metadata.creationTime), disabled: user.disabled });
            }
            pageToken = page.pageToken;
        } while (pageToken);
        return users;
    },
    readActivity: uids => readAll(uids.map(uid => [uid, db.doc(`users/${uid}/progress/activity`)])),
    readMail: uids => readAll(uids.map(uid => [uid, db.doc(`mail/${uid}`)])),
    writeMail: (uid, data) => db.doc(`mail/${uid}`).set(data, { merge: true }),
    mailUids: async () => (await db.collection('mail').select().get()).docs.map(doc => doc.id),
    deleteMail: uid => db.doc(`mail/${uid}`).delete(),
};

const mailer = live ? await connect() : null;

const result = await runEmails({ store, mailer, pass, now: Date.now(), start, live });
process.exit(result.failed > 0 ? 1 : 0);
