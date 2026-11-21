// The guides read each line aloud, and their mouths move while they talk.
//
// Every line is recorded ahead of time with a natural-sounding voice model
// (scripts/voice): a young woman's voice for Pia, a young man's for Hamish, the
// same on every phone and computer. public/voice/manifest.json lists each
// recording with its mouth shapes, 20 a second, played in step with the sound.
//
// A line with no recording yet (a lesson changed since the last recording) is
// spoken by the device's own voice instead, but only a voice of the guide's
// gender: with none (many phones have one female English voice), that guide
// stays quiet rather than speak in the wrong voice.
//
// One tap in the practice header turns the voice off, and the choice is kept.

import { useSyncExternalStore } from 'react';
import type { Guide } from './guides';
import { clipKey, tidyLine } from './clipKey';
import { audioContext, unlockAudio } from './sound';

const KEY = 'aep:v1:voice';
const listeners = new Set<() => void>();

const synth = (): SpeechSynthesis | null => (typeof window !== 'undefined' && 'speechSynthesis' in window ? window.speechSynthesis : null);

/** Whether this browser can play the voice at all. */
export const canSpeak = () =>
    typeof window !== 'undefined' && ('AudioContext' in window || 'webkitAudioContext' in window || synth() !== null);

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

// ============ TALKING: WHICH GUIDE, AND THEIR MOUTH ============

/** A guide talking: their mouth shapes, and the clock they follow. */
export interface Talk {
    guide: Guide;
    /** One character per frame: 0 closed, 1 a little open, 2 open, 3 wide, o and O rounded. */
    frames: string;
    fps: number;
    /** Seconds, on the clock the sound plays by; the first frame is at `start`. */
    clock: () => number;
    start: number;
}

let talk: Talk | null = null;
const talkListeners = new Set<() => void>();
const setTalk = (next: Talk | null) => {
    talk = next;
    talkListeners.forEach(fn => fn());
};

/** The guide's talk while they are talking, else null. */
export const useTalk = (guide: Guide): Talk | null =>
    useSyncExternalStore(
        fn => {
            talkListeners.add(fn);
            return () => talkListeners.delete(fn);
        },
        () => (talk?.guide === guide ? talk : null),
    );

// ============ RECORDED LINES ============

interface Manifest {
    voices: Record<Guide, string>;
    fps: number;
    /** Each recording: its length in ms, and its mouth shapes. */
    clips: Record<string, [number, string]>;
}

const VOICE_DIR = `${import.meta.env.BASE_URL}voice/`;
let manifest: Promise<Manifest | null> | null = null;
const loadManifest = () =>
    (manifest ??= fetch(`${VOICE_DIR}manifest.json`)
        .then(response => (response.ok ? (response.json() as Promise<Manifest>) : null))
        .catch(() => null));

const clips = new Map<string, Promise<AudioBuffer | null>>();
const loadClip = (key: string) => {
    let clip = clips.get(key);
    if (!clip) {
        clip = fetch(`${VOICE_DIR}${key}.mp3`)
            .then(response => (response.ok ? response.arrayBuffer() : Promise.reject(new Error(String(response.status)))))
            .then(data => audioContext()?.decodeAudioData(data) ?? null)
            .catch(() => null);
        clips.set(key, clip);
    }
    return clip;
};

/** The recording of a guide's line, if there is one. */
const recordingOf = async (guide: Guide, words: string) => {
    const known = await loadManifest();
    const voice = known?.voices[guide];
    const key = voice ? clipKey(voice, words) : '';
    const entry = key ? known?.clips[key] : undefined;
    return known && entry ? { key, frames: entry[1], fps: known.fps } : null;
};

/** Load a session's lines before they are needed, so each card speaks at once. */
export const prefetchLines = (lines: string[], guide: Guide) => {
    if (!voiceOn()) return;
    for (const line of lines) {
        void recordingOf(guide, tidyLine(line)).then(found => found && loadClip(found.key));
    }
};

// ============ THE DEVICE'S VOICE, FOR LINES NOT RECORDED YET ============

/** Voices to look for, youngest-sounding first: Apple's downloadable voices and Microsoft's natural ones lead. */
const VOICES: Record<Guide, string[]> = {
    pia: ['Ava', 'Zoe', 'Microsoft Emma', 'Microsoft Aria', 'Microsoft Jenny', 'Allison', 'Google US English', 'Google UK English Female', 'Samantha', 'Microsoft Libby', 'Microsoft Sonia', 'Microsoft Zira', 'Susan', 'Serena', 'Karen', 'Tessa', 'Moira', 'Fiona', 'Victoria'],
    hamish: ['Evan', 'Nathan', 'Microsoft Andrew', 'Microsoft Brian', 'Microsoft Guy', 'Microsoft Christopher', 'Microsoft Eric', 'Microsoft Ryan', 'Tom', 'Aaron', 'Google UK English Male', 'Daniel', 'Oliver', 'Arthur', 'Microsoft David', 'Microsoft Mark', 'Microsoft George', 'Alex'],
};

