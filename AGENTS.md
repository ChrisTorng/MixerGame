# Repository Guidelines

## Project Structure & Module Organization
- `src/` — TypeScript, Web Components, HTML/CSS (`index.ts`, `volume-slider.ts`, `index.html`).
- `songs/` — Audio assets by `Artist/SongName/{vocal,guitar,piano,other,bass,drum}.mp3` (+ optional PNG waveforms).
- `dist/` — Webpack build output (`bundle.js` dev, `bundle.min.js` prod).
- `.github/` — CI and agent docs; `copilot-instructions.md` contains deeper architecture notes.
- `prompts/` — prior agent prompt history and notes.

## Build, Test, and Development Commands
- `npm start` — Run webpack dev server on `http://localhost:9000`; open `http://localhost:9000/src/`.
- `npm run watch` — Incremental build without server.
- `npm run build` — Production bundle to `dist/` with source maps.
- `./run.sh` or `run.cmd` — Convenience launchers on Unix/Windows.
- Tests: none configured (`npm test` exits with error). Use manual browser testing.

## Coding Style & Naming Conventions
- Language: TypeScript in strict mode (see `tsconfig.json`).
- Indentation: 2 spaces for TS/HTML/CSS; no tabs.
- Naming: Classes PascalCase (`MixerGame`, `VolumeSlider`); variables/functions camelCase; constants UPPER_SNAKE_CASE.
- Files: kebab-case (`volume-slider.ts`, `index.css`). Keep modules small and cohesive.
- WebAudio: check `isAudioInitialized` before node ops; use `setValueAtTime` for gains.

## Testing Guidelines
- Manual: verify load/play, fader response, comparison mode, scoring, and seek.
- Cross-browser: test a modern Chromium and Firefox.
- If adding tests later, prefer `src/**/*.spec.ts` and consider Playwright for UI.

## Commit & Pull Request Guidelines
- Commit style: Conventional Commits where possible (`feat:`, `fix:`, `chore:`, optional scopes), English or zh-TW acceptable. Example: `fix(volume-slider): correct gain conversion`.
- PRs must include: concise description, screenshots/GIFs for UI, steps to run locally, and linked issues.
- Keep diffs focused; update README or comments when behavior changes.

## Security & Configuration Tips
- Large media: avoid committing copyrighted content; prefer short clips or LFS.
- Paths: keep `tracksBaseUrl` relative (used in `MixerGame` constructor) and validate all six tracks exist.
