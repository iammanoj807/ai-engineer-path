# Learner emails

Two kinds of email go to learners who sign in with Google:

- **Welcome:** a personal note from Manoj, the founder, within about 15 minutes of signing in for the first time, by first name. It invites a reply.
- **Reminder:** when someone hasn't learned for 7 days, showing their own progress as the site shows it: their XP, the streak to start again, and their next lesson with a button straight to it. Then once a week, at most 4 in a row (the 4th says it's the last). Coming back resets the count. Anyone can turn reminders off from the account menu, or with the link at the bottom of every email.

A scheduled GitHub Action sends them ([`.github/workflows/emails.yml`](../.github/workflows/emails.yml)): every 15 minutes for welcomes, every day at 09:45 UTC for reminders. It's free, and needs no server and no paid Firebase plan.

**It is off until you set it up.** Nothing runs on its schedule until `EMAILS_START` is set, and nothing goes to learners until `EMAILS_LIVE` is `true`. Until then it's a dry run that only counts. A test send (step 4) only ever goes to your own address.

## Set it up

### 1. Choose how to send

Any email service with SMTP works. Two good free options:

| | Gmail | Resend |
|---|---|---|
| Learners see | your Gmail address | an address like `hello@hamropedia.com` |
| Free limit | about 500 a day | 3,000 a month, 100 a day |
| Setup | an app password | add your domain's DNS records |
| `SMTP_HOST` | `smtp.gmail.com` | `smtp.resend.com` |
| `SMTP_PORT` | `465` | `465` |
| `SMTP_USER` | your Gmail address | `resend` |
| `SMTP_PASS` | an [app password](https://myaccount.google.com/apppasswords) (needs 2-Step Verification) | your Resend API key |
| `MAIL_FROM` | `Manoj from Hamropedia <you@gmail.com>` | `Manoj from Hamropedia <hello@hamropedia.com>` |

Gmail is the quickest start. An address on your own domain looks more trustworthy and lands in spam less often.

### 2. Get a Firebase service account key

Firebase console → **Project settings** → **Service accounts** → **Generate new private key**. This downloads a JSON file. It has full access to your project, so never commit it or share it: it goes only into the GitHub secret below. Then delete the downloaded file.

### 3. Add the settings to GitHub

Repository → **Settings** → **Secrets and variables** → **Actions**.

**Secrets** (hidden):

- `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASS`: from step 1
- `EMAILS_TEST_TO`: your own email address, for test sends
- `FIREBASE_SERVICE_ACCOUNT`: the whole JSON file's contents (from step 2)

**Variables:**

- `MAIL_FROM`: from step 1
- `MAIL_REPLY_TO` (optional): where replies go, if not to `MAIL_FROM`. The welcome says "Just reply to this email", so use an inbox you read.
- `EMAILS_START`: when emails begin, as a UTC time, for example `2026-11-22T00:00:00Z`. Only people who sign up after this get a welcome, so existing members aren't all emailed at once. Reminders only go to people who have used the site since this time.
- `EMAILS_LIVE`: leave this out for now.

### 4. Send yourself a test

**Actions** → **Learner emails** → **Run workflow** → `test`. The welcome and all four reminders arrive at `EMAILS_TEST_TO`, marked "[Test]". This needs only the mail settings (step 1), not Firebase, so it's the quickest way to see the emails in a real inbox.

Your own account won't get a welcome from the real run: only people who sign up after `EMAILS_START` do, so existing members (you included) aren't all emailed at once.

### 5. Try a dry run

**Actions** → **Learner emails** → **Run workflow**, once with `welcome` and once with `reminders`. The log shows how many emails it would send. The repository is public, so the log never shows names or addresses: only counts and the first characters of each account id.

### 6. Switch it on

Add the variable `EMAILS_LIVE` = `true`. To test, sign in to the site with a spare Google account: the welcome email arrives within about 15 minutes.

## Good to know

- **To change the wording,** edit [`templates.mjs`](templates.mjs). To change the timing or the limit of 4 reminders, edit the numbers at the top of [`plan.mjs`](plan.mjs). The tests in [`__tests__/`](__tests__/) check every rule: run `npm test` from the repository's root.
- **Where the progress in a reminder comes from:** while a learner uses the site, it keeps a short summary (XP, streak, the lesson marked Up next) in their own progress, so the email says exactly what the site showed them. The job checks it before use: numbers must be numbers, and the lesson link must be a page of the site.
- **What it stores:** a small log per learner at `mail/{uid}` in Firestore (when they were welcomed and reminded), so nobody gets the same email twice. Learners can't read it (the Firestore rules refuse everything outside their own progress). When an account is deleted, its log is removed by the next daily run.
- **GitHub pauses scheduled workflows** in a public repository after 60 days without a commit. If emails stop, open the Actions tab and enable the workflow again.
- **Firestore reads:** the daily reminder run reads 2 documents per account, which fits Firestore's free 50,000 reads a day up to about 25,000 accounts.
