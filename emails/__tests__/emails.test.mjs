// The email job's rules, its runs (with stand-ins for Firebase and the mail
// server) and the emails' words. No network: run.mjs takes its connections in.

import { describe, expect, it } from 'vitest';
import { MAX_REMINDERS, planEmails } from '../plan.mjs';
import { runEmails } from '../run.mjs';
import { FOUNDER, firstName, progressOf, reminderEmail, testEmails, welcomeEmail } from '../templates.mjs';

const DAY = 24 * 60 * 60 * 1000;
const START = Date.parse('2026-11-22T00:00:00Z');
const day = time => new Date(time).toISOString().slice(0, 10);
const user = (uid, createdAt, extra = {}) => ({ uid, email: `${uid}@example.com`, name: `Learner ${uid}`, createdAt, ...extra });

describe('who gets a welcome', () => {
    const now = START + 3 * DAY;
    const plan = (users, mail = {}) => planEmails({ users, activity: {}, mail, now, start: START, pass: 'welcome' });

    it('welcomes someone who signed up since emails began, once', () => {
        expect(plan([user('new', now - 2 * 60 * 60 * 1000)])).toEqual([{ uid: 'new', kind: 'welcome' }]);
        expect(plan([user('new', now - 2 * 60 * 60 * 1000)], { new: { welcomedAt: now - 1000 } })).toEqual([]);
    });

    it('never welcomes members from before emails began, or accounts more than two days old', () => {
        expect(plan([user('old', START - DAY), user('stale', now - 2.5 * DAY)])).toEqual([]);
    });

    it('skips accounts with no email address, or disabled ones', () => {
        expect(plan([user('none', now - 1000, { email: undefined }), user('off', now - 1000, { disabled: true })])).toEqual([]);
    });
});

describe('who gets a reminder', () => {
    const created = START + DAY;
    const lastDay = START + 10 * DAY;
    const activity = { a: { days: { [day(lastDay)]: 2 } } };
    /** Learners in these tests turned reminders on, unless a test says otherwise. */
    const optedIn = docs => Object.fromEntries(Object.entries(docs).map(([uid, doc]) => [uid, { emails: true, ...doc }]));
    const plan = (now, mail = {}, docs = activity, users = [user('a', created)]) => planEmails({ users, activity: optedIn(docs), mail, now, start: START, pass: 'reminders' });

    it('sends none unless the learner turned reminders on: they are off by default', () => {
        const off = planEmails({ users: [user('a', created)], activity: { a: { days: { [day(lastDay)]: 2 } } }, mail: {}, now: lastDay + 8 * DAY, start: START, pass: 'reminders' });
        expect(off).toEqual([]);
    });

    it('reminds after 7 days without learning, not after 6', () => {
        expect(plan(lastDay + 6 * DAY)).toEqual([]);
        expect(plan(lastDay + 7 * DAY)).toMatchObject([{ uid: 'a', kind: 'reminder', number: 1 }]);
    });

    it('counts any learning: ticks, practice XP, or a visit', () => {
        expect(plan(lastDay + 7 * DAY, {}, { a: { days: { [day(lastDay)]: 1 }, xp: { [day(lastDay + 3 * DAY)]: 12 } } })).toEqual([]);
        expect(plan(lastDay + 7 * DAY, {}, { a: { days: { [day(lastDay)]: 1 }, lastSeen: day(lastDay + 2 * DAY) } })).toEqual([]);
    });

    it('never reminds anyone who turned reminders off', () => {
        expect(plan(lastDay + 8 * DAY, {}, { a: { ...activity.a, emails: false } })).toEqual([]);
    });

    it('waits a week between reminders, stops after the last one, and starts again when they come back', () => {
        const [first] = plan(lastDay + 7 * DAY);
        const log = number => ({ a: { reminders: { count: number, lastAt: lastDay + (7 * number) * DAY, activeAt: first.activeAt } } });
        expect(plan(lastDay + 10 * DAY, log(1))).toEqual([]);
        expect(plan(lastDay + 14 * DAY, log(1))).toMatchObject([{ number: 2 }]);
        expect(plan(lastDay + 50 * DAY, log(MAX_REMINDERS))).toEqual([]);
        // Back for a day, then away a week: reminders start again from the first.
        const back = { a: { days: { [day(lastDay + 40 * DAY)]: 1 } } };
        expect(plan(lastDay + 47 * DAY, log(MAX_REMINDERS), back)).toMatchObject([{ number: 1 }]);
    });

    it('a new account that turned reminders on and never came back is reminded a week after joining', () => {
        expect(plan(created + 7 * DAY, {}, { a: {} })).toMatchObject([{ uid: 'a', number: 1 }]);
    });

    it('leaves alone members who have not been back since emails began', () => {
        const old = [user('b', START - 90 * DAY)];
        expect(plan(START + 20 * DAY, {}, { b: { days: { [day(START - 30 * DAY)]: 3 } } }, old)).toEqual([]);
        // Once they come back after the start, they are treated like everyone else.
        expect(plan(START + 20 * DAY, {}, { b: { days: { [day(START + 5 * DAY)]: 3 } } }, old)).toMatchObject([{ uid: 'b', number: 1 }]);
    });
});

