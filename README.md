# Workout

A personal, offline-first workout tracker (installable PWA) for iPhone.

## Run

```bash
npm install
npm run dev -- --host     # open the printed Network URL on your iPhone (same WiFi)
```

## Use it daily (install to home screen)

For everyday use, deploy the built app to a free static host so it has a **stable URL**
(your logged data is tied to that URL — keep it the same and your history is never lost):

```bash
npm run build             # outputs to dist/
```

Deploy `dist/` to Vercel / Netlify / GitHub Pages, then on iPhone:
Safari → open the URL → Share → **Add to Home Screen**. It then runs full-screen and
works offline at the gym.

## Editing your workouts

- **Splits, days, and default exercises** live in `src/config/splits.ts` — edit that file.
  Editing it never erases logged progress (logs live in the browser's IndexedDB).
  Caveat: progress is keyed by exercise *name*, so renaming an exercise leaves its old
  logs under the old name. Adding/reordering is always safe.
- You can also add exercises on the fly with **+ Add workout** (stored per day).

## Where data lives

All progress (logged weights, custom metrics, progress photos) is stored locally in the
browser via IndexedDB (Dexie). It persists across app updates as long as the app is served
from the same origin. There is no server and nothing leaves your phone.

## Stack

Vite · React · TypeScript · Dexie (IndexedDB) · vite-plugin-pwa. Charts are hand-rolled SVG.