/** Joke voices, and old robotic ones that sound nothing like a young person: never used. */
const NOVELTY = /^(Albert|Bad News|Bahh|Bells|Boing|Bubbles|Cellos|Wobble|Good News|Jester|Junior|Organ|Superstar|Trinoids|Whisper|Zarvox|Grandma|Grandpa|Kathy|Ralph|Fred|Hysterical|Deranged|Pipe Organ|Eddy|Flo|Reed|Rocko|Sandy|Shelley)\b/i;

/** The device voice for a guide, or null when the device has no voice of the right gender. */
const pick = (guide: Guide): SpeechSynthesisVoice | null => {
    const english = (synth()?.getVoices() ?? []).filter(voice => /^en([-_]|$)/i.test(voice.lang) && !NOVELTY.test(voice.name));
    for (const name of VOICES[guide]) {
        const pattern = new RegExp(`\\b${name}\\b`, 'i');
        const found = english.filter(voice => pattern.test(voice.name));
        if (found.length > 0) return found.find(voice => /enhanced|premium|natural/i.test(voice.name)) ?? found.find(voice => voice.localService) ?? found[0];
    }
    return null;
};

// Some browsers load their voices a moment after the page: asking once starts that.
synth()?.getVoices();

/** A talking mouth for the device's voice, which says nothing about its sounds. */
const CHATTER = '0122321012332101223210'.repeat(60);

const speakWithDevice = (words: string, guide: Guide, turn: number) => {
    const speech = synth();
    const voice = pick(guide);
    // No voice of the guide's gender on this device: quiet, never the wrong voice.
    if (!speech || !voice) return;
    const line = new SpeechSynthesisUtterance(words);
    line.voice = voice;
    line.lang = voice.lang;
    // A touch higher and quicker than the voice's own: younger, and still clear.
    line.rate = 1.03;
    line.pitch = guide === 'pia' ? 1.12 : 1.05;
    line.volume = 0.9;
    const clock = () => performance.now() / 1000;
    line.onstart = () => {
        if (turn === current) setTalk({ guide, frames: CHATTER, fps: 12, clock, start: clock() });
    };
    line.onend = line.onerror = () => {
        if (turn === current) setTalk(null);
    };
    speech.speak(line);
};

// ============ SAYING A LINE ============

let current = 0;
let playing: AudioBufferSourceNode | null = null;

const wait = (ms: number) => new Promise(resolve => window.setTimeout(resolve, ms));

const playRecording = async (buffer: AudioBuffer, frames: string, fps: number, guide: Guide, turn: number) => {
    const ac = audioContext();
    if (!ac) return false;
    if (ac.state !== 'running') {
        await Promise.race([ac.resume().catch(() => {}), wait(600)]);
        // Read again: resuming changes it.
        if ((ac.state as AudioContextState) !== 'running') return false;
    }
    if (turn !== current) return true;
    const source = ac.createBufferSource();
    source.buffer = buffer;
    source.connect(ac.destination);
    const start = ac.currentTime + 0.03;
    source.start(start);
    playing = source;
    setTalk({ guide, frames, fps, clock: () => ac.currentTime, start });
    source.onended = () => {
        if (turn === current) {
            playing = null;
            setTalk(null);
        }
    };
    return true;
};

/** The guide says this line, cutting off whatever they were saying. */
export const say = (text: string, guide: Guide) => {
    stopSpeaking();
    const words = tidyLine(text);
    if (!voiceOn() || !words) return;
    const turn = current;
    void (async () => {
        const found = await recordingOf(guide, words);
        const buffer = found ? await loadClip(found.key) : null;
        if (turn !== current) return;
        if (found && buffer && (await playRecording(buffer, found.frames, found.fps, guide, turn))) return;
        if (turn === current) speakWithDevice(words, guide, turn);
    })();
};

export const stopSpeaking = () => {
    current++;
    try {
        playing?.stop();
    } catch {
        // Already finished.
    }
    playing = null;
    synth()?.cancel();
    if (talk) setTalk(null);
};

/**
 * Move a guide's mouth for a moment with no sound, as their speech bubble
 * fills in (the front page). Never over a line they are really saying.
 */
export const mouthOnly = (guide: Guide, ms: number) => {
    if (playing || synth()?.speaking) return;
    const clock = () => performance.now() / 1000;
    const start = clock();
    setTalk({ guide, frames: CHATTER.slice(0, Math.ceil((ms / 1000) * 12)), fps: 12, clock, start });
    window.setTimeout(() => {
        if (talk?.start === start) setTalk(null);
    }, ms);
};

/**
 * Call from the tap that opens practice. iPhones let a page play sound, and
 * speak, only after it has done so during a tap: this does both, silently.
 */
export const primeVoice = () => {
    if (!voiceOn()) return;
    unlockAudio();
    void loadManifest();
    const speech = synth();
    if (speech) {
        const silent = new SpeechSynthesisUtterance(' ');
        silent.volume = 0;
        speech.speak(silent);
    }
};
