# Repository Guidelines

## Project Structure & Module Organization
- Source: `src/` (Angular shell in `src/app/`, Phaser game in `src/game/`).
- Scenes: `src/game/scenes/` (e.g., `Boot.ts`, `Preloader.ts`, `MainMenu.ts`).
- Assets: `public/assets/` (copied to build via Angular assets config).
- Entry points: `src/main.ts` (Angular bootstrap), `src/game/main.ts` (Phaser config).
- Output: `dist/template-angular/` after builds.

## Build, Test, and Development Commands
- `npm install`: install dependencies.
- `npm run dev`: start dev server (Angular CLI) and lightweight build telemetry.
- `npm run dev-nolog`: start dev server without telemetry (offline-friendly).
- `npm run build`: production build to `dist/template-angular/` with base href set.
- `npm run build-nolog`: production build without telemetry.
- `ng test` (or `npx ng test`): run unit tests with Karma + Jasmine.

## Coding Style & Naming Conventions
- Indentation: 4 spaces; UTF-8; trim trailing whitespace; final newline (`.editorconfig`).
- TypeScript quotes: single quotes preferred (`.editorconfig`).
- Files: kebab-case for Angular files (e.g., `app.component.ts`, `phaser-game.component.ts`).
- Classes: PascalCase (Angular components, services, Phaser scenes).
- Selectors: prefix with `app-` (Angular `prefix: "app"`).

## Testing Guidelines
- Framework: Jasmine + Karma (Angular CLI test builder).
- Location: place specs beside code as `*.spec.ts` (e.g., `app.component.spec.ts`).
- Run: `ng test` for watch mode; ensure new features include reasonable coverage of game logic and UI wiring.
- Keep tests isolated; prefer pure logic testing for Phaser scene helpers where possible.

## Commit & Pull Request Guidelines
- Commits: imperative, concise subjects (e.g., "Add scene transition", "Fix preload path").
- Scope: one logical change per commit; reference issues where relevant (e.g., `#123`).
- PRs: include summary, screenshots/gifs for visual changes, test instructions, and linked issues.
- Quality gates: CI green, `npm run build` succeeds, tests updated/added for behavior changes.

## Security & Configuration Tips
- Do not commit secrets; assets in `public/` are publicly served.
- Network note: `npm run dev`/`build` pings a remote via `log.js`; use `*-nolog` variants if offline or avoiding external calls.
