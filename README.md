# PixelLyric

PixelLyric is a browser-based studio for composing timed text sequences for character LCD displays, previewing them against an MP3 track, and exporting the result as project data or Arduino-friendly code.

It is built for workflows where you need to design page-by-page lyrics, prompts, or scripted display content for 16x2 and 20x4 LCD screens before moving the sequence to hardware.

## Highlights

- Edit multi-page LCD scripts for `16x2` and `20x4` screen presets.
- Configure page mode, animation, and duration for each page.
- Preview playback with countdown and loop support.
- Import an MP3, trim the usable range, inspect its waveform, and align it with the LCD timeline.
- Save and reopen full `.pixelyric` project files with embedded audio.
- Autosave working state in the browser with restore on the next app load.
- Export the project as formatted `.json` or an Arduino `.ino` sketch.

## Main Features

### LCD script editor

- Add, duplicate, reorder through selection, and delete pages.
- Switch between page and scroll modes.
- Choose animations such as replace, typewriter, scroll-left, and scroll-right.
- Set per-page durations in milliseconds or seconds.

### Audio-assisted preview

- Import MP3 audio for timing reference.
- Trim start and end points before syncing the track to the script.
- Preview the trimmed range directly in the editor.
- Use waveform feedback to understand the selected audio region.

### Project workflow

- Create new projects and rename them inline.
- Save projects as `.pixelyric` documents.
- Reopen saved projects with their pages, countdown, and embedded audio intact.
- Export raw JSON for inspection or downstream tooling.
- Export an Arduino `.ino` sketch for LCD-oriented playback logic.

## Keyboard Shortcuts

- `Cmd/Ctrl + S`: Save project
- `Shift + Cmd/Ctrl + S`: Save project as

## Browser Notes

PixelLyric supports native file open/save flows through the File System Access API when the browser provides it. In Chromium-based browsers this allows reopening a project and saving back to the same `.pixelyric` file.

In browsers without that API, save operations fall back to download-based exports.

## Getting Started

### Prerequisites

- Node.js 20+ recommended
- npm

### Install

```bash
npm install
```

### Start the development server

```bash
npm run dev
```

### Production build

```bash
npm run build
```

## Available Scripts

- `npm run dev`: Start the Vite development server
- `npm run build`: Run TypeScript build checks and create a production bundle
- `npm run typecheck`: Run TypeScript project checks without emitting output
- `npm run lint`: Run ESLint across the workspace
- `npm run ci`: Run lint, typecheck, and build in sequence
- `npm run preview`: Preview the production build locally

## Typical Workflow

1. Choose an LCD preset such as `16x2` or `20x4`.
2. Create the pages for your lyrics or scripted text.
3. Set each page's mode, animation, and duration.
4. Import an MP3 and trim the usable segment.
5. Preview playback to verify timing and screen transitions.
6. Save the project as `.pixelyric`, or export `.json` / `.ino` as needed.

## Project Structure

- `src/components`: UI building blocks and editor surfaces
- `src/hooks`: State orchestration and reusable behavior
- `src/lib`: LCD, audio, persistence, and export logic
- `src/types`: Shared type definitions
- `src/configs`: Presets and UI configuration

## Tech Stack

- React 19
- TypeScript
- Vite
- Tailwind CSS 4
- Zustand

## Validation

Use the same quality gate as CI:

```bash
npm run ci
```
