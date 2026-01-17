# Design Principles & Stack Guide for Claude Code

## Overview
This document describes my preferred design aesthetic, technical stack, and coding patterns for building desktop apps. Use this as a reference when building my Pomodoro app.

## Design Aesthetic: Terminal RPG Theme

### Visual Style
- **Dark-first design** with optional light theme
- **Monospace typography**: JetBrains Mono, Fira Code, SF Mono as fallbacks
- **Information-dense UI**: Compact spacing, no wasted space
- **Subtle glow effects** on interactive elements
- **No emojis in UI** unless specifically requested

### Color System (CSS Variables)
```css
:root {
  /* Dark terminal theme */
  --bg-primary: #0a0a0f;
  --bg-secondary: #12121a;
  --bg-tertiary: #1a1a24;
  --bg-highlight: #22222e;

  --text-primary: #e0e0e0;
  --text-secondary: #8888aa;
  --text-muted: #555566;

  --border-color: #2a2a3a;
  --border-glow: #4a4a6a;

  /* Status colors */
  --color-success: #22c55e;
  --color-warning: #f59e0b;
  --color-danger: #ef4444;
  --color-info: #06b6d4;

  /* Accent - teal/mint */
  --accent-color: #06d6a0;
  --accent-glow: rgba(6, 214, 160, 0.3);
}

:root[data-theme='light'] {
  --bg-primary: #f5f5f0;
  --bg-secondary: #eaeae5;
  --bg-tertiary: #ddddd8;
  --text-primary: #1a1a1f;
  --text-secondary: #4a4a55;
  --accent-color: #059669;
}
```

### Typography
```css
body {
  font-family: 'JetBrains Mono', 'Fira Code', 'SF Mono', Monaco, 'Cascadia Code', monospace;
  font-size: 13px;
  line-height: 1.5;
  -webkit-font-smoothing: antialiased;
}
```

### UI Patterns I Like
- **Keyboard-first navigation** with optional vim keybindings (h/j/k/l)
- **Compact headers** with dropdown menus to save space
- **Collapsible/expandable elements** (search bars, sidebars)
- **Status bars** at bottom showing keyboard hints
- **Modal overlays** with backdrop blur for focused interactions
- **Subtle animations** (0.15s transitions, no bouncy/playful effects)

## Technical Stack

### Tauri 2.0 Setup

**package.json dependencies:**
```json
{
  "dependencies": {
    "@tauri-apps/api": "^2",
    "@tauri-apps/plugin-opener": "^2",
    "react": "^19.1.0",
    "react-dom": "^19.1.0",
    "zustand": "^5.0.10"
  },
  "devDependencies": {
    "@tauri-apps/cli": "^2",
    "@types/react": "^19.1.8",
    "@types/react-dom": "^19.1.6",
    "@vitejs/plugin-react": "^4.6.0",
    "@playwright/test": "^1.57.0",
    "typescript": "~5.8.3",
    "vite": "^7.0.4"
  }
}
```

**tauri.conf.json:**
```json
{
  "$schema": "https://schema.tauri.app/config/2",
  "productName": "AppName",
  "version": "0.1.0",
  "identifier": "com.yourname.appname",
  "build": {
    "beforeDevCommand": "npm run dev",
    "devUrl": "http://localhost:1420",
    "beforeBuildCommand": "npm run build",
    "frontendDist": "../dist"
  },
  "app": {
    "windows": [{ "title": "AppName", "width": 1200, "height": 800 }],
    "security": { "csp": null }
  },
  "bundle": {
    "active": true,
    "targets": "all",
    "icon": ["icons/32x32.png", "icons/128x128.png", "icons/128x128@2x.png", "icons/icon.icns", "icons/icon.ico"]
  }
}
```

**Cargo.toml (src-tauri/):**
```toml
[package]
name = "app-name"
version = "0.1.0"
edition = "2021"

[lib]
name = "app_name_lib"
crate-type = ["staticlib", "cdylib", "rlib"]

[build-dependencies]
tauri-build = { version = "2", features = [] }

[dependencies]
tauri = { version = "2", features = [] }
tauri-plugin-opener = "2"
serde = { version = "1", features = ["derive"] }
serde_json = "1"
```

**vite.config.ts:**
```typescript
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

const host = process.env.TAURI_DEV_HOST;

export default defineConfig(async () => ({
  plugins: [react()],
  clearScreen: false,
  server: {
    port: 1420,
    strictPort: true,
    host: host || false,
    hmr: host ? { protocol: "ws", host, port: 1421 } : undefined,
    watch: { ignored: ["**/src-tauri/**"] },
  },
}));
```

