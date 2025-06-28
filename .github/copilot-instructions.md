# GitHub Copilot Instructions for MixerGame

## Project Overview

MixerGame is a web-based audio mixing training game built with TypeScript, WebAudio API, and custom Web Components. Players adjust track volumes to match hidden target settings, learning proper mixing techniques through interactive gameplay.

## Core Commands

### Development
- `npm start` - Start webpack dev server (port 9000)
- `npm run watch` - Watch mode compilation  
- `npm run build` - Production build to `dist/` (creates bundle.min.js)
- `npx http-server -p 3000 -c-1` - Alternative local server
- `run.cmd` - Windows batch script for local development

### Testing
- No test framework configured (displays error message)
- Manual testing through browser at `http://localhost:3000/src/`

## Architecture

### Core Technologies
- **TypeScript** (ES6 target, strict mode)
- **WebAudio API** - Real-time audio processing and mixing
- **Webpack** - Module bundling with ts-loader
- **Custom Web Components** - VolumeSlider element

### Key Components
- `MixerGame` class - Main game logic and audio management
- `VolumeSlider` - Custom Web Component for fader controls
- Audio processing pipeline: AudioBufferSourceNode → GainNode → AnalyserNode → MasterGain → Destination

### File Structure
```
src/
├── index.ts          # Main game class and initialization
├── volume-slider.ts  # Custom fader Web Component
├── index.html        # UI layout
└── index.css         # Styling

songs/
├── UpLifeSongs/     # Track collections
└── Will/            # Each song has 6 tracks: vocal, guitar, piano, other, bass, drum
```

### Audio Data Flow
1. Load MP3 files for 6 tracks per song
2. Apply random gain coefficients (0.25-4x range) 
3. Player adjusts faders to compensate for unknown random gains
4. Score calculated based on how close player gets to 1/randomGain values

## Code Style Rules

### TypeScript Standards
- Strict mode enabled with full type safety
- Use explicit types for audio nodes and game state
- Prefer `const` for immutable values, avoid `var`
- Use proper async/await for audio loading

### Naming Conventions  
- Classes: PascalCase (`MixerGame`, `VolumeSlider`)
- Variables/methods: camelCase (`audioContext`, `setTrackVolume`)
- Constants: UPPER_SNAKE_CASE (`MIN_DB`, `MAX_DB`)
- Track types: lowercase literals (`'vocal' | 'guitar' | 'piano' | 'other' | 'bass' | 'drum'`)

### Audio Programming Patterns
- Always check `isAudioInitialized` before WebAudio operations
- Use `setValueAtTime()` for smooth gain changes
- Disconnect audio nodes before reconnecting to prevent memory leaks
- Handle AudioContext state changes (suspended/running)

### Web Components
- Use Shadow DOM for style encapsulation
- Implement proper lifecycle callbacks (`connectedCallback`)
- Dispatch custom events with `composed: true` for cross-boundary communication
- Include TypeScript type definitions for custom elements

### Error Handling
- Use try/catch for async audio operations
- Provide user feedback for loading states
- Gracefully handle missing audio files
- Check for WebAudio API support

## Development Guidelines

### Audio File Requirements
- Each song needs 6 MP3 tracks: vocal, guitar, piano, other, bass, drum
- Place in `songs/[Artist]/[SongName]/` directory structure
- Optional PNG waveform images with same filenames

### Adding New Songs
1. Create directory structure in `songs/`
2. Update `tracksBaseUrl` in MixerGame constructor
3. Ensure all 6 track files exist

### Performance Considerations
- Audio buffers are cached after initial load
- Use `requestAnimationFrame` for UI updates
- Minimize audio graph reconnections during playback

### Browser Compatibility
- Requires modern WebAudio API support
- Uses ES6 modules and custom elements
- No polyfills included - targets modern browsers only

## Language Context

This project uses Traditional Chinese (zh-TW) for:
- User interface text and labels
- Code comments and documentation
- Game instruction text
- File/directory names may include Chinese characters

When making changes, maintain bilingual support where appropriate and respect existing Chinese naming conventions.
