# Changelog — FXCore

All notable changes to this project are documented in this file.

Format: `[Version] — YYYY-MM-DD`

---

## [1.3.0] — 2026-06-13

### Added — Favorites & Recently Used

- Every effect card now has a ☆ star toggle to mark it as a favorite.
- New **Favorites** section in the sidebar lists every starred effect for one-click access.
- New **"Récemment utilisés"** section on the Home page automatically tracks your last 5 actions.
- Both lists persist between sessions.

---

## [1.2.0] — 2026-06-13

### New UI — Sidebar navigation + Home page

- Replaced the horizontal tab bar with a compact left **sidebar** (icon + label nav) and a content area on the right — matches the "premium script pro" look (near-black/violet palette, glow accents).
- New **Home** section: quick-launch cards for the best combo templates (Anime Impact, Intro Punch, Glitch Transition, Cinematic Reveal) plus the most-used project actions (Auto Precomp, Organize Project, Clean EH_ Layers) — no more digging through tabs for the essentials.
- Updated dark palette to the new FXCore brand colors (#0B0B12 background, #141421 panels, #8B35FF accent, #F2F2F2 text, #9A9AAF muted text).
- All existing tabs (Edit, Text, Sounds, Overlays, Templates, Transitions, Camera, AI Chat) are now sidebar sections with the same scrollable layout as before.

---

## [1.1.0] — 2026-06-12

### Added — Auto-Update

- The panel checks `version.txt` on the repo at launch (max once a day) and, if a newer version exists, offers to download `FXCore.jsx` and replace the installed script automatically (uses `curl`, built into Windows 10+ and macOS).
- New **"Mises à jour"** section in Settings: toggle the launch check on/off and a **"Vérifier maintenant"** button for a manual check.
- Sanity checks prevent a failed/invalid download from overwriting a working install; if the script folder is write-protected, the downloaded file path is shown for manual replacement.

### Fixed — UI polish

- Scrollable tabs: every long tab now has a working scrollbar, refreshed on resize and tab change.
- Feature buttons are full "cards": the neon frame wraps the button **and** its description; labels vertically centered.
- Logo header no longer clips the FX/CORE wordmark; version shown on the right.
- Section headers no longer clip their title; the rule starts after the text.
- The layout re-flows cleanly when the panel is resized.

---

## [1.0.0] — 2026-06-12

### Rebrand — FXCore

- Renamed the project from **"Edit Helper Panel"** to **"FXCore"** (file renamed to `FXCore.jsx`, panel opens via **Window > FXCore**).
- New default visual identity matching the FXCore marketing posters:
  - Near-black dark theme background and panel colors with a purple tint.
  - New default accent color **FXCore Purple (#9D5CFF)**, added as the first accent preset.
  - Feature buttons now draw a glowing neon outline in the accent color (brighter on hover).
  - New branded logo header at the top of the panel: glowing bolt icon + split-color "FX"/"CORE" wordmark.
- License key format changed from `EHP-XXXX-XXXX-XXXX` to `FXC-XXXX-XXXX-XXXX` (existing EHP keys are no longer valid — contact for a new key).
- Settings are stored under a new settings key; existing users will start with default settings once after updating.

---

## [0.9.0] — 2026-06-11

### Added — Camera Rig / 3D Movement

- New **"Camera"** tab:
  - **Create Camera Rig** — adds a one-node camera ("EH_Camera") parented to a 3D null ("EH_Camera_Null") so the whole scene can be animated through one object.
  - **Camera Zoom Push In / Out** — animates the camera Zoom over 16 frames (creates a rig automatically if none exists).
  - **Cinematic Dolly In / Out** — animates the rig's Position Z across the whole comp duration.
  - **Parallax Setup** — enables 3D on the selected layers and spreads them across Z depth.
  - **Smooth Rotation** — animates a slow +15° rotation of the selected layers across the comp.
  - **3D Camera Shake** — continuous 3D wiggle (position + orientation) on the camera rig.
  - **Fake Handheld Camera** — subtle continuous wiggle on the camera rig for a handheld feel.
- All new actions are available in the AI Chat assistant.

---

## [0.8.0] — 2026-06-11

### Added — Speed Ramp Helper

- New **"SPEED RAMP"** section in the Transitions tab (Time Remapping based):
  - **Slow → Fast** — layer starts at 25% speed and accelerates to normal across its duration.
  - **Fast → Slow** — layer starts at 75% speed and decelerates across its duration.
  - **Impact Freeze → Speed** — freezes the frame at the playhead for 6 frames, then ramps into a fast finish.
  - **Beat Ramp** — alternates fast/slow segments between every comp marker (use with Auto Music Markers).
  - **Add Motion Blur** — enables comp + layer Motion Blur.
  - **Add Frame Blend** — enables comp + layer Frame Blending (Pixel Motion).
- All new actions are available in the AI Chat assistant.

---

## [0.7.0] — 2026-06-11

### Added — Transition Builder

- New **"Transitions"** tab with one-click cut transitions, applied at the playhead on the selected layer(s) (unless noted):
  - **Whip Pan Left / Right** — fast Position move with Motion Blur (8 frames).
  - **Slide From Left / Right / Top / Bottom** — layer slides off-comp with Motion Blur (12 frames).
  - **Spin Blur Transition** — 2 full rotations + scale-up with Motion Blur (8 frames).
  - **Zoom Blur Transition** — rapid 4x scale with Motion Blur (8 frames).
  - **RGB Glitch Transition** — RGB Split + animated Wave Warp on an adjustment layer (8 frames).
  - **Flash Cut** — very short (2-frame) white flash for a hard cut, applies to the whole comp.
  - **Camera Shake Transition** — short, intense non-destructive shake (10 frames), applies to the whole comp.
  - **Warp / Distort Transition** — animated Turbulent Displace on an adjustment layer (8 frames), applies to the whole comp.
- All transitions are available in the AI Chat assistant.

---

## [0.6.0] — 2026-06-11

### Added — Beat Sync, Render Queue & Project Cleaner Pro

- **Beat Sync** (Sounds tab, new "BEAT SYNC" section): apply effects on every composition marker placed by Auto Music Markers.
  - **Flash on Every Beat** — white flash (6 frames) on each marker.
  - **Shake on Markers** — Quick Shake Medium (non-destructive) on each marker.
  - **Zoom Punch on Beats** — Punch In→Out on selected layers at each marker.
  - **RGB Split on First Beat** — applies RGB Split once, synced to the first marker (avoids creating duplicate layer stacks per beat).
  - **Anime Beat Pack** — combo of Flash + Shake + Zoom Punch on every marker.
  - Confirmation prompt if more than 30 markers are detected (large layer count).
- **Add to Render Queue** (Edit tab, PROJECT section): adds the active composition to After Effects' Render Queue.
- **Find Missing Footage** (Edit tab, PROJECT section): lists all project items with missing source media.
- **Remove Unused Footage** (Edit tab, PROJECT section): finds and removes (with confirmation) footage items not used in any composition.
- All new actions are available in the AI Chat assistant.

---

## [0.5.1] — 2026-06-11

### Added — Auto Music Markers

- **Auto Music Markers** (Sounds tab, new "MARQUEURS" section): dialog to enter a BPM, marker interval (every 1/2/4/8 beats) and start time, then drops composition markers ("Beat") across the whole comp duration — useful for cutting on the beat. Option to clear existing markers first.
- Available in the AI Chat assistant (`autoMusicMarkers`).

---

## [0.5.0] — 2026-06-11

### Added — Color Grading, Templates & Project Tools

- **Color Grading presets** (Overlays tab, new "COLOR GRADING" section): **Teal & Orange**, **Moody Cinematic**, **Pastel Anime**, **High Contrast B&W** — each adds an `EH_Grade_<name>` adjustment layer with native Brightness & Contrast 2, Hue/Saturation, and Tint effects.
- **TikTok Caption Style** (Text tab): applies a black Stroke + Drop Shadow (Layer Styles) to selected text layers and runs the Bounce In animation.
- **Clean EH_ Layers** (Edit tab, PROJECT section): removes every layer in the active comp whose name starts with `EH_`, with a confirmation alert showing the count removed.
- **New "Templates" tab** with 4 one-click sequence combos:
  - **Intro Punch** — Punch In-Out + Shake Medium + White Flash + Glow Boost.
  - **Anime Impact** — Black Flash + Speed Lines + Shake Heavy + Smooth Zoom In.
  - **Glitch Transition** — RGB Split + VHS Glitch + Shake Medium.
  - **Cinematic Reveal** — Smooth Zoom In + Tint Cinematic + Vignette + Film Grain.
- All new actions are available in the AI Chat assistant (local keyword matching + AI Bridge).

---

## [0.4.0] — 2026-06-11

### Changed — UI overhaul

- All actions are now real ScriptUI **`button`** elements (previously custom-drawn `group`s, which could overlap or fall outside the visible area in narrow docked panels and become unclickable).
- **Single-column layout** in every tab — removed the 2-column compact rows that caused clipping on narrow panel widths.
- Each button now has a **short description** displayed underneath it (small grey text), explaining exactly what the action does, in addition to the existing tooltip.
- The panel now relies on After Effects' native scrolling for docked ScriptUI panels when content exceeds the visible height.

### Added — AI Chat tab

- New **"AI Chat"** tab: type a request in plain language (French or English) and the assistant applies the corresponding action directly in the active composition.
- **Local mode** (default, no setup): a keyword matcher maps your message to one of ~30 actions covering every feature in Edit / Text / Overlays.
- **AI Bridge mode** (optional): point the panel to a local server (`host:port`) in Settings. The panel sends `{"message": "..."}` over plain TCP and expects `{"action": "<key>", "reply": "<text>"}` back. This lets you connect a real LLM (Claude, GPT…) — see the "AI Bridge" section in README.md for the protocol and a sample server.
- New `aiBridgeHost` setting, persisted via `app.settings`.

---

## [0.3.0] — 2026-06-09

### Added

**UI**
- Tabbed layout: **Edit** / **Text** / **Sounds** / **Overlays** — panel height stays compact.
- Compact 2-column button rows for grouped features.
- All new icons drawn via ScriptUI graphics API (fully vectoriel, theme-aware).

**Text Animations (Tab "Text")**
- **Typewriter** — character-by-character opacity reveal, 24 frames.
- **Fade Up** — words fade in from 40 px below, 18 frames, word-based selector.
- **Word Reveal** — word-by-word opacity reveal, 20 frames.
- **Bounce In** — characters scale from 0 → 120 → 100 % with Easy Ease.
- **Slide From Left / Right / Top / Bottom** — line-based position + opacity animator.
- **Glitch Text** — position jitter + opacity flicker via expressions on the animator.

**Sound Bank (Tab "Sounds")**
- Folder browser: choose any local folder with audio files.
- Listbox listing all `.wav/.mp3/.aif/.aiff/.m4a/.ogg/.flac` files found in the folder.
- Click or double-click to import and place the sound at the current time in the active comp.
- Re-uses already-imported footage instead of duplicating project items.
- Folder path persisted between sessions via `app.settings`.

**Overlays (Tab "Overlays")**
- **Film Grain** — `Add Grain` effect on adjustment layer.
- **Vignette** — dark solid with inverted feathered ellipse mask.
- **Light Leak** — warm amber solid, Fractal Noise, Add blend, animated pan.
- **Dust & Scratches** — high-contrast narrow Fractal Noise, Screen blend.
- **Scanlines** — Grid effect on solid, Multiply blend.
- **VHS Glitch** — Wave Warp + Noise + Hue/Saturation desaturation on adj layer.
- **Lens Flare** — native Lens Flare effect on solid, Add blend.
- **Color Tints** — 4 presets via native Tint effect: Cinematic, Anime Warm, Night Blue, Ski/Snow.

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

