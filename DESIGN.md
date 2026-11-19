---
name: Editorial Audio Studio
colors:
  surface: "#f8f9ff"
  surface-dim: "#cbdbf5"
  surface-bright: "#f8f9ff"
  surface-container-lowest: "#ffffff"
  surface-container-low: "#eff4ff"
  surface-container: "#e5eeff"
  surface-container-high: "#dce9ff"
  surface-container-highest: "#d3e4fe"
  on-surface: "#0b1c30"
  on-surface-variant: "#3d4a42"
  inverse-surface: "#213145"
  inverse-on-surface: "#eaf1ff"
  outline: "#6d7a72"
  outline-variant: "#bccac0"
  surface-tint: "#006c4a"
  primary: "#006948"
  on-primary: "#ffffff"
  primary-container: "#00855d"
  on-primary-container: "#f5fff7"
  inverse-primary: "#68dba9"
  secondary: "#515f74"
  on-secondary: "#ffffff"
  secondary-container: "#d5e3fd"
  on-secondary-container: "#57657b"
  tertiary: "#006194"
  on-tertiary: "#ffffff"
  tertiary-container: "#007bb9"
  on-tertiary-container: "#fdfcff"
  error: "#ba1a1a"
  on-error: "#ffffff"
  error-container: "#ffdad6"
  on-error-container: "#93000a"
  primary-fixed: "#85f8c4"
  primary-fixed-dim: "#68dba9"
  on-primary-fixed: "#002114"
  on-primary-fixed-variant: "#005137"
  secondary-fixed: "#d5e3fd"
  secondary-fixed-dim: "#b9c7e0"
  on-secondary-fixed: "#0d1c2f"
  on-secondary-fixed-variant: "#3a485c"
  tertiary-fixed: "#cce5ff"
  tertiary-fixed-dim: "#93ccff"
  on-tertiary-fixed: "#001d31"
  on-tertiary-fixed-variant: "#004b73"
  background: "#f8f9ff"
  on-background: "#0b1c30"
  surface-variant: "#d3e4fe"
typography:
  headline-xl:
    fontFamily: Newsreader
    fontSize: 40px
    fontWeight: "400"
    lineHeight: 48px
    letterSpacing: -0.02em
  headline-xl-mobile:
    fontFamily: Newsreader
    fontSize: 30px
    fontWeight: "400"
    lineHeight: 38px
    letterSpacing: -0.015em
  headline-lg:
    fontFamily: Newsreader
    fontSize: 32px
    fontWeight: "400"
    lineHeight: 40px
    letterSpacing: -0.015em
  headline-lg-mobile:
    fontFamily: Newsreader
    fontSize: 24px
    fontWeight: "400"
    lineHeight: 32px
    letterSpacing: -0.01em
  headline-md:
    fontFamily: Newsreader
    fontSize: 24px
    fontWeight: "500"
    lineHeight: 32px
    letterSpacing: -0.01em
  headline-sm:
    fontFamily: Newsreader
    fontSize: 20px
    fontWeight: "500"
    lineHeight: 28px
  script-body:
    fontFamily: Newsreader
    fontSize: 19px
    fontWeight: "400"
    lineHeight: 32px
    letterSpacing: 0.005em
  body-lg:
    fontFamily: Plus Jakarta Sans
    fontSize: 16px
    fontWeight: "400"
    lineHeight: 26px
  body-md:
    fontFamily: Plus Jakarta Sans
    fontSize: 14px
    fontWeight: "400"
    lineHeight: 22px
  body-sm:
    fontFamily: Plus Jakarta Sans
    fontSize: 13px
    fontWeight: "400"
    lineHeight: 18px
  label-lg:
    fontFamily: Plus Jakarta Sans
    fontSize: 13px
    fontWeight: "600"
    lineHeight: 18px
    letterSpacing: 0.01em
  label-md:
    fontFamily: Plus Jakarta Sans
    fontSize: 12px
    fontWeight: "500"
    lineHeight: 16px
    letterSpacing: 0.02em
  label-sm:
    fontFamily: Plus Jakarta Sans
    fontSize: 11px
    fontWeight: "600"
    lineHeight: 14px
    letterSpacing: 0.04em
  mono-time:
    fontFamily: JetBrains Mono
    fontSize: 12px
    fontWeight: "500"
    lineHeight: 16px
    letterSpacing: 0.02em
rounded:
  sm: 0.25rem
  DEFAULT: 0.5rem
  md: 0.75rem
  lg: 1rem
  xl: 1.5rem
  full: 9999px
spacing:
  gutter: 1rem
  gutter-desktop: 1.5rem
  margin: 1.25rem
  margin-desktop: 2.5rem
  space-xs: 0.25rem
  space-sm: 0.5rem
  space-md: 1rem
  space-lg: 1.5rem
  space-xl: 2.5rem
---

## Brand & Style

This design system embodies an editorial audio suite that marries the disciplined clarity of modern developer-grade tooling with the typographic poise of a literary journal. Tailored for narrative podcasters, voice directors, audiobook producers, and scriptwriters, the interface replaces traditional audio-software clutter—racks of pseudo-analog dials, dense waveforms, and skeuomorphic switches—with an uncluttered, distraction-free environment.

