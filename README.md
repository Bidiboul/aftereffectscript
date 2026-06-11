# Edit Helper Panel

**A ScriptUI panel for Adobe After Effects that helps video editors save time with one-click effects for TikTok, anime, gaming, and action edits.**

Compatible with **After Effects 2024 and later**.

---

## Installation

See [INSTALLATION.md](INSTALLATION.md) for full instructions.

---

## Features

### Layers

| Button | Description |
|---|---|
| **Create Adjustment Layer** | Adds an `EH_Adjustment` layer above the selected layers, or spanning the full composition if nothing is selected. |
| **White Flash** | Creates a 6-frame white solid (`EH_White_Flash`) starting at the current time with an opacity fade from 100 % to 0 %. |
| **Black Flash** | Same as White Flash but black (`EH_Black_Flash`). |

### Zooms

| Button | Description |
|---|---|
| **Smooth Zoom In** | Eased scale-up on selected layers (default +15 % over 12 frames — both configurable in Settings). |
| **Smooth Zoom Out** | Eased scale-down on selected layers. |
| **Punch Out-In** | Zoom out then back to the original scale — recoil effect. |
| **Punch In-Out** | Zoom in then back — impact effect. |

### Shakes

| Button | Description |
|---|---|
| **Quick Shake — Light / Medium / Heavy** | Non-destructive shake on a dedicated adjustment layer (native Transform effect + wiggle), lasting 10 frames from the playhead. Your footage is never touched. |
| **Impact Shake (expression)** | Applies `wiggle(18, 35)` directly to the **Position** property of selected layers. |

### Effects

| Button | Description |
|---|---|
| **RGB Split** | True R/G/B channel separation: 3 duplicates with native **Shift Channels** (one channel each), pixel offsets and Add blend mode. |
| **Glow Boost** | Adds After Effects' native **Glow** effect to each selected layer (Threshold 60 %, Radius 35 px, Intensity 1.5). |
| **Speed Lines (anime)** | Radial anime-style speed lines overlay — Fractal Noise + Polar Coordinates, Screen blend, animated. 100 % native effects. |
| **Freeze Frame** | Splits the selected layer at the playhead and holds the frame with time remapping. |

### Sounds (Tab "Sounds")

| Button | Description |
|---|---|
| **Auto Music Markers** | Opens a dialog to enter a BPM, marker interval (every 1/2/4/8 beats) and start time, then drops composition markers ("Beat") across the whole comp duration — great for cutting on the beat. Optionally clears existing markers first. |
| **Sound folder browser** | Choose a local folder; lists all `.wav/.mp3/.aif/.aiff/.m4a/.ogg/.flac` files. Click or double-click to import and place at the current time. |

### Beat Sync (Tab "Sounds")

Apply effects automatically on every composition marker — pairs with **Auto Music Markers**.

| Button | Description |
|---|---|
| **Flash on Every Beat** | White flash (6 frames) on every marker. |
| **Shake on Markers** | Quick Shake Medium (non-destructive) on every marker. |
| **Zoom Punch on Beats** | Punch In→Out on the selected layers at every marker. |
| **RGB Split on First Beat** | Applies RGB Split once, synced to the first marker (avoids stacking duplicate layers per beat). |
| **Anime Beat Pack** | Combo: Flash + Shake + Zoom Punch (if a layer is selected) on every marker. |

> If more than 30 markers are detected, a confirmation dialog warns about the number of layers that will be created.

### Transitions (Tab "Transitions")

One-click cut transitions, applied at the playhead on the selected layer(s) unless noted.

| Button | Description |
|---|---|
| **Whip Pan Left / Right** | Fast Position move with Motion Blur (8 frames). |
| **Slide From Left / Right / Top / Bottom** | Layer slides off-comp with Motion Blur (12 frames). |
| **Spin Blur Transition** | 2 full rotations + scale-up with Motion Blur (8 frames). |
| **Zoom Blur Transition** | Rapid 4x scale with Motion Blur (8 frames). |
| **RGB Glitch Transition** | RGB Split + animated Wave Warp on an adjustment layer (8 frames). |
| **Flash Cut** | Very short (2-frame) white flash for a hard cut — applies to the whole comp. |
| **Camera Shake Transition** | Short, intense non-destructive shake (10 frames) — applies to the whole comp. |
| **Warp / Distort Transition** | Animated Turbulent Displace on an adjustment layer (8 frames) — applies to the whole comp. |

### Speed Ramp Helper (Tab "Transitions")

Time Remapping based tools for speed effects on the selected layer(s).

| Button | Description |
|---|---|
| **Slow → Fast** | Layer starts at 25% speed and accelerates to normal across its duration. |
| **Fast → Slow** | Layer starts at 75% speed and decelerates across its duration. |
| **Impact Freeze → Speed** | Freezes the frame at the playhead for 6 frames, then ramps into a fast finish. |
| **Beat Ramp** | Alternates fast/slow segments between every composition marker — use with Auto Music Markers. |
| **Add Motion Blur** | Enables comp + layer Motion Blur. |
| **Add Frame Blend** | Enables comp + layer Frame Blending (Pixel Motion). |

### AI Chat (Tab "AI Chat")

Type a request in plain language and the assistant applies the corresponding action directly to your composition — no menus to dig through.

