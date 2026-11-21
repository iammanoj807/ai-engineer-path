// One run of the email job: read who to consider, plan (plan.mjs), write each
// email (templates.mjs), send, and note what was sent so nobody gets the same
// email twice. Firebase and the mail server are passed in (send.mjs), so the
// tests run all of this with stand-ins.
//
// The repository is public, and so are its Actions logs: nothing here prints a
// name or an email address. Only counts, and the first characters of an id.

import { WELCOME_WITHIN_DAYS, planEmails } from './plan.mjs';
import { reminderEmail, welcomeEmail } from './templates.mjs';

const DAY = 24 * 60 * 60 * 1000;
const short = uid => `${uid.slice(0, 4)}…`;

/**
 * @param {object} input
 * @param {object} input.store   listUsers, readActivity(uids), readMail(uids), writeMail(uid, data), mailUids, deleteMail(uid)
 * @param {{ send: (message: { to: string, subject: string, html: string, text: string }) => Promise<void> } | null} input.mailer
 * @param {'welcome' | 'reminders'} input.pass
 * @param {number} input.now
 * @param {number} input.start  when emails were switched on
 * @param {boolean} input.live  false: a dry run, which sends and records nothing
 */
export const runEmails = async ({ store, mailer, pass, now, start, live, log = console.log }) => {
    const users = await store.listUsers();
    // The hourly welcome pass only reads the few accounts made in the last days.
    const considered = pass === 'welcome' ? users.filter(user => user.createdAt >= start && now - user.createdAt <= WELCOME_WITHIN_DAYS * DAY) : users;
    const uids = considered.map(user => user.uid);
    const mail = uids.length ? await store.readMail(uids) : {};
    const activity = pass === 'reminders' && uids.length ? await store.readActivity(uids) : {};
    const actions = planEmails({ users: considered, activity, mail, now, start, pass });
    const byUid = new Map(users.map(user => [user.uid, user]));

    let sent = 0;
    let failed = 0;
    for (const action of actions) {
        const user = byUid.get(action.uid);
        const email = action.kind === 'welcome' ? welcomeEmail({ name: user.name }) : reminderEmail({ name: user.name, number: action.number });
        if (!live) continue;
        try {
            await mailer.send({ to: user.email, ...email });
        } catch (error) {
            // Only the error's code: a mail server's message can include the address.
            failed++;
            log(`Could not email ${short(user.uid)}: ${error?.responseCode ?? error?.code ?? 'unknown error'}`);
            continue;
        }
        sent++;
        // Noted straight after sending, so a later failure can't cause a second copy.
        await store.writeMail(user.uid, action.kind === 'welcome' ? { welcomedAt: now } : { reminders: { count: action.number, lastAt: now, activeAt: action.activeAt } });
    }

    const who = actions.map(action => `${short(action.uid)}${action.kind === 'reminder' ? ` #${action.number}` : ''}`).join(', ');
    log(`${pass}: ${considered.length} accounts considered, ${actions.length} to email${who ? ` (${who})` : ''}. ${live ? `Sent ${sent}, failed ${failed}.` : 'Dry run: nothing sent.'}`);

    // Once a day, forget the mail log of deleted accounts, so deleting an account removes everything.
    let forgotten = 0;
    if (pass === 'reminders') {
        const known = new Set(users.map(user => user.uid));
        for (const uid of await store.mailUids()) {
            if (known.has(uid)) continue;
            forgotten++;
            if (live) await store.deleteMail(uid);
        }
        if (forgotten) log(`${live ? 'Removed' : 'Would remove'} the mail log of ${forgotten} deleted account${forgotten === 1 ? '' : 's'}.`);
    }
    return { actions, sent, failed, forgotten };
};