The aesthetic fuses Minimalist Precision with Contemporary Editorial Craft:

- **Calm, Intentional Focus:** Audio creation requires deep, uninterrupted listening. Visual noise is minimized so that script nuance and audio timeline clarity take precedence.
- **Warm Architectural Rigor:** Inspired by restrained Swiss layout and high-end print publications, the system establishes structure through measured typography, hairline division, and generous, rhythmic whitespace.
- **Restrained Tactility:** Interactions feel featherweight yet tactile—soft ambient depth, crisp hair-thin dividers, and precise, purposeful motion.

## Colors

The palette is anchored in crisp, light-mode surfaces with high-fidelity typographic contrast, counterbalanced by an authoritative emerald accent that signifies audio vitality, live recording, and focused playback.

### Surface Hierarchy

- **Canvas Base (`#F8FAFC`):** The ambient studio canvas, establishing warm, low-glare depth behind modular panels.
- **Surface Elevation (`#FFFFFF`):** Work surfaces, focused script cards, and audio inspector docks.
- **Surface Muted (`#F1F5F9`):** Inactive tracks, secondary tool rails, and contextual drawer headers.
- \*\*Surface Translucent (`rgba(255, 255, 255, 0.85)`): Floating transport bars and active inspector overlays paired with backdrop blur.

### Typographic Contrast

- **Ink Primary (`#0F172A`):** Deep charcoal slate reserved for editorial headings, script dialogue, and active control values. Avoid absolute `#000000` to preserve literary warmth.
- **Ink Secondary (`#334155`):** Slate for structural metadata, speaker labels, track annotations, and timecodes.
- **Ink Muted (`#64748B`):** Neutral gray for disabled states, secondary cues, shortcuts, and placeholder text.

### Accents & Character Roles

- **Primary Emerald (`#059669` / `#10B981`):** Action drivers, transport triggers, waveform scrubbers, and active voice channel indicators.
- **Hairline Dividing Tone (`#E2E8F0`):** Ultra-subtle borders that structure modules without fragmenting the canvas.
- **Character Tonal Badges:** Desaturated, soft pastel tints ensure speaker attribution is identifiable without disrupting overall visual quiet:
  - _Speaker A / Cyan:_ `#0284C7` (Text), `#F0F9FF` (Fill), `#BAE6FD` (Border)
  - _Speaker B / Violet:_ `#7C3AED` (Text), `#F5F3FF` (Fill), `#DDD6FE` (Border)
  - _Speaker C / Amber:_ `#D97706` (Text), `#FFFBEB` (Fill), `#FDE68A` (Border)
  - _Speaker D / Rose:_ `#E11D48` (Text), `#FFF1F2` (Fill), `#FECDD3` (Border)

## Typography

The dual typographic engine balances structural utility against literary immersion:

- **Editorial Narrative Engine (Newsreader):** Used for script content, project titles, chapter breaks, and performance annotations. Its organic serifs provide visual breathing room during long recording and review sessions, treating spoken dialogue with literary reverence.
- **Productivity & UI Engine (Plus Jakarta Sans):** Drives navigation, timeline tracks, parameter inspectors, and interactive tooltips. Clean geometric shapes and open counters maintain effortless scanning at micro scales.
- **Technical Monospace (JetBrains Mono):** Reserved strictly for audio timecodes, decibel readouts (dBFS), latency values, and sample rates to guarantee tabular alignment during real-time playback.

## Layout & Spacing

The layout philosophy mirrors an editor’s worktable: structured, open, and modular. The workspace eliminates arbitrary padding variations by conforming to an explicit 4px baseline rhythm.

### Grid & Canvas Structure

- **Desktop Studio (12-Column Fluid):** Divided into three functional panes:
  1. _Left Navigation & Cast Rail:_ Fixed width (260px) or collapsible to 64px icon rail.
  2. _Center Script & Acoustic Stage:_ Fluid workspace spanning 6–8 columns with constrained reading width (max 720px) to safeguard typographic cadence.
  3. _Right Audio Inspector & Waveform Console:_ Fixed width (340px) with dedicated parameter stacks.
- **Tablet Studio (8-Column Fluid):** Audio Inspector converts to a slide-over sheet; the script stage retains priority.
- **Mobile Director (4-Column Fluid):** Stacks script blocks linearly; the playback scrubber and transport lock to a persistent bottom dock with safe-area padding.

### Spatial Rhythm

- **Rhythmic Gapping:** `space-xs` (4px) separates tight icon-label pairings; `space-sm` (8px) separates list elements and metadata chips; `space-md` (16px) defines default component card padding; `space-lg` (24px) partitions functional panels; `space-xl` (40px) frames major editorial segments and script scenes.

## Elevation & Depth

Visual hierarchy relies on delicate tonal layering and micro-diffused light rather than heavy dark drop shadows. Depth mimics finely milled stationery stacked on an architect's desk.

### Surface Elevation Principles