**tsconfig.json:**
```json
{
  "compilerOptions": {
    "target": "ES2020",
    "useDefineForClassFields": true,
    "lib": ["ES2020", "DOM", "DOM.Iterable"],
    "module": "ESNext",
    "skipLibCheck": true,
    "moduleResolution": "bundler",
    "allowImportingTsExtensions": true,
    "resolveJsonModule": true,
    "isolatedModules": true,
    "noEmit": true,
    "jsx": "react-jsx",
    "strict": true,
    "noUnusedLocals": true,
    "noUnusedParameters": true,
    "noFallthroughCasesInSwitch": true
  },
  "include": ["src"]
}
```

### Commands
```bash
npm run dev          # Start Vite dev server (frontend only)
npm run tauri dev    # Run full desktop app in dev mode
npm run build        # Build frontend
npm run tauri build  # Build desktop binary
npm run test         # Run Playwright tests
```

## Code Architecture

### State Management: Zustand
Use Zustand with persistence for all app state:

```typescript
import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';

interface AppState {
  // State
  theme: 'light' | 'dark' | 'system';
  someValue: number;

  // Actions
  setTheme: (theme: 'light' | 'dark' | 'system') => void;
  increment: () => void;
}

export const useAppStore = create<AppState>()(
  persist(
    (set, get) => ({
      theme: 'dark',
      someValue: 0,

      setTheme: (theme) => set({ theme }),
      increment: () => set((state) => ({ someValue: state.someValue + 1 })),
    }),
    {
      name: 'app-storage',
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({ theme: state.theme }), // Only persist what's needed
    }
  )
);
```

### Component Structure
```
src/
  components/
    common/       # Reusable components (Button, Modal, Timer, etc.)
    views/        # Full-page views
  hooks/          # Custom React hooks
  store/          # Zustand stores
  models/         # TypeScript interfaces
  services/       # External API calls (LLM, etc.)
  styles/         # Global CSS files
```

### Code Style
- Functional components with hooks only (no classes)
- TypeScript strict mode
- Keep components small and focused
- Prefer composition over inheritance
- Use CSS variables for theming
- CSS files co-located with components (Component.tsx + Component.css)

### Keyboard Navigation Pattern
```typescript
useEffect(() => {
  const handleKeyDown = (e: KeyboardEvent) => {
    const isEditing = (e.target as HTMLElement).tagName === 'INPUT' ||
                      (e.target as HTMLElement).tagName === 'TEXTAREA';
    if (isEditing) return;

    // Global shortcuts
    if (e.key === ' ') { e.preventDefault(); toggleTimer(); }
    if (e.key === 'r') { e.preventDefault(); resetTimer(); }
    // etc.
  };

  window.addEventListener('keydown', handleKeyDown);
  return () => window.removeEventListener('keydown', handleKeyDown);
}, [/* dependencies */]);
```

## For the Pomodoro App Specifically

### Core Features Expected
- Timer with work/break intervals
- Session counting
- Keyboard controls (space to start/pause, r to reset)
- Audio notifications (Web Audio API beeps, not sound files)
- Settings for durations
- Persist state across sessions

### Audio Beep Pattern
```typescript
const playBeep = () => {
  const ctx = new AudioContext();
  const oscillator = ctx.createOscillator();
  const gainNode = ctx.createGain();

  oscillator.connect(gainNode);
  gainNode.connect(ctx.destination);

  oscillator.frequency.value = 800;
  oscillator.type = 'sine';

  gainNode.gain.setValueAtTime(0.3, ctx.currentTime);
  gainNode.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.3);

  oscillator.start(ctx.currentTime);
  oscillator.stop(ctx.currentTime + 0.3);
};
```

### Timer Ring SVG Pattern
```tsx
<div className="timer-ring">
  <svg viewBox="0 0 100 100">
    <circle className="ring-bg" cx="50" cy="50" r="45" fill="none" strokeWidth="6" />
    <circle
      className="ring-progress"
      cx="50" cy="50" r="45"
      fill="none" strokeWidth="6"
      strokeDasharray={`${progressPercent * 2.83} 283`}
      transform="rotate(-90 50 50)"
    />
  </svg>
  <div className="timer-display">
    <span className="time">{formatTime(seconds)}</span>
  </div>
</div>
```
