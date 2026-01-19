# Neon XR Posthoc Player

A local web app for reviewing XR scene videos with gaze overlays. Load a video,
select a gaze data folder, and the player renders a red gaze circle per frame
based on timestamps.

## Features
- Load XR scene video and gaze data CSV from a folder
- Per-frame gaze overlay synced to video playback
- Adjustable gaze visualizer style (radius, stroke, color)
- Optional gaze start offset (ms) to align gaze with video

## Gaze CSV Format
Expected column order:
1. section id
2. recording id
3. timestamp [ns]
4. gaze x [px]
5. gaze y [px]
6. worn
7. fixation id
8. blink id
9. azimuth [deg]
10. elevation [deg]

The parser ignores empty lines and supports an optional header row.

## Getting Started
```bash
npm install
npm run start
```

## Build
```bash
npm run build
```

## Linting and Formatting
```bash
npm run lint
npm run format
npm run check
```

## Notes
- Gaze coordinates are assumed to be recorded at 1600x1200 and are scaled to the
  current video size at render time.
