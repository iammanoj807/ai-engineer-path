# AI Engineer Path

Learn **ML foundations, SQL and system design** from scratch, one step at a time.
Free, in the browser. Sign in with Google to track your progress.

**Live site:** https://learn.hamropedia.com/

## What's inside

| Course | Topics | What a topic gives you |
|---|---|---|
| ML Foundations | 98 | Maths, classical ML, deep learning, LLMs. Each topic has an animation, the idea step by step, a worked example with code that has been run, and four exercises (Explain · Derive · Build · Break) with answers. |
| SQL | 61 | From the first `SELECT` to window functions and interview problems, with a real SQLite engine in the page to run every query. |
| System Design | 72 | The building blocks (caches, queues, databases, load balancers…), then full designs the way interviews ask them (Explain · Draw · Apply · Trade-offs). |

Each course also has an **Interview questions** mode: full spoken answers, the traps, and follow-ups.

## How it keeps you going

- **A path, not a list.** Each course is drawn as a winding path of units and topics, on the home page and on each course page. The next topic is highlighted with a START button, so there is always one obvious next step. Only the unit you are working on is open, so there is little to scroll; tap another unit to open it. Tap a topic to open its lesson on its own page, with **Back to path** and **Next**; each unit has a **Guide** with its big picture and extra practice.
- **Mastery, not reading.** A topic is mastered when you pass all four checks without notes.
- **XP, streak and a daily goal.** 10 XP per check, 20 more for mastering a topic. Pick a daily goal (1, 3, 5 or 8 checks), and keep your streak by ticking at least one check a day.
- **What's next, and why it matters.** Mastering a topic shows the next one and the problem it solves, with one button to go straight there.

## Where progress is saved

- **Reading is open to everyone.** Every lesson, animation, exercise answer and interview question works without an account, and SQL runs in the page.
- **Tracking progress needs Google sign-in.** Streak, XP, daily goal and progress counts appear once you sign in. Ticking a check asks you to sign in first; the tick you made is saved as soon as you have. Progress, XP and streak live in your own account, so your phone and laptop show the same thing. Nobody else can see them.
- A fork built without a Firebase project has no sign-in, and keeps progress in the browser instead.

## Run it locally

```bash
npm install
npm run dev        # http://localhost:5173/
npm test           # lesson, animation, glossary and answer checks
npm run build      # regenerates the path index, type-checks, builds to dist/
```

`src/game/pathIndex.json` is a small index of topic names that the home page uses, so the first visit doesn't download every lesson. `npm run build` regenerates it, and a test fails if it is out of date (`npm run path-index` to fix).

## Deploy to GitHub Pages

1. Push to `main` on GitHub.
2. In the repo: **Settings → Pages → Source: GitHub Actions**.
3. `.github/workflows/deploy.yml` runs the tests, builds and publishes on every push to `main`.

The site is served at its own domain, **learn.hamropedia.com**: a DNS `CNAME` record (`learn` → `iammanoj807.github.io`) at the domain's DNS host, plus the custom domain in **Settings → Pages**. `vite.config.ts` uses a relative `base: './'`, so the same build also works at `iammanoj807.github.io/ai-engineer-path/`. It uses hash routes (`/#/sql`), because GitHub Pages has no fallback for unknown paths. Old `iammanoj807.github.io/ai-engineer-path/` links are forwarded to the custom domain by GitHub.

## Google sign-in

The live site uses the Firebase project `ai-engineer-path-807` (Auth with Google, and Firestore with `firestore.rules`). Its web config is set as repository variables, so the deploy workflow builds it in. To set up your own project instead (for a fork), follow these steps. Without them the site still works fully and keeps progress in each browser.

1. Create a project at https://console.firebase.google.com (the free Spark plan is enough).
2. **Build → Authentication → Get started → Sign-in method → Google → Enable.**
3. **Authentication → Settings → Authorized domains → Add domain:** the site's domain (here `learn.hamropedia.com`).
4. **Build → Firestore Database → Create database** (production mode).
5. Deploy the rules, so each person can only read and write their own progress:
   ```bash
   npm install -g firebase-tools
   firebase login
   firebase deploy --only firestore:rules --project <your-project-id>
   ```
6. **Project settings → Your apps → Add app → Web.** Copy `apiKey`, `authDomain`, `projectId` and `appId`.
7. In the GitHub repo: **Settings → Secrets and variables → Actions → Variables**. Add `VITE_FIREBASE_API_KEY`, `VITE_FIREBASE_AUTH_DOMAIN`, `VITE_FIREBASE_PROJECT_ID` and `VITE_FIREBASE_APP_ID`.
8. Re-run the deploy workflow. A **Sign in** button appears in the top bar.

For local development, put the same values in `.env.local` (see `.env.example`).

## Stack

React 19 · TypeScript · Vite · MUI · Mermaid · sql.js (SQLite in WebAssembly) · Firebase Auth and Firestore (optional) · GitHub Pages
