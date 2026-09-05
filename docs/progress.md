# Netherite Progress Tracker & Roadmap

## Completed Milestones

### Phase 1: Setup & Foundations
- [x] Create project scaffolding with T3 Stack (Next.js 15 App Router, TypeScript, Tailwind CSS v4, tRPC v11).
- [x] Configure centralized monochromatic CSS variables (Dark/Light mode themes).
- [x] Set up developer documentation structure in `docs/`.

### Phase 2: Authentication & Storage Engine
- [x] Configure NextAuth v5 with Google Provider requesting `drive.file` scope.
- [x] Implement Google OAuth token auto-refresh logic in JWT callbacks.
- [x] Build direct Google Drive API abstraction layer (`src/server/googleDrive.ts`):
  - [x] Auto-provisioning of `Netherite/` root folder and `attachments/` subfolder.
  - [x] CRUD operations for `.md` notes and `.excalidraw` whiteboard files.
  - [x] Exponential backoff and retry handling (`withRetry`) for transient Drive network errors.
  - [x] Workspace metadata persistence in `netherite_workspace_metadata.json`.

### Phase 3: TipTap Markdown & KaTeX Mathematics Editor
- [x] Integrate TipTap v3 editor core with ProseMirror document model.
- [x] Build custom real-time KaTeX math extension for inline (`$...$`) and display (`$$...$$`) mathematical formulas.
- [x] Integrate code block syntax highlighting powered by `lowlight` with 100+ language grammars.
- [x] Add code block indentation preservation and <kbd>Tab</kbd> shortcut support.
- [x] Implement deferred image attachment pipeline: immediate blob URL preview with upload upon saving.
- [x] Add Slash Command block menu (`/`) for rapid formatting.

### Phase 4: Vector Whiteboard & Engineering Canvas
- [x] Integrate `@excalidraw/excalidraw` for vector whiteboards saved as native `.excalidraw` JSON.
- [x] Add domain-specific engineering palettes (circuit primitives, logic gates, system symbols).
- [x] Adapt canvas themes dynamically between dark and light modes.
- [x] Implement split-screen dual view (side-by-side notes or note + whiteboard).

### Phase 5: Workspace, Navigation & Organization
- [x] Build VS Code style hierarchical file explorer with nested folder trees.
- [x] Add drag-and-drop file and folder reordering with live drop target feedback.
- [x] Add multi-item selection with batch delete and batch move operations.
- [x] Implement custom folder color tagging with pastel palette persisted to Google Drive.
- [x] Build slide-out Document Outline sidebar extracting headings (`H1`–`H4`) with smooth navigation.
- [x] Add explorer search filter for fast note searching.

### Phase 6: Line Diffing, Changelogs & Cross-Device Sync
- [x] Build in-browser line-by-line diff engine (`computeLineDiff`) comparing active edits to Drive baseline.
- [x] Create visual Diff & Changelog modal (`DiffModal.tsx`) showing additions, deletions, and history snapshots.
- [x] Add dynamic navigation diff badge (e.g. `+14/-3` vs `Synced`).
- [x] Implement continuous local draft backup in `localStorage` (`netherite_draft_<fileId>`).
- [x] Build manual **Sync with Google Drive** workflow (`SyncModal.tsx`):
  - [x] Detection of unsaved local device edits.
  - [x] Confirmation prompt: *"Discard your changes and bring the latest stuff from Drive?"*.
  - [x] Checkbox to purge all local drafts across all documents.
  - [x] Cache-busting refetch of file list and active document.
  - [x] Safe editor and canvas re-mounting via `contentRevision`.
  - [x] "Discard & Pull" button directly within `DiffModal.tsx`.
- [x] Auto-refresh on device focus (`visibilitychange` / `window focus`) when documents are clean.

### Phase 7: UI Polish, Typography & Mobile Ergonomics
- [x] Curate typography switcher (Default Sans, Literata Serif, JetBrains Mono).
- [x] Implement adjustable Blue Light / Warm Reading Filter slider (0–100%) dynamically shifting palette tokens.
- [x] Add dynamic font size zooming via <kbd>Ctrl</kbd> + <kbd>Wheel</kbd> or pinch gestures (11px–32px).
- [x] Build mobile bottom navigation bar with quick access to Pages, Outline, Save, Diff, and Theme.
- [x] Implement Obsidian-style mobile keyboard accessory ribbon with one-tap math quick keys (`$`, `$$`).
- [x] Design artisanal, sovereign landing page for unauthenticated visitors.

### Phase 8: Flutter Multi-Platform Native App (Linux, Android, Windows)
- [x] Create standalone Flutter application in `/app` preserving Next.js web app at repository root.
- [x] Implement pure monochromatic Dark/Light theme, warm blue light filter (0–100%), and font styles in Flutter.
- [x] Build Google Drive API v3 data layer with OAuth2 loopback (Desktop) and Google Sign-In (Android).
- [x] Port line-by-line diff engine (`DiffUtils`) and changelog generator to Dart.
- [x] Implement continuous local draft caching and manual "Discard & Pull" sync protocol.
- [x] Build KaTeX mathematical formula rendering engine supporting inline (`$...$`) and display (`$$...$$`) math.
- [x] Implement native vector whiteboard canvas (`.excalidraw` format compatible).
- [x] Implement responsive desktop and mobile shell with navigation ribbon and outline drawer.
- [x] Successfully build and verify Linux desktop bundle (`build/linux/x64/debug/bundle/netherite_app`).
- [x] Successfully build and install Android APK (`app-debug.apk`) on physical Samsung device (`SM-M315F`).
- [x] 100% test pass rate on Flutter unit & diff engine test suite.

---

## Current Status: Multi-Platform Production Ready (v1.1)

Netherite is fully functional on Web (Next.js 15), Linux Desktop, Windows Desktop, and Android (Flutter), sharing the same zero-database Google Drive storage structure and monochromatic design language.

---

## Future Roadmap & Explorations

- [ ] **Bi-directional Wikilinks & Graph View**: Inter-note `[[Note Title]]` link resolution and visual knowledge graph visualization.
- [ ] **Offline PWA Support**: Full Service Worker caching to permit offline draft creation with automatic sync queue when reconnected.
- [ ] **PDF Export with KaTeX**: Server-side or client-side print stylesheets tailored for publishing academic PDFs.
- [ ] **Drive Trash Restoration**: Direct in-app interface to restore soft-deleted items from the user's Google Drive Trash.