/** A stand-in for Firebase, holding everything in memory. */
const fakeStore = ({ users, activity = {}, mail = {} }) => ({
    mail,
    listUsers: async () => users,
    readActivity: async uids => Object.fromEntries(uids.map(uid => [uid, activity[uid]])),
    readMail: async uids => Object.fromEntries(uids.map(uid => [uid, mail[uid]])),
    writeMail: async (uid, data) => {
        mail[uid] = { ...mail[uid], ...data };
    },
    mailUids: async () => Object.keys(mail),
    deleteMail: async uid => {
        delete mail[uid];
    },
});

describe('a run of the job', () => {
    const now = START + 3 * DAY;
    const users = [user('ann', now - 3600_000, { name: 'Ann Lee' }), user('bob', now - 7200_000, { name: 'Bob Kay' })];

    it('a dry run sends and records nothing, and its log has no names or addresses', async () => {
        const store = fakeStore({ users });
        const lines = [];
        const sent = [];
        const result = await runEmails({ store, mailer: { send: async m => sent.push(m) }, pass: 'welcome', now, start: START, live: false, log: line => lines.push(line) });
        expect(result.actions).toHaveLength(2);
        expect(sent).toEqual([]);
        expect(store.mail).toEqual({});
        expect(lines.join('\n')).not.toMatch(/example\.com|Ann|Bob|Lee|Kay/);
    });

    it('sends each welcome once, even when the job runs again', async () => {
        const store = fakeStore({ users });
        const sent = [];
        const mailer = { send: async message => sent.push(message) };
        await runEmails({ store, mailer, pass: 'welcome', now, start: START, live: true, log: () => {} });
        await runEmails({ store, mailer, pass: 'welcome', now: now + 3600_000, start: START, live: true, log: () => {} });
        expect(sent.map(m => [m.to, m.subject])).toEqual([
            ['ann@example.com', 'Welcome to AI Engineer Path, Ann'],
            ['bob@example.com', 'Welcome to AI Engineer Path, Bob'],
        ]);
    });

    it('one failed email does not stop the rest, and is tried again next time', async () => {
        const store = fakeStore({ users });
        const sent = [];
        const lines = [];
        const mailer = {
            send: async message => {
                if (message.to.startsWith('ann')) throw Object.assign(new Error('550 ann@example.com rejected'), { responseCode: 550 });
                sent.push(message.to);
            },
        };
        const result = await runEmails({ store, mailer, pass: 'welcome', now, start: START, live: true, log: line => lines.push(line) });
        expect(result).toMatchObject({ sent: 1, failed: 1 });
        expect(sent).toEqual(['bob@example.com']);
        expect(store.mail.ann).toBeUndefined();
        expect(lines.join('\n')).toContain('550');
        expect(lines.join('\n')).not.toContain('example.com');
    });

    it('forgets the mail log of deleted accounts', async () => {
        const store = fakeStore({ users, mail: { gone: { welcomedAt: 1 }, ann: { welcomedAt: 1 } } });
        const result = await runEmails({ store, mailer: { send: async () => {} }, pass: 'reminders', now, start: START, live: true, log: () => {} });
        expect(result.forgotten).toBe(1);
        expect(Object.keys(store.mail)).toEqual(['ann']);
    });
});

