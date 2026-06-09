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

### Customization & License

- **Settings & Theme** button at the bottom of the panel: Dark/Light theme, accent color (6 presets or any custom hex), zoom intensity and duration. All settings persist between sessions.
- **License system**: enter your `EHP-XXXX-XXXX-XXXX` key in Settings to switch from Trial to Licensed. Sellers generate keys with `tools/generate_license_key.jsx`.

### Project

| Button | Description |
|---|---|
| **Auto Precomp Selected** | Pre-composes selected layers into a new composition named `EH_Precomp_01` (auto-increments if the name already exists). |
| **Organize Project** | Creates five standard folders (`01_Comps`, `02_Footage`, `03_Audio`, `04_Precomps`, `05_Solids`) and moves every project item into the appropriate folder based on its type. |

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
