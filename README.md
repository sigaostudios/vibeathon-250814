![Vibeathon Mascot](vibeathon.png)

# Sigao Vibeathon 2024 — Team Mascot Starter

This is a Phaser 3 + Angular 19 starter wired for fast iteration with a small control panel, a config route, and an EventBus to bridge Angular and Phaser. It’s intentionally simple so you can focus on mascot personality, interactivity, and external data.

## Quick Start
- Prereqs: Node 18+, npm, Git
- Install: `npm install`
- Dev (with lightweight telemetry ping): `npm run dev`
- Dev (offline / no ping): `npm run dev-nolog`
- Build (prod + base href='./'): `npm run build` or `npm run build-nolog`
- Open: Angular dev server runs at `http://localhost:4200`

Notes
- The `dev` and `build` scripts call `log.js` which sends a tiny GET to record usage. Prefer `*-nolog` if offline or avoiding network calls.
- Production output path: `dist/template-angular/` (configured in `angular.json`).
- On Linux systems, `npm install` will automatically set up tmux/tmuxinator environment (see Development Environment section below).

## What You Get Out-of-the-Box
- Scene flow (Boot → Preloader → MainMenu → MascotPlayground)
- Overlay controls in Angular to drive scenes and movement
- Config route with persistent settings (via `StorageService`)
- EventBus for Angular ↔ Phaser messaging

## Project Structure
```
src/
  app/
    app.component.*          # Angular shell
    app.routes.ts            # Routes for Home and Configuration
    home/                    # Overlay controls (status + buttons)
    configuration/           # Config UI (persists to StorageService)
    phaser-game.component.ts # Hosts the Phaser canvas
    storage.service.ts       # Wrapper around unstorage localStorage driver
  game/
    main.ts                  # Phaser config and scene list
    EventBus.ts              # EventEmitter bridge
    scenes/                  # Boot, Preloader, MainMenu, MascotPlayground
public/
  assets/                    # Static assets copied to build
```

## Controls Overlay (Home)
- Status pill: shows current scene and whether movement is On/Off
- Buttons
  - Change Scene: calls the active scene’s `changeScene()`
  - Toggle Movement: works in MainMenu (logo tween) and MascotPlayground (mascot tween)
  - Add New Sprite: enabled in MascotPlayground, spawns a random animated companion

The overlay subscribes to `EventBus` events to stay in sync with the active scene.

## Configuration Route (/config)
- Game Title: edit the title and click Save.
- Persistence: stored using `StorageService` (backed by `unstorage` localStorage driver under the `app:` namespace).
- Game scene consumption: on app load and on save, Angular emits `config-loaded` / `config-saved`. The Game scene listens and updates its title live.

Tip: Use this route to add more mascot parameters (mood thresholds, animation speed, etc.). Emit Events when they change, and apply them in scenes.

## EventBus API (current wiring)
- `current-scene-ready: (scene: Phaser.Scene)` — emitted by active scene when ready
- `add-sprite` — Angular requests Game to create a random sprite
- `config-loaded: (config)` — emitted after Angular loads saved config
- `config-saved: (config)` — emitted after user saves config
- Additional placeholders already present in the config component if helpful:
  - `toggle-sound: (enabled: boolean)`
  - `music-volume-changed: (0..1)`
  - `sfx-volume-changed: (0..1)`
  - `difficulty-changed: ('easy'|'medium'|'hard')`

## Assets
- Place files in `public/assets/` — they’re copied as-is to the build.
- Scenes load with relative paths like `this.load.setPath('assets')` then `this.load.image('logo','logo.png')`.
- Keep sizes small. The Boot/Preloader scenes are minimal by design to avoid blocking loads.

## External Data (your mascot’s “heartbeat”)
- You’re expected to connect the mascot to something real (API, webhook, workspace events, etc.).
- Do not commit secrets. Prefer public APIs, proxy via a lightweight server if needed, or store non-secret toggles via the config route.
- Provide a demo/test mode in the UI so judges can simulate signals without relying on live events.

## Development Environment (Linux)

### Tmuxinator Setup
On Linux systems, running `npm install` automatically sets up a tmux development environment with tmuxinator. [Tmuxinator](https://github.com/tmuxinator/tmuxinator) is a tmux session manager that allows you to easily manage complex tmux sessions with pre-configured window and pane layouts.

After installation, start your development environment with:
```bash
tmuxinator start vibe
```

This creates a tmux session with 4 pre-configured windows:

1. **servers-core** 🫘🫘 — Runs the Angular development server (`npm run dev`)
2. **ai** 📎 — Split pane with:
   - Claude Code for AI-assisted development
   - Scratchpad for notes and temporary code snippets
3. **stats** 📊 — Development monitoring with:
   - Claude Code usage statistics (`npx ccusage@latest blocks --live`)
   - System resource monitoring (`htop`)
4. **terminal** 🖥 — General purpose terminal for git, npm, and other commands

The tmux configuration includes:
- Mouse support for easy pane navigation and resizing
- Vi-mode keybindings for familiar navigation
- Quick pane switching with Alt+Arrow keys
- Custom color scheme matching the Vibeathon theme
- Pane synchronization for running commands across multiple panes

Configuration files are located in `tools/tmux/`:
- `.tmux.conf` — Main tmux configuration
- `vibe.yml` — Tmuxinator session template

## Development Tips
- Start simple: wire one data source and one visible reaction.
- Use the EventBus to isolate Angular UI from Phaser logic.
- Make states obvious: show status text or simple color/mood changes.
- Keep asset sizes and animation counts reasonable — faster iteration wins.

## Team Learnings Deliverable
- Each team should add a short write-up at `learnings/learnings.md`.
- Summarize how you used AI as a team: what worked, what didn’t, collaboration patterns, and prompt strategies you’d reuse.
- No need to log every single prompt; focus on insights and takeaways that would help future teams.

## Scripts
- `npm run dev` — `log.js` + Angular dev server
- `npm run dev-nolog` — Angular dev server only
- `npm run build` — production build with hashing, base href `./`
- `npm run build-nolog` — production build without analytics ping

## Testing
- The project doesn’t ship with spec files; `ng test` will report no inputs by default.
- If you add specs, run `npx ng test` (Karma + Jasmine).

## Contributing During Vibeathon
- Branch per team: do work in your team branch and open PRs if helpful.
- Keep commits small and descriptive (e.g., "Add scene transition", "Hook up Slack webhook").
- Create `learnings/learnings.md` (see above) to capture team-level insights about using AI. Detailed prompt-by-prompt logs are not required.

## Troubleshooting
- Blank page after build: ensure your host path matches base href `./`.
- Dev port: Angular serves on `http://localhost:4200`.
- Offline/blocked analytics: use `npm run dev-nolog` / `npm run build-nolog`.
- Reset local config: clear keys under the `app:` namespace in browser localStorage.

Good luck, and have fun building a mascot with personality! 🎉
