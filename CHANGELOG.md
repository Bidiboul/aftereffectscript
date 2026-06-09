# Changelog — Edit Helper Panel

All notable changes to this project are documented in this file.

Format: `[Version] — YYYY-MM-DD`

---

## [0.2.0] — 2026-06-09

### Added

- **Custom themed UI** — flat buttons drawn with the ScriptUI graphics API, vector icons (SVG-equivalent), accent strip, hover/press states.
- **Theme system** — Dark / Light themes plus customizable accent color (6 presets + custom hex), persisted via `app.settings`.
- **Settings dialog** — customize theme, accent color, zoom intensity and zoom duration; everything is saved between sessions.
- **Smooth Zoom Out** — progressive zoom-out on selected layers.
- **Punch Out-In** — zoom out then back (recoil effect), 3 eased keyframes.
- **Punch In-Out** — zoom in then back (impact effect), 3 eased keyframes.
- **Quick Shake (Light / Medium / Heavy)** — non-destructive shakes applied on a dedicated adjustment layer with the native Transform effect, lasting 10 frames from the current time. The footage below is never modified.
- **Speed Lines (anime)** — radial anime-style speed lines overlay built only with native effects (Fractal Noise + Polar Coordinates, Screen blend mode, animated evolution).
- **Freeze Frame** — splits the selected layer at the playhead: the original keeps playing until the freeze point, a time-remapped hold duplicate takes over.
- **License system** — offline key validation (`EHP-XXXX-XXXX-XXXX` with checksum), activation from the Settings dialog, Trial/Licensed badge in the footer. Seller-side key generator in `tools/generate_license_key.jsx`.

### Changed

- **RGB Split** now performs true channel isolation using the native **Shift Channels** effect (one channel per duplicate) with Add blend mode; the source layer is disabled instead of left visible.
- Zoom intensity and duration are now configurable in Settings (defaults: 15 %, 12 frames).
- All feature code refactored around `withUndo()` and `requireSelection()` helpers.

---

## [0.1.0] — 2026-06-09

### Added

- **Create Adjustment Layer** — creates `EH_Adjustment` above selected layers or spanning the full comp.
- **White Flash** — 6-frame white solid (`EH_White_Flash`) with opacity fade, starting at the current time.
- **Black Flash** — 6-frame black solid (`EH_Black_Flash`) with opacity fade, starting at the current time.
- **Impact Shake** — applies `wiggle(18, 35)` expression to the Position of selected layers.
- **Smooth Zoom** — adds +15 % Scale keyframes over 12 frames with Easy Ease on selected layers.
- **RGB Split** — duplicates selected layer 3× (`EH_RGB_Red`, `EH_RGB_Green`, `EH_RGB_Blue`) with pixel offsets and Screen blend mode.
- **Glow Boost** — applies native AE Glow effect (Threshold 60 %, Radius 35, Intensity 1.5) to selected layers.
- **Auto Precomp Selected** — pre-composes selected layers into `EH_Precomp_01` (auto-increments).
- **Organize Project** — creates `01_Comps`, `02_Footage`, `03_Audio`, `04_Precomps`, `05_Solids` folders and sorts items automatically.
- Dockable ScriptUI panel compatible with After Effects 2024+.
- Full undo group support (`app.beginUndoGroup` / `app.endUndoGroup`) for every action.
- Utility functions: `getActiveComp`, `requireActiveComp`, `getSelectedLayers`, `framesToSeconds`, `createFolderIfMissing`, `getUniqueCompName`.

---

## Known Issues — v0.1.0

| Issue | Details |
|---|---|
| **RGB Split — no true channel isolation** | The RGB Split feature offsets and blends three duplicates but does **not** isolate individual color channels. To achieve true R/G/B separation, manually add the "Shift Channels" effect to each duplicate and configure it to output only the desired channel. A future version will automate this. |
| **Glow effect property names** | Glow property match-names (`ADBE Glow-0001`, etc.) have been stable since CS6 but could differ if Adobe changes internal identifiers in a future update. If Glow Boost throws an error, verify the match-names in the Effect Controls panel. |
| **Smooth Zoom — existing keyframes** | If the target layer already has Scale keyframes at or near the current time, the new keyframes will be added alongside them, which may create unintended curves. Manually clean up duplicate keyframes if needed. |
| **Organize Project — nested folders** | Items already inside a sub-folder are not moved; only top-level items are processed. Run the function from a clean project state for best results. |

