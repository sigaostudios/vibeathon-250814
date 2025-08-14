# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview
This is a Phaser 3 + Angular 19 game template that integrates the Phaser game engine with Angular framework for web game development.

## Essential Commands

### Development
```bash
npm run dev          # Start dev server with analytics (http://localhost:8080)
npm run dev-nolog    # Start dev server without analytics
ng serve             # Alternative: standard Angular dev server
```

### Building
```bash
npm run build        # Production build with analytics (output: dist/browser/)
npm run build-nolog  # Production build without analytics
```

### Testing
```bash
ng test              # Run Jasmine/Karma tests with Chrome
```

## Architecture

### Angular-Phaser Bridge Pattern
The application uses a bridge pattern to connect Angular and Phaser:

1. **PhaserGameComponent** (`src/app/phaser-game.component.ts`): Initializes and manages the Phaser game instance
2. **EventBus** (`src/game/EventBus.ts`): Enables bidirectional communication between Angular and Phaser
3. **AppComponent** (`src/app/app.component.ts`): Contains UI controls that interact with the game via EventBus

### Game Scene Flow
```
Boot → Preloader → MainMenu → Game → GameOver
```
Each scene emits `'current-scene-ready'` when initialized for Angular integration.

### Key Directories
- `src/app/`: Angular components and configuration
- `src/game/`: Phaser game code and scenes
- `src/game/scenes/`: Individual game scenes
- `public/assets/`: Static game assets (images, audio)

## Important Configuration

### Angular Configuration
- **Standalone Components**: Uses Angular 19's standalone architecture
- **Phaser Integration**: `allowedCommonJsDependencies: ["phaser"]` in angular.json
- **Base Href**: Production builds use `'./'` for relative paths

### TypeScript
- **Strict Mode**: Enabled with all strict checks
- **Target**: ES2022
- **Module Resolution**: Bundler mode for optimal bundling

## Development Notes

### Framework Documentation
When working with Angular or Phaser.js features, use the Context7 MCP server to retrieve the latest documentation and best practices:
- For Angular features: Query Context7 for Angular 19 documentation
- For Phaser.js features: Query Context7 for Phaser 3 documentation
- This ensures you have access to the most up-to-date APIs and patterns

### Phaser Library Reference
ALWAYS use Context7 MCP server when you need to understand how Phaser library features work:
- Scene management and lifecycle methods
- Game object creation and manipulation
- Input handling and event systems
- Physics systems (Arcade, Matter.js)
- Animation and tweening
- Asset loading and management
- Rendering pipelines and effects
- Audio systems
- Camera controls and effects

**IMPORTANT: Use Context7 library ID `/phaserjs/phaser` directly - do NOT call resolve-library-id first.**
Query Context7 with specific topics (e.g., "scenes", "tweens", "physics") to get targeted documentation and code examples.

### Adding New Game Scenes
1. Create scene class in `src/game/scenes/`
2. Register in game config (`src/game/main.ts`)
3. Emit `'current-scene-ready'` in scene's `create()` method
4. Handle scene switching via EventBus

### Angular-Phaser Communication
```typescript
// From Angular to Phaser
EventBus.emit('event-name', data);

// From Phaser to Angular
EventBus.on('event-name', (data) => { /* handle */ });
```

### Asset Management
- Place assets in `public/assets/`
- Load in Preloader scene
- Assets are automatically copied during build

### Testing Phaser Components
Phaser components require special handling in tests due to WebGL context. Mock the Phaser game instance when testing Angular components that interact with the game.