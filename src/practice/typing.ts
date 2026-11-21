// Typing a missing word letter by letter: each letter is checked the moment it
// is typed. Spaces, hyphens and apostrophes are filled in already, so only
// letters and digits are typed. Capitals and accents don't matter.

export interface Slot {
    char: string;
    /** Filled in already (a space, hyphen or apostrophe). */
    given: boolean;
}

const isTyped = (ch: string) => /[\p{L}\p{N}]/u.test(ch);

export const slotsFor = (answer: string): Slot[] => [...answer].map(char => ({ char, given: !isTyped(char) }));

/** A letter as compared: lower case, without accents. */
const plain = (ch: string) => ch.normalize('NFD').replace(/\p{Diacritic}/gu, '').toLowerCase();

export const sameLetter = (typed: string, expected: string) => typed.length === 1 && plain(typed) === plain(expected);

/** The next slot to type into, from `from` on (skipping given ones), or the length when the word is done. */
export const nextSlot = (slots: Slot[], from: number) => {
    let i = from;
    while (i < slots.length && slots[i].given) i++;
    return i;
};

/** A word a learner can type on any keyboard: letters, digits, spaces, hyphens, apostrophes. */
export const isTypable = (answer: string) => /^[\p{L}\p{N}][\p{L}\p{N} '’-]*$/u.test(answer) && [...answer].filter(isTyped).length >= 3;
