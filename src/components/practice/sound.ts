// Short sounds for practice, made in the browser with the Web Audio API (no
// recordings): a bright two-note chime for a right answer, a "bonk" falling
// down for a wrong one, a pop for a matched pair, and a little rising tune for
// a finished lesson. One tap turns them off, and the choice is remembered.
//
// Every note sits above 290 Hz, because phone and laptop speakers can't play
// deep bass: a lower sound is silent on them. They are kept gentle, and a
// limiter stops overlapping notes from ever getting harsh.

import { useSyncExternalStore } from 'react';

const KEY = 'aep:v1:sound';
const listeners = new Set<() => void>();
let context: AudioContext | null = null;
/** Where every note goes: a limiter, then the speakers. */
let output: AudioNode | null = null;

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

/** The audio engine, made on first use (the first sound always follows a tap, so browsers allow it). */
const audio = (): AudioContext | null => {
    if (typeof window === 'undefined') return null;
    const Context = window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!Context) return null;
    if (!context) {
        context = new Context();
        const limiter = context.createDynamicsCompressor();
        limiter.threshold.value = -8;
        limiter.knee.value = 4;
        limiter.ratio.value = 12;
        limiter.attack.value = 0.002;
        limiter.release.value = 0.12;
        limiter.connect(context.destination);
        output = limiter;
    }
    return context;
};

// Phones pause a page's audio when the screen locks, a call comes in or another app plays.
// Browsers only let it start again on a tap or a key, so any tap wakes it for the next sound.
// (It never starts audio on its own: only audio a practice sound already started.)
if (typeof document !== 'undefined') {
    const wake = () => {
        if (context && context.state !== 'running' && soundOn()) void context.resume().catch(() => {});
    };
    for (const type of ['pointerdown', 'touchend', 'keydown'] as const) document.addEventListener(type, wake, { capture: true, passive: true });
}

/** One note: its pitch (or a slide from one pitch to another), when it starts (seconds from now), how long it rings, how loud, and its tone. */
const note = (ac: AudioContext, pitch: number | [number, number], at: number, length: number, volume: number, type: OscillatorType = 'triangle') => {
    const start = ac.currentTime + at;
    const oscillator = ac.createOscillator();
    const gain = ac.createGain();
    oscillator.type = type;
    const [from, to] = typeof pitch === 'number' ? [pitch, pitch] : pitch;
    oscillator.frequency.setValueAtTime(from, start);
    if (to !== from) oscillator.frequency.exponentialRampToValueAtTime(to, start + length * 0.6);
    // A quick swell and a smooth fade, so notes never click.
    gain.gain.setValueAtTime(0.0001, start);
    gain.gain.exponentialRampToValueAtTime(volume, start + 0.012);
    gain.gain.exponentialRampToValueAtTime(0.0001, start + length);
    oscillator.connect(gain).connect(output ?? ac.destination);
    oscillator.start(start);
    oscillator.stop(start + length + 0.05);
};

const play = (tune: (ac: AudioContext) => void) => {
    if (!soundOn()) return;
    const ac = audio();
    if (!ac) return;
    const run = () => {
        try {
            tune(ac);
        } catch {
            // No sound is fine.
        }
    };
    // Paused audio keeps a frozen clock: start it first, then place the notes. A sound that
    // can't start within a moment is dropped, so it never plays late, on some later tap.
    if (ac.state === 'running') run();
    else {
        const asked = Date.now();
        void ac.resume().then(() => {
            if (Date.now() - asked < 800) run();
        }, () => {});
    }
};

/** Right: two quick rising notes, bright. */
export const playRight = () =>
    play(ac => {
        note(ac, 784, 0, 0.14, 0.22);
        note(ac, 1175, 0.09, 0.36, 0.22);
        note(ac, 2350, 0.09, 0.22, 0.035, 'sine');
    });

/** Wrong: a "bonk" sliding down, in a range small speakers can play. */
export const playWrong = () =>
    play(ac => {
        note(ac, [440, 392], 0, 0.16, 0.22);
        note(ac, [349, 294], 0.13, 0.32, 0.22);
    });

/** A pair matched: a small pop. */
export const playPop = () => play(ac => note(ac, [700, 1150], 0, 0.11, 0.19));

/** A letter that isn't right: a short tick, softer than a wrong answer so typing doesn't get noisy. */
export const playSlip = () => play(ac => note(ac, [392, 330], 0, 0.09, 0.13));

/** A lesson or unit finished: a short rising tune. */
export const playComplete = () =>
    play(ac => {
        [523, 659, 784, 1047].forEach((frequency, i) => note(ac, frequency, i * 0.1, 0.32, 0.19));
        note(ac, 1319, 0.42, 0.75, 0.19);
        note(ac, 2637, 0.42, 0.45, 0.03, 'sine');
    });

/** Out of hearts: three gentle falling notes. */
export const playOut = () =>
    play(ac => {
        [523, 440, 349].forEach((frequency, i) => note(ac, frequency, i * 0.17, 0.34, 0.19));
    });
