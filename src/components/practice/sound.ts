// Short sounds for practice, made in the browser with the Web Audio API (no
// recordings): a bright two-note chime for a right answer, a soft low "bonk"
// for a wrong one, a pop for a matched pair, and a little rising tune for a
// finished lesson. One tap turns them off, and the choice is remembered.

import { useSyncExternalStore } from 'react';

const KEY = 'aep:v1:sound';
const listeners = new Set<() => void>();
let context: AudioContext | null = null;

export const soundOn = (): boolean => {
    try {
        return localStorage.getItem(KEY) !== 'off';
    } catch {
        return true;
    }
};

export const setSoundOn = (on: boolean) => {
    try {
        if (on) localStorage.removeItem(KEY);
        else localStorage.setItem(KEY, 'off');
    } catch {
        // Remembered until the page closes.
    }
    listeners.forEach(fn => fn());
};

export const useSoundOn = () =>
    useSyncExternalStore(
        fn => {
            listeners.add(fn);
            return () => listeners.delete(fn);
        },
        soundOn,
    );

/** The audio engine, made on first use (always after a tap, so browsers allow it). */
const audio = (): AudioContext | null => {
    if (typeof window === 'undefined') return null;
    const Context = window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!Context) return null;
    context ??= new Context();
    if (context.state === 'suspended') void context.resume();
    return context;
};

/** One note: its pitch, when it starts (seconds from now), how long it rings, how loud, and its tone. */
const note = (ac: AudioContext, frequency: number, at: number, length: number, volume: number, type: OscillatorType = 'triangle') => {
    const start = ac.currentTime + at;
    const oscillator = ac.createOscillator();
    const gain = ac.createGain();
    oscillator.type = type;
    oscillator.frequency.setValueAtTime(frequency, start);
    // A quick swell and a smooth fade, so notes never click.
    gain.gain.setValueAtTime(0.0001, start);
    gain.gain.exponentialRampToValueAtTime(volume, start + 0.015);
    gain.gain.exponentialRampToValueAtTime(0.0001, start + length);
    oscillator.connect(gain).connect(ac.destination);
    oscillator.start(start);
    oscillator.stop(start + length + 0.05);
};

const play = (tune: (ac: AudioContext) => void) => {
    if (!soundOn()) return;
    const ac = audio();
    if (!ac) return;
    try {
        tune(ac);
    } catch {
        // No sound is fine.
    }
};

/** Right: two quick rising notes. */
export const playRight = () =>
    play(ac => {
        note(ac, 784, 0, 0.16, 0.16);
        note(ac, 1175, 0.08, 0.32, 0.16);
    });

/** Wrong: a soft low "bonk", falling. */
export const playWrong = () =>
    play(ac => {
        note(ac, 196, 0, 0.2, 0.16, 'sine');
        note(ac, 147, 0.09, 0.28, 0.13, 'sine');
    });

/** A pair matched: a small pop. */
export const playPop = () => play(ac => note(ac, 880, 0, 0.1, 0.09));

/** A letter that isn't right: a quiet tick, so typing doesn't get noisy. */
export const playSlip = () => play(ac => note(ac, 165, 0, 0.08, 0.07, 'sine'));

/** A lesson or unit finished: a short rising tune. */
export const playComplete = () =>
    play(ac => {
        [523, 659, 784, 1047].forEach((frequency, i) => note(ac, frequency, i * 0.1, 0.34, 0.14));
        note(ac, 1319, 0.44, 0.7, 0.12, 'sine');
    });

/** Out of hearts: three gentle falling notes. */
export const playOut = () =>
    play(ac => {
        [392, 330, 262].forEach((frequency, i) => note(ac, frequency, i * 0.16, 0.3, 0.12, 'sine'));
    });
