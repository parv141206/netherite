<div align="center">

# NETHERITE

**A sovereign, distraction-free markdown studio for mathematics, scientific prose, and thought.**  
*Stored 100% in your personal Google Drive as raw `.md` files. Zero proprietary databases. Zero vendor lock-in.*

[![Next.js 15](https://img.shields.io/badge/Next.js-15.2-black?style=flat-square&logo=next.js)](https://nextjs.org/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.8-blue?style=flat-square&logo=typescript)](https://www.typescriptlang.org/)
[![Tailwind CSS v4](https://img.shields.io/badge/Tailwind_CSS-v4-38bdf8?style=flat-square&logo=tailwindcss)](https://tailwindcss.com/)
[![KaTeX](https://img.shields.io/badge/KaTeX-Math-3298dc?style=flat-square)](https://katex.org/)
[![Google Drive Native](https://img.shields.io/badge/Storage-Google_Drive-4285F4?style=flat-square&logo=googledrive)](https://developers.google.com/drive)

</div>

---

## Highlights

- **Google Drive Native (Zero Database)**: All notes and asset images reside directly in your Google Drive under `/netherite`. If Netherite disappeared tomorrow, your notes remain completely intact, readable by Obsidian, VS Code, or any text editor.
- **Flawless KaTeX Mathematical Typesetting**: Real-time display math (`$$...$$`, `\[...\]`) and inline math (`$...$`, `\(...\)`) with error-tolerant latex parsing, inline editing, and formula formatting.
- **Editorial Typography & Visual Ergonomics**: Curated Literata serif font option, mono mode, and an adjustable **Blue Light Filter** slider (0–100%) that shifts the canvas and text into warm amber parchment without cumbersome overlays.
- **Precision Code Blocks**: Highlighting via `lowlight` with support for 100+ languages. Full indentation preservation on copy-paste and <kbd>Tab</kbd> indent shortcuts inside code blocks.
- **0ms Optimistic Performance**: Create, rename, move, and organize files and folders with zero latency. Seamless background Google Drive synchronization with line-by-line diff tracking.
- **Pastel Folder Organization**: Elegant pastel pills for folders across light and dark modes with persistent metadata stored safely in your Google Drive.
- **Deferred Image Attachment Pipeline**: Drag or paste images into notes with zero delay local preview. Only images that are kept in the note upon saving are uploaded to Drive—deleted images are cleanly discarded.

---

## Quick Start

### Prerequisites

- [Bun](https://bun.sh/) (or Node.js 18+)
- A [Google Cloud Project](https://console.cloud.google.com/) with **Google Drive API** enabled.

### 1. Clone & Install

```bash
git clone <your-repo-url> netherite
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

---

## Keyboard Shortcuts

| Shortcut | Action |
| :--- | :--- |
| <kbd>Ctrl</kbd> + <kbd>S</kbd> / <kbd>Cmd</kbd> + <kbd>S</kbd> | Save note to Google Drive |
| <kbd>Ctrl</kbd> + <kbd>N</kbd> / <kbd>Cmd</kbd> + <kbd>N</kbd> | Create new note |
| <kbd>/</kbd> | Open block command slash menu |
| <kbd>Tab</kbd> | Indent 4 spaces inside code blocks |
| <kbd>Ctrl</kbd> + <kbd>Wheel</kbd> / Pinch | Dynamic font zoom scaling (11px–32px) |

---

## Architecture

```
src/
├── app/                  # Next.js 15 App Router & API handlers
├── components/
│   ├── editor/           # TipTap core, KaTeX MathExtension, lowlight syntax
│   ├── landing/          # Artisanal sovereign landing page & showcase
│   └── workspace/        # Sidebar, HeaderBar, Outline, DiffModal, Tabs
└── server/
    ├── api/              # tRPC routers (notes, folders, metadata)
    ├── auth/             # NextAuth v5 with Google Drive OAuth2
    └── googleDrive.ts    # Direct Google Drive API operations (zero DB)
```

---

## Deployment

Deploying to **Vercel** takes under 2 minutes. See [DEPLOYMENT.md](./DEPLOYMENT.md) for full instructions.

---

## License

MIT License. Designed with care for thinkers, mathematicians, and writers.
