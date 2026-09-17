# Netherite Friction Audit & Hardening Tracker

This document tracks all micro-frictions, race conditions, main-thread performance bottlenecks, and UX inconsistencies identified across Netherite's flows.

---

## Progress Checklist

### Phase 1: Critical Data Integrity & Core Performance (P0)
- [x] **Tab-Switching Draft Isolation**: Eliminated race condition in `WorkspaceLayout.tsx` where switching tabs wrote previous file's draft into newly opened file's localStorage key using `contentFileIdRef` and pre-switch flushing.
- [x] **Main-Thread Diff Janking Fix**: Replaced synchronous unmemoized `computeLineDiff` (O(M*N) DP) running on every keystroke in `WorkspaceLayout.tsx` with instant string dirty checking and a 250ms debounced diff summary badge.
- [x] **Diff DP Safeguard**: Guarded `computeLineDiff` against excessive matrix sizes (`m * n > 250,000`) in `diffUtils.ts` to prevent freezing browser threads on large Excalidraw/Markdown files.

### Phase 2: Multi-Modal Canvas & Export Pipeline (P1)
- [x] **Universal Diagram PDF Export**: Passed live rendered SVGs from Mermaid, TikZ, Apollon UML, and Excalidraw into `PdfExportModal.tsx` so diagram exports render crisp vector sheets instead of blank templates.
- [x] **Split-Screen PDF Scope**: Scoped ProseMirror DOM extraction in `PdfExportModal.tsx` strictly to `main .ProseMirror` to resolve dual-pane split view conflicts.
- [x] **Mermaid Studio Asynchronous Sync**: Added synchronization effect for `initialContent` in `MermaidEditor.tsx` so Drive-loaded content populates without resetting to default templates.
- [x] **TikZ Studio Tab Indentation**: Added <kbd>Tab</kbd> key indentation support (2 spaces) without blurring focus in `TikzCanvas.tsx`.
- [x] **Google Calendar Timezone Local Formatting**: Fixed UTC date rollover (`toISOString().split('T')[0]`) in `CalendarView.tsx` with `formatLocalDate()`, eliminating 1-day date shift for positive timezone offsets (+05:30, +09:00, etc.).

### Phase 3: Canvas Ergonomics & Workspace Polish (P2)
- [x] **Excalidraw Viewport & Sidebar State Persistence**: Persisted zoom, pan coordinates (`scrollX`, `scrollY`, `zoom`), and engineering sidebar state in `localStorage` across tab switches in `ExcalidrawEditor.tsx` (removed hardcoded `force: true`).
- [x] **Copilot Multi-Modal File Safety Guard**: Prevented Gemini Copilot (`onInsertContent`, `onReplaceContent`) from corrupting `.apollon` or `.excalidraw` ASTs with raw Markdown text.
- [x] **Tab Bar Horizontal Scroll Ergonomics**: Added mouse wheel horizontal scrolling on the tab container and smooth overflow navigation in `WorkspaceLayout.tsx`.
- [x] **Accidental Tab Close Notice**: Added confirmation prompt before closing dirty/unsaved tabs to protect unsaved work.
- [x] **Search Query Throttling & In-Memory Folder Tree Caching**: Added 350ms debouncing in `GlobalSearchModal.tsx` and 3-minute in-memory folder tree caching in `src/server/googleDrive.ts` to avoid redundant 1000-folder Google Drive API crawling.
- [x] **Global Search Folder Navigation**: Added `onSelectFolder` and `folderToExpand` wiring so selecting a folder in Global Search reveals and expands it in the Explorer sidebar.
- [x] **Keyboard Ergonomics**: Added <kbd>F2</kbd> shortcut support in `Sidebar.tsx` to immediately rename the active file or selected tree item.