**Local mode (works out of the box, no setup):** a built-in keyword matcher recognizes phrases like:
- "ajoute un white flash" / "add a white flash"
- "zoom in sur la sélection"
- "applique un glitch sur le texte"
- "ajoute un light leak"
- "organise le projet"

**AI Bridge mode (optional, for a real LLM):** if you want Claude/GPT/etc. to interpret more complex or ambiguous requests, run a small local server and enter its `host:port` in Settings. Protocol:

- The panel opens a plain TCP socket to `host:port` and sends one line:
  ```json
  {"message": "ajoute un zoom in puis un glitch sur le texte"}
  ```
- Your server replies with one line:
  ```json
  {"action": "zoomIn", "reply": "Zoom in appliqué !"}
  ```
- `action` must be one of the keys in the `DISPATCH` table inside `EditHelperPanel.jsx` (e.g. `whiteFlash`, `zoomIn`, `rgbSplit`, `textGlitch`, `overlayLightLeak`, …). The panel executes the matching function and shows `reply` in the chat.
- If the bridge is unreachable, returns invalid JSON, or `action` isn't recognized, the panel automatically falls back to local keyword matching.

> ExtendScript's `Socket` object only supports plain TCP (no TLS), so the bridge must be a small local process — e.g. a Node.js or Python script on `127.0.0.1` that calls the Claude/OpenAI API over HTTPS on your behalf and forwards a one-line JSON response back to the panel.

### Customization & License

- **Settings & Theme** button at the bottom of the panel: Dark/Light theme, accent color (6 presets or any custom hex), zoom intensity and duration. All settings persist between sessions.
- **License system**: enter your `EHP-XXXX-XXXX-XXXX` key in Settings to switch from Trial to Licensed. Sellers generate keys with `tools/generate_license_key.jsx`.

### Project

| Button | Description |
|---|---|
| **Auto Precomp Selected** | Pre-composes selected layers into a new composition named `EH_Precomp_01` (auto-increments if the name already exists). |
| **Organize Project** | Creates five standard folders (`01_Comps`, `02_Footage`, `03_Audio`, `04_Precomps`, `05_Solids`) and moves every project item into the appropriate folder based on its type. |
| **Clean EH_ Layers** | Removes every layer in the active comp whose name starts with `EH_` (all panel-generated layers), with a confirmation showing how many were removed. |
| **Find Missing Footage** | Lists every project item with missing source media. |
| **Remove Unused Footage** | Finds footage items not used in any composition and removes them after confirmation. |
| **Add to Render Queue** | Adds the active composition to After Effects' Render Queue. |

### Color Grading (Tab "Overlays")

| Button | Description |
|---|---|
| **Teal & Orange** | Classic cinematic grade — blue-green shadows, orange highlights, boosted contrast. |
| **Moody Cinematic** | Dark, desaturated, high-contrast dramatic look. |
| **Pastel Anime** | Soft, bright colors with increased saturation, anime-style. |
| **High Contrast B&W** | Full desaturation with strong contrast boost. |

Each preset adds an `EH_Grade_<name>` adjustment layer using native Brightness & Contrast 2, Hue/Saturation, and Tint effects.

### TikTok Caption Style (Tab "Text")

| Button | Description |
|---|---|
| **TikTok Caption Style** | Adds a black Stroke + Drop Shadow (Layer Styles) to the selected text layer(s), then plays the Bounce In animation. |

### Sequence Templates (Tab "Templates")

One-click combos that chain multiple existing actions:

| Button | Description |
|---|---|
| **Intro Punch** | Punch In-Out + Shake Medium + White Flash + Glow Boost. |
| **Anime Impact** | Black Flash + Speed Lines + Shake Heavy + Smooth Zoom In. |
| **Glitch Transition** | RGB Split + VHS Glitch + Shake Medium. |
| **Cinematic Reveal** | Smooth Zoom In + Tint Cinematic + Vignette + Film Grain. |

---

## How to test

1. Open After Effects and create a new project with at least one composition.
2. Add some footage or shape layers to the composition.
3. Select one or more layers and click any panel button.
4. Each action can be undone with **Ctrl / Cmd + Z**.

---

## Roadmap V2

Planned improvements for the next commercial release:

- **Customizable presets** — save and load your own effect combinations with a single click.
- **Modern UI** — redesigned interface with icons, color-coded sections, and dark/light theme support.
- **License system** — serial-key or online activation to protect the paid product.
- **Export / Import presets** — share preset packs as `.json` files with the community.
- **Anime transitions** — zoom cuts, speed lines overlay, flash-pan transitions, impact freeze frames.
- **Gaming / Valorant pack** — kill-feed animations, rank-up reveals, clutch slow-motion effects.
- **Ski / Action sports pack** — speed ramp helpers, POV shake presets, slope-color grade shortcuts.
- **Batch rendering helpers** — queue multiple comps with one click using a preferred output module.
- **Layer tagging** — mark layers with custom tags to quickly identify them in complex timelines.

---

## Limitations & Known Issues

See the "Known Issues" section at the bottom of [CHANGELOG.md](CHANGELOG.md).

---

## License

Private / Commercial — all rights reserved.  
Contact: leandre.pedro55@gmail.com
