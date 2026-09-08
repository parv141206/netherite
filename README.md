<div align="center">

<img src="public/logo.svg" width="72" height="72" alt="Netherite Logo" />

# NETHERITE

**A sovereign personal workspace for mathematics, prose, vector canvas, and systems architecture.**  
*Stored 100% in your personal Google Drive as open standard files (`.md`, `.apollon`, `.excalidraw`). Zero proprietary databases. Zero vendor lock-in.*

[![Next.js 15](https://img.shields.io/badge/Next.js-15.5-black?style=flat-square&logo=next.js)](https://nextjs.org/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.8-blue?style=flat-square&logo=typescript)](https://www.typescriptlang.org/)
[![Tailwind CSS v4](https://img.shields.io/badge/Tailwind_CSS-v4-38bdf8?style=flat-square&logo=tailwindcss)](https://tailwindcss.com/)
[![KaTeX](https://img.shields.io/badge/KaTeX-Math-3298dc?style=flat-square)](https://katex.org/)
[![Apollon](https://img.shields.io/badge/UML-Apollon_Engine-6366f1?style=flat-square)](https://github.com/ls1intum/Apollon)
[![Mermaid](https://img.shields.io/badge/Diagrams-Mermaid-ff3670?style=flat-square&logo=mermaid)](https://mermaid.js.org/)
[![Excalidraw](https://img.shields.io/badge/Canvas-Excalidraw-e02424?style=flat-square)](https://excalidraw.com/)
[![MCP Server](https://img.shields.io/badge/MCP-Model_Context_Protocol-00D26A?style=flat-square&logo=anthropic)](https://modelcontextprotocol.io/)
[![Google Drive Native](https://img.shields.io/badge/Storage-Google_Drive-4285F4?style=flat-square&logo=googledrive)](https://developers.google.com/drive)

</div>

---

## Highlights

### 1. Sovereign Google Drive Storage (Zero Database)
- Every file lives directly in your personal Google Drive under the `/Netherite` root folder.
- Raw files are saved in transparent standard formats: `.md` for prose, `.apollon` for UML models, `.mmd` for Mermaid diagrams, and `.excalidraw` for vector sketches.
- Binary asset attachments (images, diagrams) stream directly from Google Drive.
- If Netherite disappeared tomorrow, your notes remain completely intact, portable, and readable in Obsidian, VS Code, or any text editor.

### 2. Quad Creative Modalities

#### A. Markdown & KaTeX Scientific Prose (`.md`)
- **Real-Time Mathematical Typesetting**: Full support for display math (`$$...$$`, `\[...\]`) and inline math (`$...$`, `\(...\)`) with error-tolerant live KaTeX rendering.
- **Visual Ergonomics & Typography**: Literata serif, Inter sans, and JetBrains mono fonts with an adjustable **Blue Light Filter** slider (0–100%) that shifts the canvas into warm amber parchment.
- **Precision Code Blocks**: Syntax highlighting for 100+ languages via `lowlight` with full indentation preservation on copy-paste and <kbd>Tab</kbd> indent shortcuts.

#### B. Mermaid Code-to-Diagram Studio (`.mmd` / `.mermaid`)
- **Real-Time Code Preview**: Type Mermaid diagram syntax on the left and see crisp vector diagrams update instantly on the right.
- **Interactive Canvas**: Drag to pan, <kbd>Ctrl</kbd> + <kbd>Scroll</kbd> wheel zoom (20%–350%), and one-click zoom reset.
- **Comprehensive Preset Templates**: Flowchart (TD/LR), Sequence Diagrams, Class Diagrams, State Diagrams, Entity Relationship (ER), Git Graphs, Gantt Roadmaps, Pie Distribution, Mindmaps, and User Journeys.
- **Resilient Error Tolerant Studio**: Live syntax warning banners that pinpoint parse issues without clearing previously valid diagram SVGs.
- **Universal Exports**: Download high-DPI 2x rasterized PNGs with theme-matched backgrounds, export crisp resolution-independent SVG files, or copy SVG / Mermaid code to clipboard in 1-click.

#### C. Apollon Architecture & UML Studio (`.apollon`)
Built-in UML modeling engine supporting **all 13 diagram specifications**:
- **Structural Models**:
  - **Class Diagram**: Classes, abstract classes, interfaces, enumerations, packages, attributes, methods, and inheritances.
  - **Object Diagram**: Runtime instance values, data fields, and state snapshot links.
  - **Component Diagram**: Software components, subsystems, and interface ball-and-socket connections.
  - **Deployment Diagram**: Execution nodes, hardware topologies, devices, and deployable artifacts.
- **Behavioral & Process Workflows**:
  - **Activity Diagram**: Action nodes, decision diamonds, merge points, forks, joins, and swimlanes.
  - **Use Case Diagram**: Actors, use case boundaries, and system interaction flows.
  - **Communication Diagram**: Collaborating objects exchanging sequenced messages.
  - **Flowchart**: Algorithmic decision trees, terminals, subroutines, and I/O blocks.
  - **BPMN 2.0**: Business Process Model and Notation with pools, tasks, gateways, and event triggers.
- **Formal Systems & Grammars**:
  - **Petri Net**: Mathematical modeling of distributed systems with places, transitions, and token flow.
  - **Reachability Graph**: State-space exploration graphs and marking reachability networks.
  - **SFC (Sequential Function Chart)**: Step-by-step automation control with transition conditions and action tables.
  - **Syntax Tree**: Hierarchical parse trees with non-terminal and terminal grammar symbols.
- **Direct Canvas Export**: Export diagrams to **PNG**, **JPEG**, **PDF**, **SVG**, or **JSON** directly from the editor.

#### D. Excalidraw Vector Whiteboard (`.excalidraw`)
- Infinite virtual canvas powered by official `@excalidraw/excalidraw`.
- Dark and light mode synchronization, hand-drawn vector aesthetics, and engineering primitives.

### 3. Native Model Context Protocol (MCP) Server
Netherite includes an official **MCP Server** (`@modelcontextprotocol/sdk`) that allows external AI coding agents (Claude Desktop, Cursor, Antigravity, Windsurf, Claude Code) to autonomously search, read, create, and manage your notes and visual diagrams directly in your Google Drive workspace.

- **10 Native Tools**:
  1. `netherite_list_files`: List documents and folders with type filters (`markdown`, `uml`, `mermaid`, `drawing`, `folder`).
  2. `netherite_search_notes`: Search notes by keyword or filename.
  3. `netherite_read_note`: Retrieve raw document content and metadata.
  4. `netherite_create_markdown`: Author prose with KaTeX math equations and code blocks.
  5. `netherite_create_mermaid`: Generate sequence diagrams, flowcharts, ER diagrams, and roadmaps.
  6. `netherite_create_uml`: Model systems across all 13 Apollon diagram types (with auto-layout for classes & relationships).
  7. `netherite_create_drawing`: Sketch Excalidraw vector scenes with auto-placed cards, shapes, and arrows.
  8. `netherite_update_note`: Overwrite or append content to any existing note.
  9. `netherite_manage_folders`: Create folders and organize files.
  10. `netherite_delete_file`: Move files to Google Drive trash.
- **Zero-Config Local Auth**: Logging into Netherite automatically writes active credentials to `~/.netherite/credentials.json`, enabling immediate CLI access without manual token pasting.
- **1-Click Config**: Open Netherite Settings to copy pre-configured JSON for Claude Desktop or Cursor.

### 4. Sovereign In-Browser Diff & Changelog Engine
- **Prefix & Suffix Trimmed LCS**: Custom diff algorithm running entirely in the browser that prunes unchanged lines in $O(N)$ time, calculating diffs on 2,000-line JSON documents in $<1\text{ms}$.
- **Semantic Diagram Changes Overview**: Automatically extracts high-level changes for UML diagrams (e.g. `Modified attribute in User: "+ id: string" → "+ id: number"` or `Added class "Order"`).
- **Compact Folded Diff View**: Collapses long runs of unchanged boilerplate into clean expandable bars (`··· Expand N unchanged lines ···`), putting modified lines directly in focus.
- **Changelog History**: Local persistent changelog tracking every save and sync event with Google Drive.

### 5. 0ms Optimistic Performance
- Create, rename, delete, and organize files and folders with zero latency.
- Seamless background synchronization with Google Drive.
- Multi-tab document sessions with split-pane comparison view.

---

## Quick Start

### Prerequisites
- [Bun](https://bun.sh/) (or Node.js 18+)
- A [Google Cloud Project](https://console.cloud.google.com/) with the **Google Drive API** enabled.

### 1. Clone & Install
```bash
git clone https://github.com/parv141206/netherite.git
cd netherite
bun install
```

### 2. Configure Environment
Copy `.env.example` to `.env`:
```bash
cp .env.example .env
```

Fill in your Google OAuth credentials:
```env
AUTH_SECRET="<generate-with-openssl-rand-base64-32>"
AUTH_TRUST_HOST="true"
AUTH_GOOGLE_ID="your-client-id.apps.googleusercontent.com"
AUTH_GOOGLE_SECRET="your-client-secret"
```

### 3. Run Locally
```bash
bun run dev
```
Open [http://localhost:3000](http://localhost:3000) in your browser.

### 4. Connect AI Assistants (MCP Setup)
Add Netherite to your **Claude Desktop** (`claude_desktop_config.json`), **Cursor**, or **Antigravity** settings:

```json
{
  "mcpServers": {
    "netherite": {
      "command": "bun",
      "args": ["run", "<absolute-path-to-netherite>/src/mcp/cli.ts"]
    }
  }
}
```

*(You can also open Netherite Settings in the app and click **Claude Desktop JSON** to copy your exact configuration in 1 click).*

#### Try Prompting Your Agent:
> *"Design an event-driven payment system in Netherite: create an Apollon class diagram for Payment and Invoice entities, a Mermaid sequence flow for Stripe webhooks, an Excalidraw whiteboard of AWS cloud architecture, and a comprehensive RFC markdown document with math equations."*

---

## Keyboard Shortcuts

| Shortcut | Action |
| :--- | :--- |
| <kbd>Ctrl</kbd> + <kbd>S</kbd> / <kbd>Cmd</kbd> + <kbd>S</kbd> | Save document to Google Drive |
| <kbd>Ctrl</kbd> + <kbd>N</kbd> / <kbd>Cmd</kbd> + <kbd>N</kbd> | Create new markdown note |
| <kbd>/</kbd> | Open block command slash menu in editor |
| <kbd>Tab</kbd> | Indent 4 spaces inside code blocks |
| <kbd>Ctrl</kbd> + <kbd>Wheel</kbd> / Pinch | Dynamic font zoom scaling (11px–32px) |

---

## Architecture

```
src/
├── app/                  # Next.js 15 App Router & API handlers
├── apollon/              # Vendored Apollon UML Engine (13 diagram specifications)
├── components/
│   ├── canvas/           # DrawingCanvas (Excalidraw), UmlCanvas (Apollon), MermaidCanvas (Mermaid)
│   ├── editor/           # TipTap core, KaTeX MathExtension, lowlight syntax
│   ├── landing/          # Artisanal sovereign landing page & showcase
│   ├── ui/               # AppleFullPageLoader, dialogs, badges, theme toggle
│   └── workspace/        # Sidebar, HeaderBar, DiffModal, CreateDiagramModal, Tabs
└── server/
    ├── api/              # tRPC routers (notes, folders, metadata)
    ├── auth/             # NextAuth v5 with Google Drive OAuth2
    └── googleDrive.ts    # Direct Google Drive API operations (zero DB)
```

---

## License

MIT License. Designed with care for thinkers, mathematicians, engineers, and writers.
