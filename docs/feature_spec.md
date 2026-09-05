# Netherite Feature Specification

## 1. Product Overview & Philosophy

**Netherite** is a sovereign, distraction-free markdown studio and vector whiteboard web application inspired by Obsidian and NotebookLM, designed specifically for mathematics, engineering, scientific prose, and deep thought.

### Core Philosophy
- **Zero Proprietary Databases**: 100% of documents, whiteboards, metadata, and media assets are stored directly in the user's personal Google Drive. If Netherite is ever offline, every file remains raw, human-readable `.md` or open standard `.excalidraw` format readable by Obsidian, VS Code, or any text editor.
- **Visual Ergonomics & Monochromatic Polish**: Refined monochromatic dark and light interfaces with zero visual noise, typography suited for long reading sessions, and built-in blue light regulation.
- **Cross-Device Freedom**: Seamless continuity between desktop, tablet, and mobile browsers with robust sync conflict resolution and instant discard-and-pull workflows.

---

## 2. Editor & Studio Capabilities

### 2.1 Scientific Markdown + KaTeX Mathematics
- **Editor Core**: Powered by TipTap (ProseMirror architecture).
- **Mathematical Typesetting**: Real-time KaTeX integration supporting:
  - Inline formulas (`$...$`, `\(...\)`)
  - Display math blocks (`$$...$$`, `\[...\]`)
  - Live preview and inline editing with LaTeX syntax error tolerance.
- **Rich Markdown Elements**:
  - Headings (`#`, `##`, `###`) with auto-assigned anchors for document navigation.
  - Formatted tables with interactive column and row manipulation.
  - Task lists / checklists with click-to-toggle completion.
  - Syntax-highlighted code blocks powered by `lowlight` (100+ languages supported) with indentation preservation and <kbd>Tab</kbd> shortcut support.
- **Deferred Image Attachment Pipeline**:
  - Paste or drag-and-drop images directly into notes with immediate local blob preview.
  - Images are uploaded to Google Drive's `attachments/` folder only when the note is saved; images removed before saving are discarded cleanly without cluttering storage.

### 2.2 Vector Whiteboard & Engineering Canvas
- **Whiteboard Engine**: Embedded Excalidraw vector canvas for system architecture diagrams, schematics, and sketches.
- **Format**: Native `.excalidraw` (JSON-based open format) stored directly in Google Drive.
- **Specialized Engineering Suite**:
  - Engineering component sidebar (logic gates, circuit primitives, system symbols).
  - Bottom panel controls for quick canvas properties.
  - Responsive light/dark canvas theme adaptation.

### 2.3 Split-Screen Dual Studio
- Side-by-side editing: view two markdown notes simultaneously, or pair a markdown note with an Excalidraw engineering canvas.
- Independent scrolling and synchronized save capabilities.

---

## 3. Storage & Synchronization (Google Drive)

### 3.1 Google Drive File System
- **Authentication**: NextAuth v5 with Google Provider requesting restricted `drive.file` scope (Netherite can only access files and folders it creates).
- **Directory Structure**:
  ```
  ~/Google Drive/
  └── Netherite/
      ├── documents/folders/
      │   ├── Quantum Mechanics.md
      │   └── Topology.excalidraw
      ├── attachments/
      │   └── [uploaded image assets]
      └── netherite_workspace_metadata.json
  ```
- **Metadata Persistence**: Folder color tags and custom workspace settings are saved in `netherite_workspace_metadata.json` directly within the Drive root folder.

### 3.2 Live Line Diffing & Changelog
- **Live In-Browser Diff Engine**: Computes additions, deletions, and line-level changes against the last Google Drive baseline (`computeLineDiff`).
- **Diff Badge**: Dynamic badge in the navigation bar displaying unsaved difference counts (e.g. `+12/-3`) or `Synced` status.
- **Changelog History**: Tracks timestamped editing events and diff summaries locally in `localStorage` per document.

### 3.3 Cross-Device Sync & Conflict Resolution
- **Continuous Local Drafts**: Automatic background draft backup (`netherite_draft_<fileId>`) prevents data loss during sudden tab closures or mobile battery drops.
- **Manual Sync & Discard Flow**:
  - Explicit **"Sync with Google Drive"** action available via HeaderBar, DiffModal, MobileBottomBar, and Explorer context menu.
  - If local changes exist on a device (e.g., stale mobile edits overriding fresh laptop work), Netherite prompts:
    > *"Discard your changes and bring the latest stuff from Drive?"*
  - Optional checkbox: *"Also clear any other local drafts on this device"* to completely purge stale mobile drafts across all documents in one click.
  - Executes a clean cache bust, updates state, and safely re-mounts the editor.
- **Focus Auto-Refresh**:
  - When returning to the browser tab on desktop or phone (`visibilitychange` / `window focus`), if the document is clean and has no unsaved drafts, Netherite automatically refetches the latest files and content from Google Drive.

---

## 4. Navigation & Organization

### 4.1 File Explorer & Sidebar
- **Hierarchical Tree**: Full support for nested folders and document organization.
- **Zero-Latency Optimistic Operations**: Instant file creation, renaming, moving, and deletion.
- **Drag-and-Drop Organization**: Drag files and folders into directories with live visual highlight targets.
- **Multi-Item Batch Selection**: Select multiple files/folders via checkboxes or Shift-selection for batch trashing or moving.
- **Pastel Folder Color Tagging**: Custom color tagging (Rose, Peach, Amber, Mint, Teal, Blue, Indigo, Purple, Pink) persisted to Google Drive.
- **Quick Search Filter**: Real-time explorer search bar to instantly filter notes by title.

### 4.2 Document Outline
- Slide-out Document Outline sidebar extracting headings (`H1` through `H4`).
- Smooth click-to-scroll navigation to headings within documents.

---

## 5. UI, UX & Visual Ergonomics

- **Theme Engine**: Seamless toggle between pure monochromatic Dark mode (`#09090b` palette) and Light mode (`#fcfcfc` palette).
- **Blue Light / Warm Reading Filter**:
  - Built-in warmth slider (0% to 100%) in the options popover.
  - Dynamically recalculates CSS color tokens and warmth hue/sepia filters to simulate amber parchment, reducing eye strain during night writing sessions.
- **Typography Styles**:
  - **Default**: Modern sans-serif (Inter/Geist) for clean readability.
  - **Literata**: Elegant serif for immersive scientific and book-style reading.
  - **Mono**: Monospaced font for code-heavy and structured technical notes.
  - **Dynamic Zoom**: Font scaling adjustable via <kbd>Ctrl</kbd> + <kbd>Wheel</kbd> or pinch gestures (11px to 32px).
- **Reading Statistics**: Word count, character count, and estimated reading time displayed in the document popover.
- **Mobile Experience**:
  - Responsive auto-collapsing sidebar on screens `< 768px`.
  - Native feel Mobile Bottom Bar with quick navigation between Pages, Outline, Save/New, Diff, and Theme.
  - Obsidian-style mobile keyboard accessory ribbon for one-tap math insertion (`$`, `$$`), heading toggles, formatting, undo/redo, and sync.
- **Keyboard Shortcuts**:
  - <kbd>Ctrl</kbd> + <kbd>S</kbd> / <kbd>Cmd</kbd> + <kbd>S</kbd>: Save to Google Drive
  - <kbd>Ctrl</kbd> + <kbd>N</kbd> / <kbd>Cmd</kbd> + <kbd>N</kbd>: Create note
  - <kbd>/</kbd>: Slash command block menu
  - <kbd>Tab</kbd>: Indent 4 spaces in code blocks
