# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

**Sanjou** is a desktop productivity app implementing the "Block Method" from David Cain's "How to Do Things" guide. The app helps users work in focused 25-minute blocks with structured meta-checklists, task management, and "Right Now Lists" for immediate next actions.

### Core Concepts (Block Method)

- **Block**: 25 minutes of uninterrupted work directed toward completing a task
- **Meta Checklist**: Pre-block ritual (finish line pictured?, not interrupted?, phone away?, celebrate!)
- **Right Now List**: Granular next-action items to overcome resistance and maintain focus
- **Break**: Optional rest period between blocks with notes capability
- **Block Tally**: Daily count of completed blocks

## Tech Stack

- **Framework**: Tauri 2.0 (Rust backend + web frontend)
- **Frontend**: React 19 with TypeScript (strict mode)
- **State**: Zustand with persistence middleware (localStorage for UI state)
- **Sync**: Yjs (CRDT) + y-indexeddb for offline-first, Firebase Firestore for cloud sync (optional)
- **Build**: Vite 7
- **Testing**: Playwright

### Key Dependencies
```json
{
  "yjs": "^13.6.29",
  "y-indexeddb": "^9.0.12",
  "firebase": "^12.7.0",
  "zustand": "^5.0.10",
  "@tauri-apps/api": "^2",
  "react": "^19.1.0"
}
```

## Commands

```bash
npm run dev          # Start Vite dev server (frontend only)
npm run tauri dev    # Run full desktop app in dev mode
npm run build        # Build frontend
npm run tauri build  # Build desktop binary
npm run test         # Run Playwright tests
```

## Architecture

```
src/
  components/
    common/       # Button, Modal, Timer, Checkbox, etc.
    views/        # BlockView, SettingsView, etc.
  hooks/          # useTimer, useKeyboard, useAudio, useSync
  store/          # Zustand stores (ui, settings)
  sync/           # Yjs provider, Firebase sync, offline persistence
  models/         # TypeScript interfaces
  styles/         # Global CSS with CSS variables

src-tauri/
  src/
    lib.rs        # Tauri commands and plugin setup
    main.rs       # App entry point
```

## Design System

### Theme
Dark-first terminal RPG aesthetic. Use CSS variables defined in `:root`:
- `--bg-primary: #0a0a0f` through `--bg-highlight: #22222e`
- `--text-primary: #e0e0e0`, `--text-secondary: #8888aa`
- `--accent-color: #06d6a0` (teal/mint)
- Status: `--color-success`, `--color-warning`, `--color-danger`, `--color-info`

### Typography
Monospace only: JetBrains Mono, Fira Code, SF Mono fallbacks. Base 13px.

### UI Patterns
- Keyboard-first navigation (space=start/pause, r=reset, vim-style h/j/k/l)
- Subtle glow effects on interactive elements
- 0.15s transitions, no bouncy animations
- Compact headers, collapsible elements
- Status bar at bottom with keyboard hints

## Data Models

### Block
```typescript
interface Block {
  id: string;
  date: string;              // YYYY-MM-DD for daily grouping
  startedAt: number;         // timestamp
  completedAt?: number;
  taskId?: string;
  meta: {
    finishLinePictured: boolean;
    notInterrupted: boolean;
    committedToFocus: boolean;
    phoneSeparate: boolean;
    celebrated: boolean;
  };
  isValid: boolean;          // false if interrupted/abandoned
  notes?: string;
}
```

### Task
```typescript
interface Task {
  id: string;
  title: string;
  subtasks: Subtask[];
  completed: boolean;
  createdAt: number;
  modifiedAt: number;
  blocksSpent: number;       // count of blocks used on this task
}

interface Subtask {
  id: string;
  title: string;
  completed: boolean;
}
```

### RightNowList
```typescript
interface RightNowList {
  id: string;
  blockId?: string;
  items: RightNowItem[];
  createdAt: number;
}

interface RightNowItem {
  id: string;
  text: string;              // "What do I do in the first 30-120 seconds?"
  completed: boolean;
}
```

### Break
```typescript
interface Break {
  id: string;
  startedAt: number;
  endedAt?: number;
  duration: number;          // planned duration in minutes
  notes?: string;
}
```

## Offline-First Sync Architecture

Following the pattern from Subete:

### Data Flow
```
Local Changes → Yjs Doc (CRDT) → IndexedDB (persistent)
                              → Firebase Firestore (when online)
```

### Yjs Setup
- Single Yjs document (`ydoc`) as source of truth for blocks, tasks, right-now lists
- `y-indexeddb` for local persistence
- Automatic CRDT conflict resolution (no manual merge logic)

### Firebase Sync (Optional)
- If `VITE_FIREBASE_*` env vars not set, app runs fully offline
- Updates encoded as base64 for Firestore transmission
- Real-time `onSnapshot()` listeners for remote changes
- Graceful degradation when offline

### Zustand Layer
- UI state and settings in Zustand + localStorage
- Does NOT store block/task data (that's in Yjs)

```typescript
// sync/yjsProvider.ts
import * as Y from 'yjs';
import { IndexeddbPersistence } from 'y-indexeddb';

export const ydoc = new Y.Doc();
export const blocksArray = ydoc.getArray<Block>('blocks');
export const tasksMap = ydoc.getMap<Task>('tasks');
export const rightNowListsMap = ydoc.getMap<RightNowList>('rightNowLists');

export const initLocalPersistence = () => {
  return new IndexeddbPersistence('sanjou-data', ydoc);
};
```

## Audio

Use Web Audio API for notifications (no sound files):
```typescript
const playBeep = () => {
  const ctx = new AudioContext();
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  osc.connect(gain).connect(ctx.destination);
  osc.frequency.value = 800;
  gain.gain.setValueAtTime(0.3, ctx.currentTime);
  gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.3);
  osc.start();
  osc.stop(ctx.currentTime + 0.3);
};
```

## Key Implementation Notes

1. **Blocks that don't count**: If user succumbs to distraction, block is marked `isValid: false`. Strict quality control is core to the method.

2. **Meta checklist is mandatory**: Must complete meta checklist items before starting timer. This is the "Step 2: Picture the finish line" ritual.

3. **Timer display**: Use SVG ring with strokeDasharray for progress visualization.

4. **Daily view**: Group blocks by date. Show today's tally prominently. Historical data is kept (unlike the paper method) to enable review and trends.

5. **Right Now List**: Ephemeral by design - user can discard when no longer relevant. Display prominently during active block.

6. **Break tracking**: Record break start time and duration. Optional notes field for thoughts during break.

7. **Firebase is optional**: App must work fully offline. Firebase sync is a convenience feature, not a requirement.
