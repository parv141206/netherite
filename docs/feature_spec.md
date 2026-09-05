# Netherite Feature Specification

## Overview
Netherite is a highly sophisticated, browser-based, completely monochromatic note-taking web application inspired by Obsidian and NotebookLM. All data (Markdown files and images) is stored entirely in the user's Google Drive.

## Features

### Storage (Google Drive)
- Uses `next-auth` for authentication (Google Provider).
- Requests `drive.file` scope (only accesses files it created).
- Creates a `Netherite` root folder on the user's Drive, containing `.md` files and an `attachments` subfolder for media.
- Provides a settings option to change the default directory path.
- Option to import existing Markdown files into the app.

### Editor
- Powered by TipTap.
- Full Markdown support (Headings, bold, italic, code blocks, tables).
- Image support: Pasting/dropping images uploads them directly to Google Drive and inserts the rendered image into the document.
- LaTeX Math support: Powered by KaTeX for high-performance rendering of standard mathematical syntax.

### UI / UX
- **Theme**: Monochromatic (Black and White). Professional, polished look.
- **Responsiveness**: Fully responsive across devices.
- **Configurability**: CSS Variables defined centrally for easy adjustment of border radii, accent colors, etc.
- **Typography**: Clean, elegant sans-serif font (Inter/Geist) for prose; Mono font (JetBrains Mono) for code blocks.
- **No Dead Buttons**: Every visible button must be wired up to an action or a "coming soon" toast if not yet implemented.
