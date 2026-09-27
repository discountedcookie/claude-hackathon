# With CNX — design prototype

A runnable design reference for the Chiang Mai event buddy experience.

[Previously published prototype](https://with-cnx-tian-2026.starshipenterprise12.chatgpt.site). That hosted version predates this UI polish; run this branch locally to review the latest design. This change does not deploy the site.

## UI polish revision

This revision updates the standalone design reference only. It is based on the latest team code at `b8baaca` and does not modify the Next.js application or backend.

- Clearer type hierarchy and locally bundled LINE Seed English/Thai fonts, with language-specific spacing and wrapping.
- Less visual nesting in event details, more prominent buddy information, and clearer internal navigation arrows.
- Quiet button feedback and dialog entrance/exit; no repeated card animation while searching.
- A gentle posting confirmation and a one-time companion interaction after **Preview match**. Reduced-motion preferences receive static feedback.
- Cleaner Chinese, English and Thai copy. Repeated Demo badges are removed; relevant actions still explain device-only storage and unsent messages.
- Installation lives in the header. Identical user-entered text appears once in bilingual mode.

### Review the success moments

1. **Invite a buddy → Post invitation** after completing the form.
2. **View invite → I’d like to join → Request to join → View my plans → Preview match**.
3. Switch between **English**, **ไทย**, and **中文 / EN** to inspect type and layout.

These actions only change records in your current browser. The original sample events remain examples, and previewing a match does not notify another person.

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
| `dist/ui-polish.css` | Final typography, component spacing, responsive overrides and motion styles |
| `dist/ui-polish.js` | Localized placeholders, dialog transitions and presentation-only success feedback |
| `dist/pwa.js` / `dist/pwa.css` | Install and update UI |
| `dist/fonts/` | Unmodified LINE Seed EN/TH web fonts, attribution and SIL OFL 1.1 license |
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
- Read `dist/ui-polish.css` as the final style layer; it overrides the base styles in `index.html`. Carry the font files and their license/attribution along with the typography.
- Adapt the presentation helpers in `dist/ui-polish.js` to the app's real success states. They rely on this prototype's helpers and are not drop-in React code. In particular, **Preview match** is a simulated action, not the app's real acceptance handler.
- Connect event cards and forms to the existing Supabase flows. Replace the sample event list, `persist()` local storage, and simulated request/acceptance handlers.
- Keep registration on the original event platform distinct from arranging a buddy.
- `pwa.js` depends on the prototype's `bi()` and `openModal()` helpers and its DOM structure. Adapt those dependencies when moving it into React.
- The app already has `app/manifest.ts`, `app/RegisterSW.tsx` and `public/sw.js`. Reconcile the two PWA implementations when integrating the design; copying this service worker to the app root would cache the standalone demo instead of the authenticated application.

## Demo data

Invitations and plans are stored only in the current browser under `cnx-with-prototype-v1`. They are not sent to another teammate or a backend. There is no live login, chat, AI service, location tracking, payment or ticket verification in this prototype. The language choice is also saved locally.

## Verification

- JavaScript syntax and bundled resource paths checked.
- English, Thai and bilingual layouts inspected at 360px / 390px mobile and 1309px desktop widths; no page-wide horizontal overflow observed.
- Posting, saved request, match preview, cancellation, dialog close/focus return and PWA update flow exercised in the local design preview.
- New font/style/script assets included in the generated offline cache. Offline reopening had previously been verified on the base prototype.
- Reduced-motion handling checked in source; no OS preference was changed during the latest pass. The existing automatic greeting behavior is retained.

The shipped assets were checked for accidental local paths, credentials and test records. Browser-created invitations and plans are not bundled into the source.

Physical iPhone/Android home-screen installation has not been tested on a device.

## References

- [LINE Seed fonts and licensing](https://seed.line.me/index_en.html)
- [LINE design principles](https://designsystem.line.me/about/design-principle-en)
- [W3C Thai script resources](https://www.w3.org/TR/thai-lreq/)

Motion timing and spacing are choices for With CNX, not claimed as official LINE specifications. The existing mascot illustrations remain original With artwork.
