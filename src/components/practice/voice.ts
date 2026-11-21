// The guides read each question aloud, with the browser's own speech voices
// (nothing is downloaded): a female voice for Pia and a male voice for Hamish.
// One tap in the practice header turns the voice off, and the choice is kept.
//
// Both guides are young adults (early twenties), so each has a list of
// young-sounding voices to look for, best first: devices name their voices
// differently. Every voice is lifted a little in pitch and pace to sound
// younger. With none of them (say, a phone whose voices have no names), the
// device's English voice is used, pitched up for Pia and down for Hamish.

import { useSyncExternalStore } from 'react';
import type { Guide } from './guides';

const KEY = 'aep:v1:voice';
const listeners = new Set<() => void>();

const synth = (): SpeechSynthesis | null => (typeof window !== 'undefined' && 'speechSynthesis' in window ? window.speechSynthesis : null);

/** Whether this browser can speak at all. */
export const canSpeak = () => synth() !== null;

export const voiceOn = (): boolean => {
    try {
        return localStorage.getItem(KEY) !== 'off';
    } catch {
        return true;
    }
};

export const setVoiceOn = (on: boolean) => {
    try {
        if (on) localStorage.removeItem(KEY);
        else localStorage.setItem(KEY, 'off');
    } catch {
        // Remembered until the page closes.
    }
    if (!on) stopSpeaking();
    listeners.forEach(fn => fn());
};

export const useVoiceOn = () =>
    useSyncExternalStore(
        fn => {
            listeners.add(fn);
            return () => listeners.delete(fn);
        },
        voiceOn,
    );

/**
 * Voices to look for, youngest-sounding first. Apple's downloadable voices
 * (Ava, Zoe, Evan, Nathan) and Microsoft's natural voices in Edge sound the
 * most natural; the built-in ones (Samantha, Daniel) come after.
 */
const VOICES: Record<Guide, string[]> = {
    pia: ['Ava', 'Zoe', 'Microsoft Emma', 'Microsoft Aria', 'Microsoft Jenny', 'Allison', 'Google US English', 'Google UK English Female', 'Samantha', 'Microsoft Libby', 'Microsoft Sonia', 'Microsoft Zira', 'Susan', 'Serena', 'Karen', 'Tessa', 'Moira', 'Fiona', 'Victoria'],
    hamish: ['Evan', 'Nathan', 'Microsoft Andrew', 'Microsoft Brian', 'Microsoft Guy', 'Microsoft Christopher', 'Microsoft Eric', 'Microsoft Ryan', 'Tom', 'Aaron', 'Google UK English Male', 'Daniel', 'Oliver', 'Arthur', 'Microsoft David', 'Microsoft Mark', 'Microsoft George', 'Alex'],
};

/** Joke voices, and old robotic ones that sound nothing like a young person: never used. */
const NOVELTY = /^(Albert|Bad News|Bahh|Bells|Boing|Bubbles|Cellos|Wobble|Good News|Jester|Junior|Organ|Superstar|Trinoids|Whisper|Zarvox|Grandma|Grandpa|Kathy|Ralph|Fred|Hysterical|Deranged|Pipe Organ|Eddy|Flo|Reed|Rocko|Sandy|Shelley)\b/i;

/** The voice for a guide, and whether it is one picked for them (else it is pitched to suit). */
const pick = (guide: Guide): { voice: SpeechSynthesisVoice | null; matched: boolean } => {
    const english = (synth()?.getVoices() ?? []).filter(voice => /^en([-_]|$)/i.test(voice.lang) && !NOVELTY.test(voice.name));
    for (const name of VOICES[guide]) {
        const pattern = new RegExp(`\\b${name}\\b`, 'i');
        const found = english.filter(voice => pattern.test(voice.name));
        if (found.length > 0) return { voice: found.find(voice => /enhanced|premium|natural/i.test(voice.name)) ?? found.find(voice => voice.localService) ?? found[0], matched: true };
    }
    return { voice: english.find(voice => voice.default) ?? english[0] ?? null, matched: false };
};

// Some browsers load their voices a moment after the page: asking once starts that.
synth()?.getVoices();

let pending: number | undefined;

/** The guide says this, cutting off whatever they were saying. */
export const say = (text: string, guide: Guide) => {
    const speech = synth();
    const words = text.replace(/\s+/g, ' ').trim();
    if (!speech || !voiceOn() || !words) return;
    speech.cancel();
    window.clearTimeout(pending);
    // Chrome can drop a line queued at the same moment as cancel(), so wait a beat.
    pending = window.setTimeout(() => {
        const { voice, matched } = pick(guide);
        const line = new SpeechSynthesisUtterance(words);
        if (voice) {
            line.voice = voice;
            line.lang = voice.lang;
        } else {
            line.lang = 'en-US';
        }
        // A touch higher and quicker than the voice's own: younger, and still clear.
        line.rate = 1.03;
        line.pitch = guide === 'pia' ? (matched ? 1.12 : 1.3) : matched ? 1.05 : 0.9;
        line.volume = 0.9;
        speech.speak(line);
    }, 80);
};

export const stopSpeaking = () => {
    window.clearTimeout(pending);
    synth()?.cancel();
};

/**
 * iPhones let a page speak only once it has spoken during a tap. Call this from
 * the tap that opens practice: it says nothing, and lets the guide talk after.
 */
export const primeVoice = () => {
    const speech = synth();
    if (!speech || !voiceOn()) return;
    const silent = new SpeechSynthesisUtterance(' ');
    silent.volume = 0;
    speech.speak(silent);
};
