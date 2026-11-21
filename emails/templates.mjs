// The emails themselves: a welcome, and four reminders that each say it a
// little differently (the fourth says it is the last). Every email has a plain
// text version, the learner's first name, and a link to turn reminders off.

export const SITE = 'https://learn.hamropedia.com';
const OFF = `${SITE}/?emails=off`;

const escape = text => String(text).replace(/[&<>"']/g, ch => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[ch]);

/** "Manoj Kumar Thapa" → "Manoj". Anything odd → "there" ("Hi there"). */
export const firstName = name => {
    const first = String(name ?? '').replace(/[\r\n\t]/g, ' ').trim().split(/\s+/)[0] ?? '';
    return first && first.length <= 40 ? first : 'there';
};

/** Subjects never carry line breaks (they could add mail headers). */
const subjectLine = text => text.replace(/[\r\n]+/g, ' ').trim();

const button = (href, label) =>
    `<a href="${href}" style="display:inline-block;background:#2979ff;color:#ffffff;text-decoration:none;font-weight:700;padding:12px 22px;border-radius:10px">${escape(label)}</a>`;

const page = (bodyHtml, preview) => `<!doctype html>
<html><body style="margin:0;background:#f4f5f8;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;color:#1d2330">
<span style="display:none;max-height:0;overflow:hidden">${escape(preview)}</span>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f4f5f8"><tr><td align="center" style="padding:24px 12px">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:560px;background:#ffffff;border-radius:14px;overflow:hidden">
<tr><td><a href="${SITE}"><img src="${SITE}/og.png" width="560" alt="AI Engineer Path: learn ML, SQL and system design, one step at a time" style="display:block;width:100%;height:auto;border:0"></a></td></tr>
<tr><td style="padding:26px 28px 8px;font-size:16px;line-height:1.6">${bodyHtml}</td></tr>
<tr><td style="padding:18px 28px 26px;font-size:12px;line-height:1.5;color:#6b7280;border-top:1px solid #eceef2">
You're getting this because you signed in to <a href="${SITE}" style="color:#6b7280">learn.hamropedia.com</a> with Google.
Don't want reminders? <a href="${OFF}" style="color:#6b7280">Turn them off</a>.
</td></tr>
</table></td></tr></table></body></html>`;

const footerText = `\n\n--\nYou're getting this because you signed in to learn.hamropedia.com with Google.\nDon't want reminders? Turn them off: ${OFF}\n`;

export const welcomeEmail = ({ name }) => {
    const first = firstName(name);
    const html = page(
        `<p style="margin:0 0 14px;font-size:20px;font-weight:800">Welcome, ${escape(first)}!</p>
<p style="margin:0 0 14px">You're in. Your progress now saves to your account, so your phone and your laptop show the same path.</p>
<p style="margin:0 0 8px">Here's how to get going:</p>
<ol style="margin:0 0 18px;padding-left:22px">
<li style="margin-bottom:6px"><b>Open the path</b> and press <b>Start</b> on the lesson marked Up next.</li>
<li style="margin-bottom:6px"><b>Practise for five minutes</b> after each lesson. Pia and Hamish, your guides, ask quick questions and read them aloud.</li>
<li><b>Keep a streak:</b> a few minutes a day adds up fast.</li>
</ol>
<p style="margin:0 0 22px">${button(SITE, 'Start your first lesson')}</p>
<p style="margin:0 0 6px">Three courses, all free:</p>
<p style="margin:0 0 18px"><a href="${SITE}/foundations/">ML Foundations</a> · <a href="${SITE}/sql/">SQL</a> · <a href="${SITE}/system-design/">System Design</a></p>
<p style="margin:0 0 4px">Happy learning,<br>Pia, Hamish and the AI Engineer Path team</p>`,
        'Your path to becoming an AI engineer starts here.',
    );
    const text = `Welcome, ${first}!

You're in. Your progress now saves to your account, so your phone and your laptop show the same path.

Here's how to get going:
1. Open the path and press Start on the lesson marked Up next.
2. Practise for five minutes after each lesson. Pia and Hamish, your guides, ask quick questions and read them aloud.
3. Keep a streak: a few minutes a day adds up fast.

Start your first lesson: ${SITE}

Three courses, all free:
ML Foundations: ${SITE}/foundations/
SQL: ${SITE}/sql/
System Design: ${SITE}/system-design/

Happy learning,
Pia, Hamish and the AI Engineer Path team${footerText}`;
    return { subject: subjectLine(`Welcome to AI Engineer Path, ${first}!`), html, text };
};

const REMINDERS = [
    { subject: first => `${first}, your next lesson is waiting`, line: "It's been a week since your last lesson. Five minutes today is enough to keep going." },
    { subject: first => `Five minutes today, ${first}?`, line: 'A short lesson or one practice round keeps what you learned fresh. Your path is right where you left it.' },
    { subject: first => `Pia and Hamish miss you, ${first}`, line: 'Your guides have a few quick questions ready for you. Pick up where you left off, one small step at a time.' },
    { subject: first => `Still learning AI, ${first}? Here's your next step`, line: "This is our last reminder for now: we won't email again unless you come back. Your progress is saved whenever you're ready." },
];

/** Reminder number 1 to 4. */
export const reminderEmail = ({ name, number }) => {
    const first = firstName(name);
    const reminder = REMINDERS[Math.min(Math.max(number, 1), REMINDERS.length) - 1];
    const html = page(
        `<p style="margin:0 0 14px;font-size:20px;font-weight:800">Hi ${escape(first)},</p>
<p style="margin:0 0 14px">${escape(reminder.line)}</p>
<p style="margin:0 0 22px">Open the path and press <b>Start</b> on the lesson marked Up next.</p>
<p style="margin:0 0 22px">${button(SITE, 'Continue learning')}</p>
<p style="margin:0 0 4px">See you there,<br>Pia, Hamish and the AI Engineer Path team</p>`,
        reminder.line,
    );
    const text = `Hi ${first},

${reminder.line}

Open the path and press Start on the lesson marked Up next: ${SITE}

See you there,
Pia, Hamish and the AI Engineer Path team${footerText}`;
    return { subject: subjectLine(reminder.subject(first)), html, text };
};
