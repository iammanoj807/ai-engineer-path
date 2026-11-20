// The build writes each page's own text into its HTML (vite.config.ts), so a
// lesson can be read, and indexed, before its course has loaded. main.tsx keeps
// that text here before React starts, and the app shows it while the course
// loads, instead of a spinner.

let kept: { path: string; html: string } | null = null;

export const keepPrerendered = (path: string, html: string) => {
    kept = html.trim() ? { path, html } : null;
};

export const prerenderedFor = (path: string): string | null => (kept && kept.path === path ? kept.html : null);
