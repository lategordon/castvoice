# Stitch MCP Commands & API Reference Guide

> **Stitch Overview**: [Stitch](https://stitch.withgoogle.com) is Google's AI-powered design and frontend engineering platform that generates production-ready UI designs, layouts, and clean frontend code from text prompts, sketches, and design tokens.
> 
> The **Stitch MCP Server** integrates directly into your agent environment (via `call_mcp_tool` with `ServerName: "stitch"`), allowing agents to autonomously create projects, generate screens, iterate on layouts, apply design systems, and extract generated HTML and screenshot assets directly into your workspace.

---

## Table of Contents
1. [Core Architectural Concepts & ID Formats](#1-core-architectural-concepts--id-formats)
2. [Quick Reference Table](#2-quick-reference-table)
3. [Project Management Commands](#3-project-management-commands)
4. [Screen Generation & AI Iteration Commands](#4-screen-generation--ai-iteration-commands)
5. [Screen Inspection & Code Download Commands](#5-screen-inspection--code-download-commands)
6. [Design Systems & Theming Commands](#6-design-systems--theming-commands)
7. [End-to-End Operational Workflows](#7-end-to-end-operational-workflows)
8. [Best Practices & Timeout Troubleshooting](#8-best-practices--timeout-troubleshooting)
9. [Prompting Antigravity to Use Stitch (With Real-World Examples)](#9-prompting-antigravity-to-use-stitch-with-real-world-examples)

---

## 1. Core Architectural Concepts & ID Formats

When interacting with Stitch MCP tools, be aware of the two different identifier formats used across the API:

| Identifier Type | Format | Example | Where Used |
| :--- | :--- | :--- | :--- |
| **Raw Project ID** | Numeric string (no prefix) | `'4044680601076201931'` | `projectId` parameter in `generate_screen_from_text`, `list_screens`, `upload_design_md`, `apply_design_system`, etc. |
| **Project Resource Name** | `projects/{project}` | `'projects/4044680601076201931'` | `name` parameter in `get_project`, `update_project`, `delete_project` |
| **Screen Resource Name** | `projects/{project}/screens/{screen}` | `'projects/4044680601076201931/screens/98b50e2ddc9943efb387052637738f61'` | `name` parameter in `get_screen`, `update_screen`, and `sourceScreen` in instance refs |
| **Screen Instance ID** | Hex / UUID string | `'98b50e2ddc9943efb387052637738f61'` | Canvas placement references in `selectedScreenInstances`, `selectedScreenIds` |
| **File Resource Name** | `projects/{project}/files/{file}` | `'projects/4044680601076201931/files/ea26dc974c014bf28342b805ed0b7cfc'` | `name` parameter in `download_file` |
| **Asset Resource Name** | `assets/{asset_id}` or `{asset_id}` | `'assets/15996705518239280238'` | Design system identifier |

---

## 2. Quick Reference Table

| Tool Name | Category | Primary Purpose | Key Parameters |
| :--- | :--- | :--- | :--- |
| [`create_project`](#create_project) | Projects | Create a new design container | `title` (optional) |
| [`get_project`](#get_project) | Projects | Retrieve canvas state & screen list | `name` (required) |
| [`list_projects`](#list_projects) | Projects | List user-owned or shared projects | `pageSize`, `pageToken`, `filter` |
| [`update_project`](#update_project) | Projects | Update title, theme, canvas layout | `name`, `title`, `screenInstances`, `updateMask` |
| [`delete_project`](#delete_project) | Projects | Permanently delete project | `name` (required) |
| [`generate_screen_from_text`](#generate_screen_from_text) | Generation | Create a new UI screen from prompt | `projectId`, `prompt`, `deviceType`, `modelId` |
| [`edit_screens`](#edit_screens) | Generation | Modify existing screen via instructions | `projectId`, `selectedScreenIds`, `prompt` |
| [`generate_variants`](#generate_variants) | Generation | Create 1–5 design variations | `projectId`, `selectedScreenIds`, `variantOptions` |
| [`list_screens`](#list_screens) | Screens | List all screens in a project | `projectId` (required) |
| [`get_screen`](#get_screen) | Screens | Inspect screen files & metadata | `name` (required) |
| [`download_file`](#download_file) | Screens | Download HTML or PNG screenshot | `name` (file resource name) |
| [`update_screen`](#update_screen) | Screens | Push modified HTML/PNG to screen | `name`, `htmlCodeBase64`, `screenshotBase64` |
| [`create_design_system`](#create_design_system) | Theming | Define colors, typography, tokens | `designSystem`, `projectId` |
| [`update_design_system`](#update_design_system) | Theming | Modify tokens & apply to project | `name`, `projectId`, `designSystem` |
| [`list_design_systems`](#list_design_systems) | Theming | View project or global themes | `projectId` (optional) |
| [`apply_design_system`](#apply_design_system) | Theming | Reskin screens with a theme | `projectId`, `assetId`, `selectedScreenInstances` |
| [`upload_design_md`](#upload_design_md) | Theming | Upload raw `DESIGN.md` (base64) | `projectId`, `designMdBase64` |
| [`create_design_system_from_design_md`](#create_design_system_from_design_md) | Theming | Convert uploaded markdown to theme | `projectId`, `selectedScreenInstance`, `deviceType` |

---

## 3. Project Management Commands

### `create_project`
Creates a brand new Stitch project container.

- **Parameters**:
  - `title` *(string, optional)*: A descriptive human-readable title (e.g., `"CastVoice Audio Studio"`).
- **Example Call**:
  ```json
  {
    "title": "CastVoice Mobile App"
  }
  ```
- **Returns**: Project metadata including `name` (e.g. `projects/4044680601076201931`), `id`, `createTime`, and `updateTime`.

---

### `get_project`
Retrieves project details, screen instances on the canvas, layouts, dimensions, and theme settings.

- **Parameters**:
  - `name` *(string, required)*: Resource name in format `projects/{project}`.
- **Example Call**:
  ```json
  {
    "name": "projects/4044680601076201931"
  }
  ```
- **Key Output Fields**:
  - `screenInstances`: List of screens placed on the canvas with their position `(x, y)`, `width`, `height`, and `sourceScreen`.
  - `designSystem`: Information on attached design tokens.

---

### `list_projects`
Lists all Stitch projects accessible to the authenticated user, sorted with the most recently updated first.

- **Parameters**:
  - `pageSize` *(integer, optional, default: 50, max: 100)*: Maximum number of projects per page.
  - `pageToken` *(string, optional)*: Token from previous `next_page_token` for pagination.
  - `filter` *(string, optional)*: AIP-160 filter expression. Supported:
    - `view=owned` (default: only projects created by the user)
    - `view=shared` (projects shared with the user)
- **Example Call**:
  ```json
  {
    "pageSize": 20,
    "filter": "view=owned"
  }
  ```

---

### `update_project`
Updates project metadata (title, visibility, theme) or reposition screen instances on the 2D canvas.

- **Parameters**:
  - `name` *(string, required)*: `projects/{project}`
  - `title` *(string, optional)*: New project title.
  - `visibility` *(string, optional)*: `'PUBLIC'`, `'PRIVATE'`, or `'VISIBILITY_UNSPECIFIED'`.
  - `backgroundTheme` *(string, optional)*: Canvas background appearance.
  - `screenInstances` *(array, optional)*: Array of screen layout coordinates and metadata.
  - `updateMask` *(array of strings, optional)*: Fields to update (e.g., `["title", "visibility"]`).
- **Example Call**:
  ```json
  {
    "name": "projects/4044680601076201931",
    "title": "CastVoice Studio v2",
    "updateMask": ["title"]
  }
  ```

---

### `delete_project`
Permanently deletes a Stitch project. This action cannot be undone.

- **Parameters**:
  - `name` *(string, required)*: `projects/{project}`
- **Example Call**:
  ```json
  {
    "name": "projects/4044680601076201931"
  }
  ```

---

## 4. Screen Generation & AI Iteration Commands

### `generate_screen_from_text`
Generates a brand new UI screen and complete frontend code from a natural language prompt.

- **Parameters**:
  - `projectId` *(string, required)*: The numeric project ID without prefix (e.g. `'4044680601076201931'`).
  - `prompt` *(string, required)*: Clear, detailed UI specification including layout, components, states, and copy.
  - `deviceType` *(string, optional)*:
    - `'DESKTOP'`: Standard desktop responsive layout (1440px wide).
    - `'MOBILE'`: Smartphone viewport (e.g. 390px wide).
    - `'TABLET'`: Tablet layout.
    - `'AGNOSTIC'`: Generic / adaptive viewport.
  - `modelId` *(string, optional)*:
    - `'GEMINI_3_8_FLASH'` (Default high-capability multimodal model)
    - `'GEMINI_3_5_FLASH_LITE'` (Lightweight generation)
  - `designSystem` *(string, optional)*: Asset resource name (e.g. `assets/15996705518239280238`) to enforce branding.
- **Example Call**:
  ```json
  {
    "projectId": "4044680601076201931",
    "prompt": "Dark mode dashboard for a voice casting studio. Left sidebar with projects, top bar with breadcrumbs and user avatar, main area with waveform audio visualizer and speaker role cards with play preview buttons.",
    "deviceType": "DESKTOP",
    "modelId": "GEMINI_3_8_FLASH"
  }
  ```
- **Handling Generation Responses & Suggestions**:
  - If `output_components` contains text suggestions (e.g., *"Make them all"*, *"Add dark mode toggle"*), present them to the user. Accepting a suggestion can trigger a follow-up generation.

---

### `edit_screens`
Iteratively edits existing screens within a project using modification instructions.

- **Parameters**:
  - `projectId` *(string, required)*: Numeric project ID.
  - `selectedScreenIds` *(array of strings, required)*: List of screen IDs to modify (e.g. `["98b50e2ddc9943efb387052637738f61"]`).
  - `prompt` *(string, required)*: The requested modification (e.g., *"Change primary accent color to teal, add an audio speed selector next to the play button, and enlarge the waveform"*).
  - `deviceType` *(string, optional)*: Target device viewport.
  - `modelId` *(string, optional)*: AI model to power the revision.
- **Example Call**:
  ```json
  {
    "projectId": "4044680601076201931",
    "selectedScreenIds": ["98b50e2ddc9943efb387052637738f61"],
    "prompt": "Replace the table list with modern cards featuring speaker avatars and audio preview chips."
  }
  ```

---

### `generate_variants`
Explores alternative visual directions, color schemes, or component layouts for existing screens.

- **Parameters**:
  - `projectId` *(string, required)*: Numeric project ID.
  - `selectedScreenIds` *(array of strings, required)*: Screen IDs to branch from.
  - `prompt` *(string, required)*: Goal for the variations.
  - `variantOptions` *(object, required)*:
    - `variantCount` *(integer, 1–5, default: 3)*: Number of parallel alternatives to produce.
    - `creativeRange` *(string)*:
      - `'REFINE'`: Subtle polish, closely adhering to original.
      - `'EXPLORE'`: Balanced exploration (default).
      - `'REIMAGINE'`: Radical reimagining, fundamentally challenging layout & structure.
    - `aspects` *(array of strings, optional)*: Target areas to vary:
      - `'LAYOUT'`
      - `'COLOR_SCHEME'`
      - `'IMAGES'`
      - `'TEXT_FONT'`
      - `'TEXT_CONTENT'`
- **Example Call**:
  ```json
  {
    "projectId": "4044680601076201931",
    "selectedScreenIds": ["98b50e2ddc9943efb387052637738f61"],
    "prompt": "Explore high-contrast modern layouts for this podcast audio player",
    "variantOptions": {
      "variantCount": 3,
      "creativeRange": "EXPLORE",
      "aspects": ["LAYOUT", "COLOR_SCHEME"]
    }
  }
  ```

---

## 5. Screen Inspection & Code Download Commands

### `list_screens`
Lists all generated screens within a project.

- **Parameters**:
  - `projectId` *(string, required)*: Numeric project ID.
- **Example Call**:
  ```json
  {
    "projectId": "4044680601076201931"
  }
  ```

---

### `get_screen`
Fetches complete details for an individual screen, including timestamps, dimensions, and resource references for its code and screenshot.

- **Parameters**:
  - `name` *(string, required)*: Format `projects/{project}/screens/{screen}`.
- **Example Call**:
  ```json
  {
    "name": "projects/4044680601076201931/screens/98b50e2ddc9943efb387052637738f61"
  }
  ```
- **Key Output Properties**:
  - `htmlCode.name`: The file resource name (e.g. `projects/4044680601076201931/files/ea26dc97...`).
  - `screenshot.name`: The image file resource name.

---

### `download_file`
Downloads the raw HTML frontend code or the full-resolution PNG screenshot of any screen.

> ⚠️ **CRITICAL RULE**: Always use `download_file` with the resource `name`. **Never** fetch `download_url` directly via HTTP/curl, because `download_url` requires internal authentication tokens and returns a raw API envelope instead of clean source code.

- **Parameters**:
  - `name` *(string, required)*: The file resource name in format `projects/{project}/files/{file}`.
- **Example Call**:
  ```json
  {
    "name": "projects/4044680601076201931/files/ea26dc974c014bf28342b805ed0b7cfc"
  }
  ```
- **Return Payload**:
  - For HTML files: `html` string containing standard semantic HTML5, inline Tailwind CSS or styles, and vanilla JavaScript.
  - For Screenshot files: `image` string (base64-encoded PNG) with `image_metadata` (`mime_type`, `width`, `height`).

---

### `update_screen`
Overwrites or updates the HTML or screenshot of a screen directly.

- **Parameters**:
  - `name` *(string, required)*: Format `projects/{project}/screens/{screen}`.
  - `htmlCodeBase64` *(string, optional)*: UTF-8 HTML string encoded in base64.
  - `screenshotBase64` *(string, optional)*: PNG bytes encoded in base64.
  - `updateMask` *(array of strings, optional)*: `["html_code"]` or `["screenshot"]`.
- **Example Call**:
  ```json
  {
    "name": "projects/4044680601076201931/screens/98b50e2ddc9943efb387052637738f61",
    "htmlCodeBase64": "PCFET0NUWVBFIGh0bWw+...",
    "updateMask": ["html_code"]
  }
  ```

---

## 6. Design Systems & Theming Commands

### `create_design_system`
Creates a brand identity and design token specification for consistent screen generation across a project.

- **Parameters**:
  - `projectId` *(string, optional)*: Target project ID. If omitted, creates a global design system asset.
  - `designSystem` *(object, required)*:
    - `displayName` *(string, required)*: Name of the system (e.g. `"CastVoice Dark Slate"`).
    - `theme` *(object, required)*:
      - `colorMode`: `'LIGHT'`, `'DARK'`, or `'COLOR_MODE_UNSPECIFIED'`.
      - `colorVariant`: `'VIBRANT'`, `'EXPRESSIVE'`, `'TONAL_SPOT'`, `'NEUTRAL'`, `'MONOCHROME'`, `'FIDELITY'`, `'CONTENT'`, `'RAINBOW'`, `'FRUIT_SALAD'`.
      - `overridePrimaryColor`: Hex code (e.g. `'#0D9488'`).
      - `overrideSecondaryColor`: Hex code (e.g. `'#3B82F6'`).
      - `overrideNeutralColor`: Hex code (e.g. `'#0F172A'`).
      - `roundness`: Corner radius preset:
        - `'ROUND_TWO'` (2px)
        - `'ROUND_FOUR'` (4px)
        - `'ROUND_EIGHT'` (8px)
        - `'ROUND_TWELVE'` (12px)
        - `'ROUND_FULL'` (Pill / fully rounded)
      - `headlineFont`: Font family from 68+ choices (e.g. `'INTER'`, `'PLUS_JAKARTA_SANS'`, `'SPACE_GROTESK'`, `'MANROPE'`, `'GEIST'`, `'GOOGLE_SANS'`).
      - `bodyFont`: Font family for copy (e.g. `'INTER'`, `'DM_SANS'`, `'ROBOTO_FLEX'`, `'IBM_PLEX_SANS'`).
      - `designMd`: Free-form markdown documentation describing guidelines, elevation, spacing rules, and button styles.
- **Workflow Note**: Always call `update_design_system` immediately afterward to bind it into the active UI canvas.

---

### `update_design_system`
Updates tokens in an existing design system and synchronizes them across the project canvas.

- **Parameters**:
  - `name` *(string, required)*: Resource identifier in format `assets/{asset_id}`.
  - `projectId` *(string, required)*: Numeric project ID.
  - `designSystem` *(object, required)*: Updated configuration object matching `create_design_system`.

---

### `list_design_systems`
Lists design systems associated with a project or global account library.

- **Parameters**:
  - `projectId` *(string, optional)*: Numeric project ID. If omitted, lists global design systems.

---

### `apply_design_system`
Applies an existing design system's tokens (colors, typography, shapes) to modify and re-skin specific screens.

- **Parameters**:
  - `projectId` *(string, required)*: Numeric project ID.
  - `assetId` *(string, required)*: ID of the design system (without `assets/` prefix, e.g. `'15996705518239280238'`).
  - `selectedScreenInstances` *(array of objects, required)*:
    - `id`: Canvas screen instance ID from `get_project`.
    - `sourceScreen`: `projects/{project}/screens/{screen}`.

---

### `upload_design_md`
Uploads a customized markdown file (`DESIGN.md`) defining style guides, design tokens, and components directly to the project.

- **Parameters**:
  - `projectId` *(string, required)*: Numeric project ID.
  - `designMdBase64` *(string, required)*: Valid UTF-8 markdown content encoded as Base64 (generated via `base64 -w 0 DESIGN.md` on Linux or `base64 -b 0 DESIGN.md` on macOS).
- **Workflow Note**: Follow immediately with `create_design_system_from_design_md` to parse the uploaded document into an active design system.

---

### `create_design_system_from_design_md`
Converts the uploaded markdown specification into structured design system tokens and exposes it in the Stitch UI.

- **Parameters**:
  - `projectId` *(string, required)*: Numeric project ID.
  - `selectedScreenInstance` *(object, required)*: Screen instance created by `upload_design_md`.
  - `deviceType` *(string, optional)*: Viewport specification (`DESKTOP`, `MOBILE`, etc.).

---

## 7. End-to-End Operational Workflows

### Workflow A: Generate UI Screen & Extract Code to Workspace
1. **Initialize Project**:
   ```json
   call_mcp_tool(ServerName="stitch", ToolName="create_project", Arguments={"title": "Podcast Player UI"})
   ```
   *Record the returned numeric `projectId` (e.g. `4044680601076201931`).*

2. **Generate Screen**:
   ```json
   call_mcp_tool(ServerName="stitch", ToolName="generate_screen_from_text", Arguments={
     "projectId": "4044680601076201931",
     "prompt": "Modern podcast player with dark mode, playback speed controls, chapter drawer, and waveform.",
     "deviceType": "DESKTOP"
   })
   ```

3. **Get Screen Details**:
   ```json
   call_mcp_tool(ServerName="stitch", ToolName="get_screen", Arguments={
     "name": "projects/4044680601076201931/screens/<screen_id>"
   })
   ```
   *Note `htmlCode.name` (e.g. `projects/4044680601076201931/files/ea26...`).*

4. **Download Raw HTML**:
   ```json
   call_mcp_tool(ServerName="stitch", ToolName="download_file", Arguments={
     "name": "projects/4044680601076201931/files/ea26dc974c014bf28342b805ed0b7cfc"
   })
   ```
   *The returned `html` string can then be saved directly to `src/components/Player.html` or converted to React JSX.*

---

### Workflow B: Explore Variations of an Existing Screen
1. **Request 3 Visual Variants**:
   ```json
   call_mcp_tool(ServerName="stitch", ToolName="generate_variants", Arguments={
     "projectId": "4044680601076201931",
     "selectedScreenIds": ["<screen_id>"],
     "prompt": "Try a minimal glassmorphic aesthetic with blurred backdrop cards",
     "variantOptions": {
       "variantCount": 3,
       "creativeRange": "EXPLORE",
       "aspects": ["LAYOUT", "COLOR_SCHEME"]
     }
   })
   ```
2. **Review Screens**:
   Call `list_screens` to view the new screens and download their screenshots for inspection.

---

### Workflow C: Apply Custom Brand Rules via DESIGN.md
1. **Upload Markdown**:
   Convert your brand rules / tokens to Base64 and upload via `upload_design_md`.
2. **Instantiate Theme**:
   Execute `create_design_system_from_design_md`.
3. **Reskin Screens**:
   Execute `apply_design_system` passing the screen instances you wish to restyle.

---

## 8. Best Practices & Timeout Troubleshooting

- **Handling Long-Running Generation Calls**:
  - `generate_screen_from_text`, `edit_screens`, and `generate_variants` involve deep generative layout and code synthesis that can take **1 to 3 minutes**.
  - **DO NOT IMMEDIATELY RETRY** if a network timeout occurs. The background job on Google's infrastructure usually continues processing.
  - Instead of retrying, poll `get_screen` or `list_screens` every 30 seconds (up to 10 attempts) until the screen state shows complete.
- **Base64 Encoding**:
  - Files uploaded (`upload_design_md`, `update_screen`) must be valid Base64-encoded UTF-8 strings.
  - In Unix terminal: `base64 -w 0 filename.md` or `openssl base64 -A -in filename.md`.
- **Direct Web Access**:
  - You can inspect, interact with, or organize all projects visually at any time by visiting **[https://stitch.withgoogle.com](https://stitch.withgoogle.com)**.

---

## 9. Prompting Antigravity to Use Stitch (With Real-World Examples)

In Antigravity, you do not need to construct raw JSON tool payloads manually. You can simply ask Antigravity in natural language to perform design tasks with Stitch. Antigravity will map your request to the appropriate Stitch MCP commands, run them, and deliver the designs or code right to your workspace.

Here are prompt templates and real-world examples for common design tasks:

---

### Example 1: Creating a Project & Generating an Initial Screen

When you want to start a new design concept from a clean slate:

**💬 Antigravity Prompt:**
> *"Use Stitch to create a new project called 'CastVoice Audio Studio' and generate a desktop screen for our story ingestion workflow. It should feature a modern dark slate background (`#0B1120`), an emerald green primary button, a clean URL input bar at the top with a 'Fetch Article' action, a compact preview textarea for extracted prose, and selectable cards to choose between a 2-host conversational podcast or a chaptered audio drama."*

**⚙️ What Antigravity Executes Under the Hood:**
1. Calls `create_project` with `title: "CastVoice Audio Studio"`.
2. Calls `generate_screen_from_text` with:
   - `projectId`: `<newly_created_id>`
   - `prompt`: *"Modern dark slate audio ingestion interface..."*
   - `deviceType`: `"DESKTOP"`
   - `modelId`: `"GEMINI_3_8_FLASH"`
3. Calls `get_screen` to inspect the generated result and reports the screen details to you.

---

### Example 2: Iterating or Modifying an Existing Screen

When you want to change components, fix layouts, or add new interactive elements to a screen:

**💬 Antigravity Prompt:**
> *"Using Stitch, edit the main script editor screen in project 'CastVoice Audio Studio'. Merge the 'Review Script' and 'Cast Voices' views into a single unified dual-column view: script dialogue with speaker tags on the left, and a voice audition drawer with play/stop preview buttons and voice timbre selectors on the right."*

**⚙️ What Antigravity Executes Under the Hood:**
1. Calls `list_screens` on the project to find the target screen ID.
2. Calls `edit_screens` with:
   - `projectId`: `<project_id>`
   - `selectedScreenIds`: `["<screen_id>"]`
   - `prompt`: *"Merge Review Script and Cast Voices into a unified dual-column view..."*

---

### Example 3: Generating Visual Variants & Layout Explorations

When you want to see multiple creative options before choosing a design:

**💬 Antigravity Prompt:**
> *"In my Stitch project, generate 3 mobile variants of the voice casting modal. Let's explore different creative approaches for how the voice avatars, wave chips, and play buttons are laid out. Use the EXPLORE creative range and focus on LAYOUT and COLOR_SCHEME."*

**⚙️ What Antigravity Executes Under the Hood:**
1. Calls `generate_variants` with:
   - `projectId`: `<project_id>`
   - `selectedScreenIds`: `["<screen_id>"]`
   - `prompt`: *"Explore alternative mobile voice casting layouts..."*
   - `variantOptions`:
     ```json
     {
       "variantCount": 3,
       "creativeRange": "EXPLORE",
       "aspects": ["LAYOUT", "COLOR_SCHEME"]
     }
     ```

---

### Example 4: Extracting Generated HTML Code & Saving Directly to Workspace

When you want to take the code Stitch created and bring it into your actual codebase:

**💬 Antigravity Prompt:**
> *"Find the latest dark mode player screen in my Stitch project, download its HTML frontend code and screenshot, and save the code into `frontend/src/components/stitch/PlayerPreview.html` so we can inspect it and convert it to React."*

**⚙️ What Antigravity Executes Under the Hood:**
1. Calls `list_screens` to identify the most recent player screen.
2. Calls `get_screen` to retrieve `htmlCode.name` (e.g. `projects/.../files/ea26...`) and `screenshot.name`.
3. Calls `download_file` with the HTML file name.
4. Uses `write_file` to write the received HTML directly into your repository.

---

### Example 5: Custom Theming & Uploading `DESIGN.md`

When you have a design style guide or markdown specification you want Stitch to follow:

**💬 Antigravity Prompt:**
> *"Take our local `DESIGN.md` guidelines, upload it to our Stitch project, create a design system with Inter as the body font and Plus Jakarta Sans for headlines with rounded-xl corners, and apply this theme to all screens in the project."*

**⚙️ What Antigravity Executes Under the Hood:**
1. Reads `DESIGN.md` and encodes it in Base64.
2. Calls `upload_design_md`.
3. Calls `create_design_system_from_design_md`.
4. Calls `apply_design_system` to re-skin the screens to match your brand.

---

### Example 6: Auditing Existing Projects & Screens

When you want an overview of your Stitch assets:

**💬 Antigravity Prompt:**
> *"List all my Stitch projects and show me what screens have been generated for each."*

**⚙️ What Antigravity Executes Under the Hood:**
1. Calls `list_projects` with `filter: "view=owned"`.
2. Iterates across projects and calls `list_screens`.
3. Displays a structured markdown table with project titles, IDs, screen counts, and direct links to open them on `stitch.withgoogle.com`.

---

### 💡 Pro-Tips for Writing Prompts that Produce Great UIs in Stitch

1. **Specify Viewport Early**:
   Explicitly mention `"desktop responsive (1440px)"`, `"mobile app (390px)"`, or `"tablet"` in your prompt so Stitch selects the proper viewport container.
2. **Describe Component Hierarchy**:
   Structure your prompt with a clear hierarchy:
   - Header / Navigation (breadcrumbs, title, user profile)
   - Primary content area (cards, tables, form inputs, waveforms)
   - Secondary actions (drawers, modals, floating action bars)
3. **Name Your Colors & Themes**:
   Saying `"Dark mode with Tailwind slate-900 background, emerald-500 accents, and zinc-400 muted text"` produces significantly more cohesive styling than generic words like `"make it look nice"`.
4. **Detail Interactive States**:
   Mention specific states: e.g. `"Include an active playing state with an animated waveform and a paused state with a muted play button."`
5. **Ask Antigravity to Extract the Code in the Same Turn**:
   You can chain instructions: e.g., *"Generate the screen in Stitch, then download the HTML and save it in `frontend/src/`"*. Antigravity handles the multi-step workflow seamlessly.
