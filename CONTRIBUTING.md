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

## Practice sessions build themselves

The quick practice with Maya and Felix (match the pairs, fill the gap, put the steps in order, spot the mistake, and the SQL cards) is made automatically from what a lesson already has. Nothing is written twice. See `src/practice/build.ts`.

So when you improve a lesson, its practice improves too:

- **Words in the glossary** become match-the-pairs cards and fill-the-gap clues.
- **"How it works" steps** become put-the-steps-in-order cards.
- **Key points and common mistakes** become spot-the-mistake cards.
- **SQL answers with their result rows** become write-the-query and fix-the-query cards.

## Rules the tests check

Run `npm test` before you open a pull request. The tests make sure that:

- every SQL query in a lesson or answer returns exactly the rows written next to it;
- every lesson gets a fair practice session (for example, a clue never gives its answer away);
- every link between lessons points to a page that exists;
- the site's pages, addresses and glossary stay in step with the lessons.

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