describe('a test send', () => {
    it('is every email once, greeting the founder, marked as a test', () => {
        const emails = testEmails();
        expect(emails).toHaveLength(5);
        expect(emails.every(email => email.subject.startsWith('[Test] '))).toBe(true);
        expect(emails[0].text).toMatch(new RegExp(`^Hi ${FOUNDER},`));
    });
});

describe('the emails', () => {
    it('greet by first name, and fall back to "there"', () => {
        expect(firstName('Manoj Kumar Thapa')).toBe('Manoj');
        expect(firstName(undefined)).toBe('there');
        expect(firstName('   ')).toBe('there');
    });

    it('never let a name break the email: HTML is escaped, and the subject has no line breaks', () => {
        const email = welcomeEmail({ name: '<b>Eve</b>\r\nBcc: x@y.z' });
        expect(email.html).not.toContain('<b>Eve</b>');
        expect(email.html).toContain('&lt;b&gt;Eve&lt;/b&gt;');
        expect(email.subject).not.toMatch(/[\r\n]/);
    });

    it('every reminder links to turning reminders off, and the welcome says how to turn them on', () => {
        for (const email of [1, 2, 3, 4].map(number => reminderEmail({ name: 'Ann', number }))) {
            expect(email.html).toContain('https://learn.hamropedia.com/?emails=off');
            expect(email.text).toContain('https://learn.hamropedia.com/?emails=off');
        }
        const welcome = welcomeEmail({ name: 'Ann' });
        expect(welcome.text).toContain('Turn on Reminder emails in your account menu');
        expect(welcome.html).toContain('<b>Reminder emails</b>');
    });

    it('the welcome is a personal note from the founder, who invites a reply', () => {
        const email = welcomeEmail({ name: 'Ann Lee' });
        expect(email.text).toMatch(/^Hi Ann,/);
        expect(email.text).toContain(`I'm ${FOUNDER}, the founder of Hamropedia`);
        expect(email.text).toContain('Just reply to this email');
        expect(email.html).toContain('Founder, Hamropedia');
    });

    it('a reminder shows the learner their own progress: XP, the streak to restart, and the next lesson', () => {
        const progress = { xp: 145, streak: 4, next: { name: 'Gradient descent and the learning rate', course: 'ML Foundations', path: '/foundations/gradient-descent-and-the-learning-rate/' } };
        const email = reminderEmail({ name: 'Ann', number: 1, progress });
        expect(email.subject).toBe('Ann, your next lesson is waiting: Gradient descent and the learning rate');
        expect(email.html).toContain('145 XP');
        expect(email.html).toContain('You had a 4-day streak going');
        expect(email.html).toContain('href="https://learn.hamropedia.com/foundations/gradient-descent-and-the-learning-rate/"');
        expect(email.text).toContain('Up next in ML Foundations: Gradient descent and the learning rate');
        // With no summary yet, it still reads well.
        expect(reminderEmail({ name: 'Ann', number: 1 }).text).toContain('tap the lesson marked START');
    });

    it("never trusts the learner's summary blindly: odd numbers become 0, and links stay on the site", () => {
        expect(progressOf({ xp: 'lots', streak: -3 })).toEqual({ xp: 0, streak: 0, next: null });
        expect(progressOf({ xp: 10, streak: 1, next: { name: 'X', course: 'SQL', path: 'https://evil.example/' } }).next).toBeNull();
        expect(progressOf({ xp: 10, streak: 1, next: { name: 'X', course: 'SQL', path: '/sql/../../x/' } }).next).toBeNull();
        expect(progressOf({ xp: 10, streak: 1, next: { name: '<b>X</b>', course: 'SQL', path: '/sql/joins/' } }).next.url).toBe('https://learn.hamropedia.com/sql/joins/');
        const email = reminderEmail({ name: 'Ann', number: 2, progress: { xp: 5, streak: 0, next: { name: '<img src=x>', course: 'SQL', path: '/sql/joins/' } } });
        expect(email.html).not.toContain('<img src=x>');
        expect(email.html).not.toContain('streak going');
    });

    it('the four reminders differ, and the last says it is the last', () => {
        const subjects = [1, 2, 3, 4].map(number => reminderEmail({ name: 'Ann', number }).subject);
        expect(new Set(subjects).size).toBe(4);
        expect(reminderEmail({ name: 'Ann', number: 4 }).text).toContain('last reminder');
    });
});
