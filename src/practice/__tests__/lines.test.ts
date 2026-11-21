import { describe, expect, it } from 'vitest';
import type { BlankCard } from '../cards';
import { cardLine } from '../lines';
import { clipKey, tidyLine } from '../../components/practice/clipKey';

describe('what the guide says', () => {
    it('counts the new words in words, with the right grammar', () => {
        const words = (n: number) => cardLine({ kind: 'words', id: 'w', words: Array.from({ length: n }, (_, i) => ({ term: `t${i}`, meaning: 'm' })) });
        expect(words(1)).toBe("One word you'll meet in this lesson. Read it, then we'll practise.");
        expect(words(3)).toBe("Three words you'll meet in this lesson. Read them, then we'll practise.");
    });

    it('says how many statements are true, which is not always three', () => {
        const mistake = (facts: number) =>
            cardLine({ kind: 'mistake', id: 'm', why: 'z', options: [{ text: 'x', mistake: true }, ...Array.from({ length: facts }, () => ({ text: 'y', mistake: false }))] });
        expect(mistake(2)).toBe('Two of these are true. Which one is false?');
        expect(mistake(3)).toBe('Three of these are true. Which one is false?');
    });

    it('has two lines for fill the gap: typing, and choosing', () => {
        const card: BlankCard = { kind: 'blank', id: 'b', before: '', answer: 'model', after: '', clue: '', choices: [] };
        expect(cardLine(card)).toBe('Type the missing word, letter by letter.');
        expect(cardLine(card, { choosing: true })).toBe('Choose the missing word.');
    });
});

describe('a recording is found by its voice and words', () => {
    it('ignores extra spaces, and tells voices and words apart', () => {
        expect(clipKey('af_heart', 'Tap a word,  then tap what it means. ')).toBe(clipKey('af_heart', 'Tap a word, then tap what it means.'));
        expect(clipKey('af_heart', 'Out of hearts')).not.toBe(clipKey('am_fenrir', 'Out of hearts'));
        expect(clipKey('af_heart', 'Out of hearts')).toMatch(/^[0-9a-f]{8}$/);
        expect(tidyLine('  a \n b ')).toBe('a b');
    });
});
