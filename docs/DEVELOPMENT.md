# Developer notes

How to run, build and deploy the site, for anyone working on it or forking it. The learning path itself is described in the [README](../README.md).

## Run it locally

```bash
npm install
npm run dev        # http://localhost:5173/
npm test           # lesson, animation, glossary and answer checks
npm run build      # regenerates the path index and lessons/, type-checks, builds to dist/
```

`src/game/pathIndex.json` is a small index of topic names that the home page uses, so the first visit doesn't download every lesson. `npm run build` regenerates it, and a test fails if it is out of date (`npm run path-index` to fix).

Every lesson has its own address, such as `/sql/group-by-one-result-row-per-group/` (`src/game/addresses.ts`). The same `npm run path-index` gives each new lesson its address in `src/game/lessonSlugs.json`, made from its name the first time. Commit that file, and never edit an address in it: renaming a lesson keeps the old address, so links and search results keep working.

## The lessons as Markdown

Every lesson is also a Markdown page in [`lessons/`](../lessons/README.md), so the whole course can be read on GitHub. The pages are written from the lesson data, never by hand:

```bash
npm run lessons    # rewrites lessons/ from src/data (npm run build does this too)
```

A test fails when a page is out of date, so run it after changing a lesson and commit the result. The pages hold everything except what needs the site: the animation, the practice game and the tap-to-explain words. The code is in `src/game/lessonBook.ts`.

## Where progress is saved

- **Reading is open to everyone.** Every lesson, animation, exercise answer and interview question works without an account, and SQL runs in the page.
- **Tracking progress needs Google sign-in.** Streak, XP, daily goal and progress counts appear once you sign in. Ticking a check asks you to sign in first; the tick you made is saved as soon as you have. Progress, XP and streak live in your own account, so your phone and laptop show the same thing. Nobody else can see them.
- A fork built without a Firebase project has no sign-in, and keeps progress in the browser instead.

## Deploy to GitHub Pages

1. Push to `main` on GitHub.
2. In the repo: **Settings → Pages → Source: GitHub Actions**.
3. `.github/workflows/deploy.yml` runs the tests, builds and publishes on every push to `main`.

The site is served at its own domain, **learn.hamropedia.com**: a DNS `CNAME` record (`learn` → `iammanoj807.github.io`) at the domain's DNS host, plus the custom domain in **Settings → Pages**. Old `iammanoj807.github.io/ai-engineer-path/` links are forwarded to the custom domain by GitHub, and old `/#/sql?topic=…` links are moved to the lesson's own address when the page opens.

GitHub Pages has no fallback for unknown paths, so the build writes a real HTML page for every address (`vite.config.ts`): the home page, each course, unit guide and lesson, with its own title, description, canonical address and text. Search engines read those pages, and the app takes over once it loads. The build also writes `sitemap.xml`, `robots.txt` and a `404.html`. The page text comes from `npm run site-pages` (run by `npm run build`), which leaves out practice answers and SQL solutions, as the site does.

If you change the custom domain, run the deploy workflow again afterwards: until a new deploy, GitHub can keep answering "Site not found" to browsers.

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

## The guides' voices

Ada and Alan say every practice line out loud, and their mouths move in step. The lines are recorded ahead of time with [Kokoro](https://github.com/thewh1teagle/kokoro-onnx), a free open-source voice model (Apache-2.0), into `public/voice/`: one small MP3 per line, and `manifest.json` with each line's mouth shapes. The voices are set in `scripts/voice/lines.ts` (`VOICE_MODELS`).

After lessons change, see what needs recording, then record it:

```bash
npx vite-node scripts/voice/lines.ts                              # writes every line to generated/voice-lines.json, and says how many need recording
.voice/bin/python scripts/voice/record.py --model .voice/model    # records them
```

Only new lines are recorded, and lines whose spoken words have changed; recordings that no line uses are deleted. `scripts/voice/said.json` keeps the words each recording was made from, which is how a change is noticed. Commit it together with `public/voice/`.

Set up once (it needs [uv](https://docs.astral.sh/uv/) and ffmpeg; the folder is git-ignored and takes about 500 MB):

```bash
uv venv --python 3.12 .voice                                      # kokoro-onnx needs Python 3.10 to 3.13
uv pip install --python .voice/bin/python kokoro-onnx soundfile numpy
mkdir -p .voice/model
for f in kokoro-v1.0.onnx voices-v1.0.bin; do
  curl -L --fail -o .voice/model/$f https://github.com/thewh1teagle/kokoro-onnx/releases/download/model-files-v1.0/$f
done
```

A line that has no recording yet is still spoken, by the device's own voice, but only in a voice of the guide's gender.

### How a line is said

A line is not read exactly as it is written. `spokenForm` in `scripts/voice/lines.ts` turns symbols into words ("x²" is said "x squared", "`COUNT(*)`" is "count star"), and replaces code that can't be read aloud with a short invitation to work it out. The voice model also gets some names wrong, so the `SOUNDS_LIKE` table there respells them the way they sound: "vs" as "versus", "Redis" as "reddiss", "VAEs" as "V eh Es".

You can see how the model will say something without listening to it. Ask for its sounds (phonemes):

```bash
.voice/bin/python -c "
from kokoro_onnx import Kokoro
k = Kokoro('.voice/model/kokoro-v1.0.onnx', '.voice/model/voices-v1.0.bin')
print(k.tokenizer.phonemize('Why use RAG instead of fine-tuning?', 'en-us'))"
```

Check the whole sentence, not the word alone. By itself "RAG" comes out as "rag", but inside that sentence the model spells it out, R, A, G, which is why the table writes it in lower case. Try a respelling the same way before you add it.

## Welcome and reminder emails

Signed-in learners get a welcome email, and a reminder when they have been away a week. A scheduled GitHub Action sends them, and it stays off until it is set up: see [emails/README.md](../emails/README.md).

## Stack

React 19 · TypeScript · Vite · MUI · Mermaid · sql.js (SQLite in WebAssembly) · Firebase Auth and Firestore (optional) · GitHub Pages
