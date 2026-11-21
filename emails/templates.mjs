// The emails themselves: a welcome note from the founder, and four reminders
// that each say it a little differently (the fourth says it is the last).
// Every email has a plain text version, the learner's first name, and a link
// to turn reminders off. To change the words, edit them here.

export const SITE = 'https://learn.hamropedia.com';
/** Who the emails are from, by first name. */
export const FOUNDER = 'Manoj';
const REPO = 'https://github.com/iammanoj807/ai-engineer-path';
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
        `<p style="margin:0 0 16px;font-size:20px;font-weight:800">Hi ${escape(first)},</p>
<p style="margin:0 0 14px">I'm ${FOUNDER}, the founder of Hamropedia, and I built AI Engineer Path. Thank you for signing up. It really means a lot that you're here.</p>
<p style="margin:0 0 14px">I made this site because learning AI shouldn't cost a fortune or feel like a maze. Every lesson is free, written in plain words, and set out in an order that makes sense: from your very first idea to the questions interviewers actually ask.</p>
<p style="margin:0 0 8px">Here's how to get the most out of it:</p>
<ol style="margin:0 0 18px;padding-left:22px">
<li style="margin-bottom:8px"><b>One lesson at a time.</b> Open the path and press <b>Start</b> on the lesson marked Up next. Each one has an animation, the idea step by step, and a worked example.</li>
<li style="margin-bottom:8px"><b>Five minutes of practice after each lesson.</b> Pia and Hamish, your guides, ask quick questions and read them aloud. Every right answer earns XP.</li>
<li><b>Come back tomorrow.</b> A few minutes a day beats one long evening a week, and your streak keeps count.</li>
</ol>
<p style="margin:0 0 22px">${button(SITE, 'Start your first lesson')}</p>
<p style="margin:0 0 6px">Three courses, all free:</p>
<p style="margin:0 0 18px"><a href="${SITE}/foundations/">ML Foundations</a> · <a href="${SITE}/sql/">SQL</a> · <a href="${SITE}/system-design/">System Design</a></p>
<p style="margin:0 0 18px">One more thing: I'd love to hear from you. What do you want to learn, and what made you start? Just reply to this email. I read every message.</p>
<p style="margin:0 0 18px">Happy learning,<br><b>${FOUNDER}</b><br><span style="color:#6b7280">Founder, Hamropedia · AI Engineer Path</span></p>
<p style="margin:0 0 4px;font-size:14px;color:#4b5563">P.S. If the site helps you, a star on <a href="${REPO}">GitHub</a> helps other learners find it too.</p>`,
        `A quick hello from ${FOUNDER}, and how to get the most from your path.`,
    );
    const text = `Hi ${first},

I'm ${FOUNDER}, the founder of Hamropedia, and I built AI Engineer Path. Thank you for signing up. It really means a lot that you're here.

I made this site because learning AI shouldn't cost a fortune or feel like a maze. Every lesson is free, written in plain words, and set out in an order that makes sense: from your very first idea to the questions interviewers actually ask.

Here's how to get the most out of it:

1. One lesson at a time. Open the path and press Start on the lesson marked Up next. Each one has an animation, the idea step by step, and a worked example.
2. Five minutes of practice after each lesson. Pia and Hamish, your guides, ask quick questions and read them aloud. Every right answer earns XP.
3. Come back tomorrow. A few minutes a day beats one long evening a week, and your streak keeps count.

Start your first lesson: ${SITE}

Three courses, all free:
ML Foundations: ${SITE}/foundations/
SQL: ${SITE}/sql/
System Design: ${SITE}/system-design/

One more thing: I'd love to hear from you. What do you want to learn, and what made you start? Just reply to this email. I read every message.

Happy learning,
${FOUNDER}
Founder, Hamropedia · AI Engineer Path

P.S. If the site helps you, a star on GitHub helps other learners find it too: ${REPO}${footerText}`;
    return { subject: subjectLine(`Welcome to AI Engineer Path, ${first}`), html, text };
};

const REMINDERS = [
    { subject: first => `${first}, your next lesson is waiting`, line: "It's been a week since your last lesson. Five minutes today is enough to keep going." },
    { subject: first => `Five minutes today, ${first}?`, line: 'A short lesson or one practice round keeps what you learned fresh. Your path is right where you left it.' },
    { subject: first => `Pia and Hamish miss you, ${first}`, line: 'Your guides have a few quick questions ready for you. Pick up where you left off, one small step at a time.' },
    { subject: first => `Still learning AI, ${first}? Here's your next step`, line: "This is our last reminder for now: we won't email again unless you come back. Your progress is saved whenever you're ready." },
];

/** Every email once, addressed to the founder and marked as a test: to see them in a real inbox. */
export const testEmails = () =>
    [welcomeEmail({ name: FOUNDER }), ...[1, 2, 3, 4].map(number => reminderEmail({ name: FOUNDER, number }))].map(email => ({ ...email, subject: `[Test] ${email.subject}` }));

/** Reminder number 1 to 4. */
export const reminderEmail = ({ name, number }) => {
    const first = firstName(name);
    const reminder = REMINDERS[Math.min(Math.max(number, 1), REMINDERS.length) - 1];
    const html = page(
        `<p style="margin:0 0 14px;font-size:20px;font-weight:800">Hi ${escape(first)},</p>
<p style="margin:0 0 14px">${escape(reminder.line)}</p>
<p style="margin:0 0 22px">Open the path and press <b>Start</b> on the lesson marked Up next.</p>
<p style="margin:0 0 22px">${button(SITE, 'Continue learning')}</p>
<p style="margin:0 0 4px">See you there,<br><b>${FOUNDER}</b><br><span style="color:#6b7280">Founder, Hamropedia · AI Engineer Path</span></p>`,
        reminder.line,
    );
    const text = `Hi ${first},

${reminder.line}

Open the path and press Start on the lesson marked Up next: ${SITE}

See you there,
${FOUNDER}
Founder, Hamropedia · AI Engineer Path${footerText}`;
    return { subject: subjectLine(reminder.subject(first)), html, text };
};