- **Base Canvas (Level 0):** Pure `#F8FAFC`. Completely flat; structural layout boundary.
- **Milled Panels (Level 1):** Pure `#FFFFFF` surface bounded by a crisp hairline border (`1px solid #E2E8F0`). Shadow is intentionally absent or limited to: `0 1px 2px rgba(15, 23, 42, 0.03)`.
- **Floating Controls & Toolbars (Level 2):** Elevated transport controllers, floating script commentary tags, and active drop-downs use a composite ambient shadow:
  - `box-shadow: 0 4px 16px -2px rgba(15, 23, 42, 0.05), 0 2px 6px -1px rgba(15, 23, 42, 0.03);`
  - Border: `1px solid rgba(226, 232, 240, 0.8)`.
  - Surface: `rgba(255, 255, 255, 0.92)` with `backdrop-filter: blur(12px)`.
- **Modals & Focus Overlays (Level 3):** Session setup, voice casting matrix, and export windows use:
  - `box-shadow: 0 20px 40px -12px rgba(15, 23, 42, 0.08), 0 0 1px 1px rgba(15, 23, 42, 0.04);`
  - Scrim: `#0F172A` with `opacity: 0.2` and `backdrop-filter: blur(4px)`.

## Shapes

The design system maintains a balanced geometry—neither aggressively boxy nor overly bulbous. Radius token `2` defines the foundation:

- **Core Controls (`rounded` / 0.5rem - 8px):** Applied to buttons, input text boxes, playback meters, and timeline clip modules.
- **Card Enclosures (`rounded-lg` / 1rem - 16px):** Script dialogue segments, audio take blocks, and studio control pods.
- **Floating Palettes & Dialogs (`rounded-xl` / 1.5rem - 24px):** Floating transport hubs and contextual action bars.
- **Indicators & Speaker Badges (`pill-shaped` / 9999px):** Character role tags, voice preset chips, and status markers retain total curvature to immediately separate continuous UI frames from discrete semantic tags.

## Components

### Buttons

- **Primary:** Solid `#059669` fill with `#FFFFFF` text. Subtle hover shift to `#047857`. Focus ring: 2px offset with `rgba(5, 150, 105, 0.3)`. Height: 36px (compact) or 42px (standard).
- **Secondary / Outline:** Pure `#FFFFFF` background with `1px solid #E2E8F0` border and `#334155` text. On hover: background shifts to `#F8FAFC`, border to `#CBD5E1`.
- **Ghost / Minimal:** Transparent background, `#334155` text. On hover: `#F1F5F9`. Used for secondary studio shortcuts, mute toggles, and script alignment buttons.

### Character Chips & Speaker Tags

- **Structure:** Pill-shaped (`border-radius: 9999px`), 24px height, padding: `2px 10px`.
- **Style:** Subtle colored background tint at 10% opacity, crisp 1px border matching the accent, accompanied by a 6px solid dot indicator and text set in `label-sm`.
- **States:** Interactive hover deepens the border; active selection produces a faint ambient ring.

### Input Fields & Scrubbers

- **Text Inputs:** `#FFFFFF` background with `1px solid #E2E8F0` border, `rounded` (8px). Focused state elevates the border to `#059669` without heavy glow (replaces with crisp `box-shadow: 0 0 0 1px #059669`).
- **Audio Slider / Numeric Scrubber:** Low-profile 4px track in `#E2E8F0`, active progression in `#059669`. Scrubber handle: 14px solid white circle with hairline border and micro shadow (`0 1px 3px rgba(0,0,0,0.1)`).

### Script Cards (Dialogue Blocks)

- **Container:** Minimal panel with `rounded-lg` (16px), styled in `#FFFFFF` with `1px solid #E2E8F0`. Padding: `space-md` to `space-lg`.
- **Left Margin Spine:** 3px vertical accent border tinted to the speaker's assigned character color, providing immediate visual anchoring.
- **Content Flow:** Header displays character badge + take selector; dialogue text is rendered cleanly in `script-body` (`Newsreader`, 19px).

### Audio Lists & Take Selectors

- **Rows:** Divided by single-pixel hairline borders (`#F1F5F9`). Alternating zebra fills are prohibited; differentiation relies on hover highlight (`#F8FAFC`).
- **Waveform Snippet:** Integrated waveform rendered in monochromatic `#94A3B8` (unplayed) and `#059669` (played / active take).

### Checkboxes & Toggle Switches

- **Checkboxes:** 18x18px square with 4px border radius. Inactive: `1.5px solid #CBD5E1`. Checked: Solid `#059669` fill with crisp white check glyph.
- **Toggles (Solo / Mute / Automation):** Pill track (36x20px) in `#E2E8F0`, sliding thumb (16x16px) in `#FFFFFF`. Active state transitions track to `#059669`.

### Studio Transport Bar (Specialized Component)

- **Form:** Centered floating island pinned 24px above viewport bottom.
- **Construction:** Frosted glass (`rgba(255, 255, 255, 0.92)` + 12px blur), bordered in `#E2E8F0`, `rounded-xl` shape. Houses primary record trigger (crimson micro-dot), emerald master play button, scrub timecode (`mono-time`), and master output VU meter.
