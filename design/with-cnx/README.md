# With CNX — design prototype

A runnable design reference for the Chiang Mai event buddy experience.

[Live prototype](https://with-cnx-tian-2026.starshipenterprise12.chatgpt.site)

## Run

From the repository root:

```bash
python3 -m http.server 8766 --bind 127.0.0.1 --directory design/with-cnx/dist
```

Open **http://127.0.0.1:8766/**. No package installation, API keys, or build step is required for this prototype.

## Included experience

- Responsive desktop and mobile layouts with a jade, warm-white and terracotta palette.
- Thai, English, Chinese and Chinese/English display modes.
- Event invitations, buddy requests, simulated acceptance and meetup arrangements.
- Original With mascot pair; click to wave, or wait 10 seconds for the first automatic hello. Later greetings appear every 45 seconds while the mascot is visible. Automatic greetings pause during dialogs and hidden tabs, and respect reduced motion.
- PWA manifest, app icons, installation guidance and offline app shell.

The two mascots are original design illustrations, not traditional cultural characters or borrowed brand mascots.

## Files

| File | Purpose |
| --- | --- |
| `dist/index.html` | Product layout, design tokens, SVG mascots, translations and demo interactions |
| `dist/pwa.js` / `dist/pwa.css` | Install and update UI |
| `dist/manifest.webmanifest` / `dist/icons/` | PWA identity and home-screen icons |
| `dist/sw.js` | Generated service worker |
| `update-worker.py` | Regenerate the offline cache version after changes |

After editing any shipped asset, run:

```bash
python3 design/with-cnx/update-worker.py
```

Serve the entire `dist` directory. Use HTTPS for installation on teammates' devices; localhost also supports development. iPhone: open in Safari → Share → Add to Home Screen. Android: open in Chrome → Install app / Add to Home screen. First load requires internet; external event registration links always need internet. Users explicitly accept available updates.

## Handoff to the application

This folder is a separate design prototype. The Next.js application remains in `app/`.

- Extract the tokens, components and SVGs from `dist/index.html` into the app as needed.
- Connect event cards and forms to the existing Supabase flows. Replace the sample event list, `persist()` local storage, and simulated request/acceptance handlers.
- Keep registration on the original event platform distinct from arranging a buddy.
- `pwa.js` depends on the prototype's `bi()` and `openModal()` helpers and its DOM structure. Adapt those dependencies when moving it into React.
- The app already has `app/manifest.ts`, `app/RegisterSW.tsx` and `public/sw.js`. Reconcile the two PWA implementations when integrating the design; copying this service worker to the app root would cache the standalone demo instead of the authenticated application.

## Demo data

Invitations and plans are stored only in the current browser under `cnx-with-prototype-v1`. They are not sent to another teammate or a backend. There is no live login, chat, AI service, location tracking, payment or ticket verification in this prototype. The language choice is also saved locally.

## Verification

- JavaScript syntax and bundled resource paths checked.
- Mobile layout and Thai interface checked in the browser.
- Offline reopening checked after stopping the local server.
- Automatic greeting delay, dismissal and manual wave checked.

Physical iPhone/Android home-screen installation has not been tested on a device.
