# Contributing

Thank you for helping. AI Engineer Path is a free way to learn ML, SQL and system design from scratch, and every fix makes it clearer for the next learner.

## Good first contributions

- **A mistake in a lesson.** A wrong number, a confusing sentence or a broken link. Open an issue with the "Mistake in a lesson" template, or fix it directly.
- **A lesson that was hard to follow.** Tell us which part lost you. Plain words are the goal: short sentences, one idea at a time, an example before the theory.
- **A missing glossary word.** If a word in a lesson needs explaining, add it to the course's glossary (below).

## How the content is organised

| Course | Lessons | Answers | Animations | Glossary |
|---|---|---|---|---|
| ML Foundations | `src/data/foundationsCourse/phaseN.ts` | `src/data/foundationsAnswers/` | `src/data/foundationsAnimations/` | `src/data/foundationsGlossary.ts` |
| SQL | `src/data/sqlCourse/phaseN.ts` | `src/data/sqlAnswers/` | `src/data/sqlAnimations/` | `src/data/sqlGlossary.ts` |
| System Design | `src/data/systemDesign.ts` | `src/data/systemDesignAnswers/` | `src/data/systemDesignAnimations/` | `src/data/systemDesignGlossary.ts` |

Each file is plain TypeScript data. The comments at the top of `src/data/foundations.ts`, `src/data/sql.ts` and `src/data/systemDesign.ts` describe every field.

The Markdown pages in `lessons/` are written from these files. Don't edit them by hand: change the lesson, then run `npm run lessons`.

## Adding to a lesson, or adding a lesson

- **A derivation.** An ML lesson can have an optional `deeper` block ("Go deeper"): a title, four to seven small steps, and the result. Use it for the proof the lesson states but does not show.
- **A new lesson** needs the lesson itself (with its one false statement, see below), one answer for each of its four exercises, an animation, and glossary entries for the words it teaches. A SQL interview problem has a solution walk-through instead (`src/data/sqlAnimations/phase8.ts`), shown only once the solution is open. Code in a lesson or an answer must have been run, with the numbers it printed. Then run `npm run path-index` (it gives the lesson its address) and `npm run lessons`. The tests tell you what is missing.

## Practice sessions build themselves

The quick practice with Ada and Alan (match the pairs, fill the gap, put the steps in order, spot the mistake, and the SQL cards) is made automatically from what a lesson already has. Nothing is written twice. See `src/practice/build.ts`.

So when you improve a lesson, its practice improves too:

- **Words in the glossary** become match-the-pairs cards and fill-the-gap clues.
- **"How it works" steps** become put-the-steps-in-order cards.
- **Key points and the lesson's false statements** become spot-the-mistake cards, together with the sentences of the one-line definition. Each one is shown on its own, so write it so that it makes sense alone, and say what a formula's letters stand for.
- **Common mistakes** are read in the lesson and in "Learn it step by step". They are not quizzed, because "Forgetting to…" gives itself away. Still say why each one is a mistake.

## Every lesson has a false statement

A lesson's `myths` holds one or two statements that sound right and are wrong, each with what is true instead:

```ts
myths: [
    {
        claim: 'A convex function always has exactly one point where it is lowest.',
        truth: 'It has one lowest value, but that value can be reached along a whole flat stretch: many minimisers, all equally good.',
    },
],
```

The lesson shows each one at the end of "Common mistakes", marked **Not true**, with the truth under it. Practice then hides it among three true key points and asks "Which one is false?". The first statement goes with the lesson's first three key points. In ML Foundations and System Design, a lesson with five or more key points gets a second card, so it needs a second statement about a different idea (the tests say when one is missing). For the question to be fair:

- **Write the claim like a key point:** 20 to 170 characters. Not "Forgetting to…" or "Thinking that…", which describes a mistake and gives itself away.
- **Match the look of the key points beside it.** If the lesson's key points are notes ("Cache: fast memory holding copies…", a formula, a list with semicolons), write the claim as a note too: "Source of truth: the cache, since reads go there first." If they are plain sentences, write a plain sentence. A claim that is the only sentence among notes can be found without knowing the lesson, and the tests reject it.
- **Avoid sweeping words** such as "always", "never", "every", "any" and "only". Test-wise readers distrust them. Say something specific instead: not "an index always makes a join faster" but "an index speeds up a hash join over whole tables".
- **It must be false because of something the lesson teaches.** A learner who has understood the lesson can tell; nobody should need outside knowledge.
- **The truth says what is right, and why,** in a sentence or two. Use only words the lesson has already taught.
- A claim that mirrors a mistake people really make is the most useful kind.
- **SQL answers with their result rows** become write-the-query and fix-the-query cards.

## Glossary words with more than one meaning

A glossary word is underlined wherever its spelling appears, and it can become a practice card in that lesson. So a spelling must mean the same thing everywhere it matches:

- **Don't list an everyday word as a spelling.** "means", "judge" or "mask" would be underlined in lessons that are about something else.
- **Two technical meanings? Say both in the definition.** "kernel" is a similarity function in SVMs, a filter in CNNs and a small program on a GPU.
- **A lesson uses the word in its everyday sense? Name the lesson in `plainIn`.** "Tomorrow's temperature" is not the sampling temperature, so `temperature` has `plainIn: ['f0-t6', 'f2-t2']` and stays plain text there.

## Rules the tests check

Run `npm test` before you open a pull request. The tests make sure that:

- every SQL query in a lesson or answer returns exactly the rows written next to it;
- every lesson gets a fair practice session (for example, a clue never gives its answer away, and is never cut short);
- glossary words are not underlined where they are everyday words;
- every link between lessons points to a page that exists;
- the site's pages, addresses and glossary stay in step with the lessons;
- the Markdown pages in `lessons/` and the lesson counts in the README are up to date.

## Run it locally

```bash
npm install
npm run dev     # http://localhost:5173/
npm test
npm run lint
```

More detail on building and deploying: [docs/DEVELOPMENT.md](docs/DEVELOPMENT.md).

## Style

- Plain English, for someone new to the subject.
- One idea per sentence where possible.
- Call the parts of a course "units" and the topics "lessons".
- No content copied from elsewhere: write it in your own words, and link to good free resources instead.
