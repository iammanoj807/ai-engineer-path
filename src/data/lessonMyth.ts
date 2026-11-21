// A statement that sounds right and is wrong.
//
// Every lesson has at least one. The lesson shows it at the end of "Common
// mistakes", marked "Not true", with what is true straight under it. Practice
// then hides it among the lesson's true key points and asks "Which one is
// false?" (src/practice/build.ts). Because it is written like a key point, it
// can't be picked out by its wording: the learner has to know the lesson.
//
// A lesson whose practice has a second "spot the mistake" card (five or more
// key points, in ML Foundations and System Design) has a second one, about a
// different idea. The first goes with key points 1 to 3, the second with 4 to 6.
//
// Writing one:
//   - a full, confident sentence, like a key point. Never "Forgetting to…" or
//     "Thinking that…": that describes a mistake, and gives itself away;
//   - clearly false, because of something the lesson teaches;
//   - `truth` says what is true instead, in a sentence or two.

export interface LessonMyth {
    /** The false statement, written like a key point. */
    claim: string;
    /** What is true instead. Shown once the learner has answered. */
    truth: string;
}

/** A lesson's false statements as plain text, in pairs: the statement, then what is true. */
export const mythTexts = (myths: LessonMyth[] | undefined): string[] => (myths ?? []).flatMap(myth => [myth.claim, myth.truth]);
