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

### Phase 9: Drive Sync Refinement, Excalidraw Integrity, Native Images & Production Routing
- [x] **Strict Netherite Root Scoping**: Constrained Google Drive recursive discovery to `Netherite/`, preventing user personal root folder pollution while indexing copied and nested files.
- [x] **OAuth Scope Checker & 1-Click Upgrade**: Added `checkDriveScope` and `SyncModal` banner alerting users to upgrade from legacy `drive.file` to full `drive` permissions.
- [x] **Excalidraw Official Restoration**: Replaced manual serialization with `@excalidraw/excalidraw`'s official `restoreElements`, `restoreAppState`, and `serializeAsJSON`.
- [x] **Eliminated Excalidraw Mount Dirtying & Race Condition**:
  - Gated canvas mount behind `isLoadingContent` to prevent premature mounting with empty canvas.
  - Implemented `isEmptyExcalidraw` to automatically purge empty/poisoned drafts from `localStorage`.
  - Added robust baseline scene fingerprinting based on element geometry and text, suppressing false `+10 -4133` diffs on initial load.
- [x] **Native Image Viewer**: Built `src/components/workspace/ImageViewer.tsx` with zoom, pan, fit-to-screen, and download controls; backed by `getImageAsset` base64 streaming. Preserved image file extensions during inline renames.
- [x] **Route Restructuring & Dedicated Landing Page**:
  - Relocated full studio editor to `/editor` (`src/app/editor/page.tsx`).
  - Set root `/` (`src/app/page.tsx`) to session-aware landing page with dynamic "Open Editor" / "Launch Studio" CTAs.
- [x] **Google OAuth Production Compliance**:
  - Created `/privacy` compliant with Google API Services User Data Policy and Limited Use disclosures.
  - Created `/terms` covering sovereign ownership, zero-database architecture, and disclaimers.
  - Verified site ownership in Google Search Console via HTML meta tag, enabling **Production (External)** publishing status in Google Cloud Console.

### Phase 10: Friction Elimination & Production Hardening
- [x] **Tab-Switching Draft Isolation**: Eliminated cross-file draft overwriting via `contentFileIdRef` and pre-switch flush.
- [x] **Main-Thread Performance Hardening**: Replaced synchronous unmemoized O(M*N) DP diff execution with instant string inequality dirty detection and debounced summary computation.
- [x] **Diff DP Safeguard**: Guarded `computeLineDiff` against freezing on large 2000+ line files.
- [x] **Universal Diagram PDF Export**: Direct rendered SVG extraction from Mermaid, TikZ, Apollon UML, and Excalidraw into print layout and preview.
- [x] **Mermaid & TikZ Studio Ergonomics**: Asynchronous content sync from Google Drive and <kbd>Tab</kbd> key indentation support.
- [x] **Timezone Rollover Fix**: Timezone-safe local calendar grid computation eliminating 1-day shifts in positive UTC offsets.
- [x] **Excalidraw Viewport & Sidebar State Persistence**: Whiteboard zoom, pan coordinates, and engineering sidebar state persisted in `localStorage`.
- [x] **Copilot Safety Guard**: Multi-modal file format gating preventing AI text insertion into `.apollon` and `.excalidraw` JSON documents.
- [x] **Search Query Throttling & In-Memory Folder Tree Caching**: 350ms debouncing and 3-minute folder tree cache in Google Drive backend.
- [x] **Search Folder Navigation & Keyboard Ergonomics**: Folder selection reveals/expands in Explorer sidebar; <kbd>F2</kbd> shortcut renames active document or selected item.

### Phase 11: Visual Notes Engine Overhaul (Human Study Whiteboard Generation)
- [x] **2D Multi-Column Masonry Bin-Packing**: Shortest-column greedy bin packing distributing topics across 2–3 columns by default, producing natural 16:9 and 4:3 whiteboards instead of 15,000px 1D vertical ribbons.
- [x] **Adaptive Tiered Tree Layout**: Dynamic column grid layout for subtopics replacing rigid 4-sector stars, supporting arbitrary subtopic counts (5, 8, 12+) with child leaf concept cards.
- [x] **Pill Topic Headers & Authentic Excalidraw Pastel Palette**: Pill containers (`roundness: { type: 3 }`, height 72px) with `#1e1e1e` dark ink borders and official Excalidraw pastel fills (`#a5d8ff`, `#b2f2bb`, `#d0bfff`, `#ffc9c9`, `#fff4e6`, `#ffec99`, `#c5f6fa`, `#f3f0ff`).
- [x] **Native Elbowed Arrows with Manhattan Routing**: `elbowed: true` arrows with 90-degree stepped waypoints and bidirectional node bindings (`startBinding`, `endBinding`), preserving clean Manhattan routing during canvas manipulation.
- [x] **Indentation-Aware Markdown List & Bold-Term Definition Parsing**: Structured parsing for `- **Term**: Description` items into formatted concept cards with distinct bold headers and body text.
- [x] **CLI & In-App UI Controls**: Added `--cols`, `--layout`, `--col-gap` CLI options and interactive Layout Mode / Columns dropdowns in `VisualNotesModal.tsx`.
- [x] **Automated Test Suite**: 7 comprehensive unit tests with 93 assertions covering parser, 2D masonry aspect ratios, elbow connectors, and Excalidraw v2 scene generation.

---

## Current Status: Multi-Platform Hardening & Friction Removal (v1.3)

Netherite is undergoing comprehensive hardening to eliminate micro-frictions, race conditions, main-thread janks, and multi-modal edge cases.

---

## Future Roadmap & Explorations

- [ ] **Bi-directional Wikilinks & Graph View**: Inter-note `[[Note Title]]` link resolution and visual knowledge graph visualization.
- [ ] **Offline PWA Support**: Full Service Worker caching to permit offline draft creation with automatic sync queue when reconnected.
- [ ] **Drive Trash Restoration**: Direct in-app interface to restore soft-deleted items from the user's Google Drive Trash.

