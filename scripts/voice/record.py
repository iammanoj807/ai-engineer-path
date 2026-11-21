"""Record the guides' lines with Kokoro, a free open-source voice model.

    python scripts/voice/record.py --model <folder with kokoro-v1.0.onnx and voices-v1.0.bin>

Reads generated/voice-lines.json (from `npx vite-node scripts/voice/lines.ts`)
and writes public/voice/<key>.mp3 for each line, plus public/voice/manifest.json:
each clip's length and its mouth shapes, 20 a second, which move the guide's
mouth while they talk. Only lines without a recording are recorded, and
recordings no longer used are deleted, so a re-run after a small change is
quick and leaves the other files alone.

Needs Python 3.10 to 3.13 with kokoro-onnx, soundfile and numpy, and ffmpeg.
The model: https://github.com/thewh1teagle/kokoro-onnx/releases (model-files-v1.0).
Kokoro is Apache-2.0 licensed, so its recordings can ship with the site.
"""

import argparse
import json
import os
import subprocess
import sys
import tempfile

import numpy as np
import soundfile as sf

ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", ".."))
OUT = os.path.join(ROOT, "public", "voice")
FPS = 20
# A little slower than the model's own pace: clear for beginners, still lively.
SPEED = 0.95


def trim(y, sr):
    """Cut silence at the start and end, keeping a short breath either side."""
    loud = np.flatnonzero(np.abs(y) > 0.02)
    if len(loud) == 0:
        return y
    pad = int(0.06 * sr)
    return y[max(0, loud[0] - pad): loud[-1] + pad]


def level(y):
    """Even loudness for every line: speech at about -20 dBFS, peaks below -2 dBFS."""
    rms = np.sqrt(np.mean(y[np.abs(y) > 0.01] ** 2)) if np.any(np.abs(y) > 0.01) else 1.0
    y = y * (10 ** (-20 / 20) / max(rms, 1e-6))
    peak = np.max(np.abs(y))
    limit = 10 ** (-2 / 20)
    return y * (limit / peak) if peak > limit else y


def mouth(y, sr):
    """
    The mouth for each 1/20 s: closed (0), a little open (1), open (2), wide (3),
    or rounded (o small, O big) for the darker "oo" and "oh" sounds.
    """
    hop = sr // FPS
    frames = [y[i:i + hop] for i in range(0, len(y), hop)]
    rms = np.array([np.sqrt(np.mean(f ** 2)) if len(f) else 0.0 for f in frames])
    loudest = np.percentile(rms, 95) or 1.0
    freqs = np.fft.rfftfreq(hop, 1 / sr)
    centroids = []
    for f in frames:
        spectrum = np.abs(np.fft.rfft(f, n=hop))
        centroids.append(float(np.sum(freqs * spectrum) / np.sum(spectrum)) if np.sum(spectrum) > 0 else 0.0)
    centroids = np.array(centroids)
    voiced = centroids[rms > 0.25 * loudest]
    dark = np.median(voiced) * 0.78 if len(voiced) else 0
    out = []
    for r, c in zip(rms, centroids):
        r = r / loudest
        size = 0 if r < 0.14 else 1 if r < 0.38 else 2 if r < 0.7 else 3
        if size and c < dark:
            out.append("o" if size == 1 else "O")
        else:
            out.append(str(size))
    # No single-frame flickers: a mouth shape lasts at least two frames.
    for i in range(1, len(out) - 1):
        if out[i - 1] == out[i + 1] != out[i]:
            out[i] = out[i - 1]
    return "".join(out)


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--model", required=True, help="folder holding kokoro-v1.0.onnx and voices-v1.0.bin")
    args = parser.parse_args()

    from kokoro_onnx import Kokoro

    with open(os.path.join(ROOT, "generated", "voice-lines.json")) as f:
        data = json.load(f)
    lines = data["lines"]
    os.makedirs(OUT, exist_ok=True)
    manifest_path = os.path.join(OUT, "manifest.json")
    old = {}
    if os.path.exists(manifest_path):
        with open(manifest_path) as f:
            old = json.load(f).get("clips", {})

    kokoro = Kokoro(os.path.join(args.model, "kokoro-v1.0.onnx"), os.path.join(args.model, "voices-v1.0.bin"))
    clips, made = {}, 0
    for n, line in enumerate(lines, 1):
        key, path = line["key"], os.path.join(OUT, f"{line['key']}.mp3")
        if key in old and os.path.exists(path):
            clips[key] = old[key]
            continue
        y, sr = kokoro.create(line["say"], voice=line["voice"], speed=SPEED, lang="en-us")
        y = level(trim(np.asarray(y, dtype=np.float32), sr))
        with tempfile.NamedTemporaryFile(suffix=".wav") as wav:
            sf.write(wav.name, y, sr)
            subprocess.run(
                ["ffmpeg", "-loglevel", "error", "-y", "-i", wav.name, "-ac", "1", "-ar", "24000", "-codec:a", "libmp3lame", "-b:a", "32k", path],
                check=True,
            )
        clips[key] = [round(len(y) / sr * 1000), mouth(y, sr)]
        made += 1
        print(f"[{n}/{len(lines)}] {line['guide']}: {line['text'][:70]}", flush=True)

    keep = {f"{key}.mp3" for key in clips}
    removed = [name for name in os.listdir(OUT) if name.endswith(".mp3") and name not in keep]
    for name in removed:
        os.remove(os.path.join(OUT, name))
    with open(manifest_path, "w") as f:
        json.dump({"voices": data["voices"], "fps": FPS, "clips": clips}, f, separators=(",", ":"))
    size = sum(os.path.getsize(os.path.join(OUT, name)) for name in os.listdir(OUT))
    print(f"Recorded {made}, kept {len(clips) - made}, removed {len(removed)}. public/voice is {size / 1e6:.1f} MB.")


if __name__ == "__main__":
    sys.exit(main())
