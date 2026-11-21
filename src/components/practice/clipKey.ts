// The name of a recorded line: a short hash of the recorded voice and the
// words. The site and scripts/voice compute it the same way, so a line finds
// its recording, and a changed line (or voice) is simply recorded again.

/** Spaces tidied, the way a line is recorded and looked up. */
export const tidyLine = (text: string) => text.replace(/\s+/g, ' ').trim();

/** FNV-1a, 32 bits, as 8 hex digits. */
export const clipKey = (voice: string, text: string): string => {
    let hash = 0x811c9dc5;
    for (const ch of `${voice}|${tidyLine(text)}`) {
        hash ^= ch.codePointAt(0)!;
        hash = Math.imul(hash, 0x01000193);
    }
    return (hash >>> 0).toString(16).padStart(8, '0');
};
