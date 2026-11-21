import { describe, it, expect } from 'vitest';
import { foundationsGlossaryTerms } from '../../data/foundationsGlossary';
import { allFoundationTopics } from '../../data/foundations';
import { foundationsGlossary as g } from '../foundationsGlossary';

const topic = (id: string) => {
    const found = g.findTopic(id);
    if (!found) throw new Error(`missing topic ${id}`);
    return found;
};
const ids = (text: string) => g.segmentText(text).map(s => s.termId).filter(Boolean);

describe('ML glossary data', () => {
    it('has unique ids, a definition and spellings for every word', () => {
        const termIds = foundationsGlossaryTerms.map(t => t.id);
        expect(new Set(termIds).size).toBe(termIds.length);
        for (const term of foundationsGlossaryTerms) {
            expect(term.definition.trim().length).toBeGreaterThan(10);
            expect(term.matches.length).toBeGreaterThan(0);
        }
    });

    it('only points "taught in" at topics that exist', () => {
        const topicIds = new Set(allFoundationTopics.map(t => t.id));
        expect(foundationsGlossaryTerms.filter(t => t.taughtIn && !topicIds.has(t.taughtIn)).map(t => t.id)).toEqual([]);
    });
});

describe('finding ML words', () => {
    it('prefers the longest match', () => {
        expect(ids('use gradient descent here')).toEqual(['gradient-descent']);
        expect(ids('the cross-entropy loss')).toEqual(['cross-entropy', 'loss']);
    });

    it('does not mistake everyday words for jargon', () => {
        expect(ids('7 heads in 10 flips')).not.toContain('multi-head-attention');
        expect(ids('Write a StandardScaler class')).not.toContain('classification');
        expect(ids('save snapshots of your project')).not.toContain('projection');
        expect(ids('build search that returns the top 5')).not.toContain('reward');
        expect(ids('two students')).not.toContain('distillation');
        expect(ids('add a metadata filter')).not.toContain('convolution');
    });

    it('leaves the everyday words of a sentence alone', () => {
        expect(ids('Shape (3, 4) means 3 rows and 4 columns.')).not.toContain('expectation');
        expect(ids('Always judge a model on data it was not trained on.')).not.toContain('llm-as-judge');
        expect(ids('Classification: majority vote among those k labels.')).not.toContain('chain-of-thought');
        expect(ids('Multiply by a learned γ and add a learned β.')).not.toContain('discount');
        expect(ids('Masks always make a copy.')).not.toContain('causal-mask');
        expect(ids('a duplicated or derived feature')).not.toContain('de-duplication');
    });

    it('keeps a word plain in the lessons that use it in its everyday sense', () => {
        const weather = "Is predicting tomorrow's temperature regression or classification?";
        const marked = (text: string, topicId?: string) => g.segmentText(text, topicId).map(s => s.termId).filter(Boolean);
        expect(marked(weather, 'f0-t6')).not.toContain('temperature');
        expect(marked(weather)).toContain('temperature');
        expect(marked('Temperature divides the logits by T.', 'f4-t7')).toContain('temperature');
        expect(marked('git init turns a folder into a repository.', 'f0-t4')).not.toContain('initialisation');
        expect(marked('What does that mean?', 'f1-t5')).not.toContain('mean');
        expect(marked("subtract each feature's mean", 'f0-t2')).toContain('mean');
        // The lesson's own lists follow: its words, and the new words it introduces.
        expect(g.termsInTopic(topic('f0-t6'))).not.toContain('temperature');
        for (const id of g.terms.flatMap(term => term.plainIn ?? [])) expect(g.findTopic(id), id).toBeDefined();
    });

    it('never teaches a word in a lesson that only uses its spelling for something else', () => {
        const newWords = (id: string) => g.newWordsForTopic(topic(id)).map(t => t.id);
        // The first lesson, the one every learner sees.
        expect(newWords('f0-t6')).toEqual(expect.not.arrayContaining(['expectation', 'llm-as-judge', 'temperature']));
        expect(newWords('f0-t1')).not.toContain('causal-mask');
        expect(g.termsInTopic(topic('f2-t9'))).not.toContain('chain-of-thought');
        expect(g.termsInTopic(topic('f3-t8'))).not.toContain('discount');
    });

    it('says every meaning of a word that has several', () => {
        expect(g.getTerm('kernel')?.definition).toMatch(/SVM/);
        expect(g.getTerm('kernel')?.definition).toMatch(/GPU/);
        expect(g.getTerm('query')?.definition).toMatch(/search/);
        expect(g.getTerm('query')?.definition).toMatch(/attention/);
    });

    it('explains maths notation, even inside a formula', () => {
        expect(ids('∂L/∂w = xᵀ·(∂L/∂y)')).toEqual(expect.arrayContaining(['partial-sign', 'transpose']));
        expect(ids('a·b = Σ aᵢbᵢ')).toContain('sum-sign');
        expect(ids('w ← w − η·∇f(w)')).toEqual(expect.arrayContaining(['becomes-arrow', 'eta', 'nabla']));
        expect(ids('the loss is −log p')).toContain('logarithm');
        expect(ids('the logits before softmax')).not.toContain('logarithm');
        const marked = (text: string, topicId: string) => g.segmentText(text, topicId).map(s => s.termId).filter(Boolean);
        expect(marked('Add a /health endpoint and log the latency of every request.', 'f5-t7')).not.toContain('logarithm');
        // A symbol is never asked for in "type the missing word": it can't be typed.
        for (const id of ['sum-sign', 'nabla', 'sigma', 'eta']) expect(g.getTerm(id)?.term.length).toBe(1);
    });

    it('matches acronyms only in capitals', () => {
        expect(ids('ML from scratch')).toContain('ml');
        expect(ids('the html file')).not.toContain('ml');
    });
});

describe('new words per topic', () => {
    it('starts with the big-picture topic, which introduces the core words', () => {
        expect(allFoundationTopics[0].id).toBe('f0-t6');
        const words = g.newWordsForTopic(topic('f0-t6')).map(t => t.id);
        expect(words).toEqual(expect.arrayContaining(['feature', 'label', 'gradient-descent']));
    });

    it('never lists the word a topic itself teaches, and finds words in every topic', () => {
        for (const t of allFoundationTopics) {
            expect(g.newWordsForTopic(t).some(term => term.taughtIn === t.id)).toBe(false);
            expect(g.termsInTopic(t).length).toBeGreaterThan(0);
        }
    });

    it('looks topics up by id', () => {
        expect(g.newWordsForTopicId('f0-t6').length).toBeGreaterThan(0);
        expect(g.newWordsForTopicId('nope')).toEqual([]);
        expect(g.search('softmax').map(t => t.id)).toContain('softmax');
    });
});
