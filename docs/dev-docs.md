# Netherite Developer Documentation

## 1. Overview & Architecture

Netherite is built on the **T3 Stack** (Next.js 15 App Router, TypeScript, tRPC, Tailwind CSS) configured for a **zero-database architecture**. Rather than persisting data in PostgreSQL or MongoDB, every note, whiteboard, image asset, and workspace setting lives inside the user's personal Google Drive account.

### Technology Stack
- **Framework**: Next.js 15 (App Router, Turbopack)
- **Language**: TypeScript 5.8
- **API Layer**: tRPC v11 with `@tanstack/react-query` v5
- **Authentication**: NextAuth v5 (Auth.js) with Google Provider
- **Storage**: Google Drive API (`googleapis` v144) via restricted `drive.file` scope
- **Note Editor**: TipTap v3 (ProseMirror engine) with `@tiptap/starter-kit`, code highlighting via `lowlight`, and KaTeX math extension
- **Whiteboard Engine**: Embedded `@excalidraw/excalidraw`
- **Styling**: Tailwind CSS v4 & custom CSS variables for monochromatic themes and blue light warmth adjustment

---

## 2. Setting up Google Cloud Platform (GCP) Credentials

Netherite requires Google Drive API access to store and retrieve user notes and images. You must set up a Google Cloud Project to obtain OAuth 2.0 credentials (`Client ID` and `Client Secret`).

### Step-by-Step Setup

1. **Create a New Project:**
   - Go to the [Google Cloud Console](https://console.cloud.google.com/).
   - Click the project dropdown at the top and select **New Project**.
   - Name it "Netherite" and click **Create**.

2. **Enable Google Drive API:**
   - In the left sidebar, navigate to **APIs & Services > Library**.
   - Search for **Google Drive API** and click **Enable**.

3. **Configure OAuth Consent Screen:**
   - Go to **APIs & Services > OAuth consent screen**.
   - Choose **External** (unless you have a Google Workspace organization). Click **Create**.
   - **App Information**: Name: "Netherite", enter your email for support and developer contact.
   - **Scopes**: Click **Add or Remove Scopes** and add:
     - `https://www.googleapis.com/auth/drive.file` (grants access strictly to files/folders created by Netherite).
   - **Test Users**: Add your Google account email under Test Users so you can authenticate during development.
   - Save and continue.

4. **Create OAuth Credentials:**
   - Go to **APIs & Services > Credentials**.
   - Click **Create Credentials > OAuth client ID**.
   - **Application type**: Web application.
   - **Name**: "Netherite Web Client".
   - **Authorized JavaScript origins**:
     - `http://localhost:3000` (for local development)
   - **Authorized redirect URIs**:
     - `http://localhost:3000/api/auth/callback/google`
   - Click **Create** and copy the Client ID and Client Secret.

5. **Environment Configuration (`.env`):**
   - Create `.env` from `.env.example`:
     ```env
     AUTH_SECRET="your-generated-secret"       # Generate via: openssl rand -base64 32
     AUTH_TRUST_HOST="true"
     AUTH_GOOGLE_ID="your-client-id.apps.googleusercontent.com"
     AUTH_GOOGLE_SECRET="your-client-secret"
     ```

---

## 3. Storage & Google Drive Integration (`src/server/googleDrive.ts`)

### Root Folder Management
- On first login, Netherite automatically queries Google Drive for an existing root folder named `Netherite`.
- If absent, it creates `Netherite` with MIME type `application/vnd.google-apps.folder`.
- An `attachments/` subfolder is created under the root folder for image uploads.
- A metadata file `netherite_workspace_metadata.json` stores workspace customizations such as custom folder color tags.

### Supported File Types
| Type | Extension | MIME Type |
| :--- | :--- | :--- |
| Markdown Note | `.md` | `text/markdown` |
| Vector Whiteboard | `.excalidraw` | `application/vnd.excalidraw+json` |
| Folder | N/A | `application/vnd.google-apps.folder` |
| Image Attachment | `.png`, `.jpg`, `.webp` | `image/*` (stored under `attachments/`) |

### Token Refresh & Network Resilience
- Google OAuth tokens are automatically refreshed in the NextAuth JWT callback using Google's token endpoint (`oauth2.googleapis.com/token`) when access tokens expire.
- All Google Drive operations run through a retry wrapper (`withRetry`) to handle transient rate limits and network drops.

---

## 4. Synchronization Lifecycle & Conflict Resolution

### 4.1 Local Draft Backups
- Keystrokes in the active document write continuously to `localStorage` under `netherite_draft_<fileId>`.
- If the browser tab is closed unexpectedly, reopening the tab retrieves the local draft so no unsaved thoughts are lost.

### 4.2 Diff Engine (`src/components/workspace/diffUtils.ts`)
- Computes character- and line-level diffs (`computeLineDiff`) by comparing `lastSavedContent` (from Google Drive) with `noteContent` (in-memory edits).
- Generates additions/deletions statistics for the navigation badge and the visual diff viewer (`DiffModal.tsx`).
- Saves timestamped changelog snapshots into `netherite_changelog_<fileId>`.

### 4.3 Manual Sync & Discard Protocol
When switching devices (e.g. from laptop to phone), a mobile browser may have stale local drafts from an earlier session that conflict with newly saved notes from the laptop.
- **Sync Trigger**: Users can trigger sync from the navigation bar, Diff modal ("Discard & Pull"), mobile bottom ribbon, or Explorer context menu.
- **SyncModal**:
  - If local changes exist: prompts *"Discard your changes and bring the latest stuff from Drive?"*
  - Allows optionally clearing all local drafts on the device in one click.
  - Clears `netherite_draft_*` keys from `localStorage`.
  - Refetches `notes.list` and active note `notes.get` directly from Google Drive with `{ staleTime: 0 }`.
  - Increments `contentRevision` state, forcing `<Editor>` and `<DrawingCanvas>` to cleanly remount with fresh content.
  - Displays a confirmation toast: *"Discarded local changes and synced latest from Google Drive."*
- **Focus Auto-Refresh**:
  - Listening to `visibilitychange` and window `focus`: if the active document is clean and has no unsaved local drafts, Netherite automatically refetches in the background when the user returns to the tab.

---

## 5. Project Directory Structure

```
src/
├── app/
│   ├── api/auth/         # NextAuth route handlers
│   ├── api/trpc/         # tRPC HTTP batch endpoint
│   ├── layout.tsx        # Root layout with ThemeProvider and tRPC React provider
│   └── page.tsx          # Server-rendered home page with initial Drive hydration
├── components/
│   ├── canvas/           # Excalidraw integration & DrawingCanvas wrapper
│   ├── editor/           # TipTap core, KaTeX math extension, bubble menu, syntax highlighting
│   ├── landing/          # Monochromatic sovereign landing page for logged-out visitors
│   └── workspace/        # Sidebar, HeaderBar, DiffModal, SyncModal, MobileBottomBar, Outline
├── features/
│   └── engineering-canvas/ # Domain-specific palettes (logic gates, circuit primitives)
├── server/
│   ├── api/routers/      # tRPC router definitions (notes CRUD, assets, folders, metadata)
│   ├── auth/             # NextAuth v5 configuration and token refresh
│   └── googleDrive.ts    # Direct Google Drive API operations
└── trpc/                 # Client and React Query setup
```

---

## 6. Scripts & Development Commands

```bash
# Start local development server with Turbopack
bun run dev

# Run TypeScript typecheck without emitting output
bun run typecheck

# Check code formatting with Prettier
bun run format:check

# Format files with Prettier
bun run format:write

# Run Next.js linter
bun run lint

# Build production bundle
bun run build
```

---

## 7. Multi-Platform Native App (`/app` - Flutter)

Netherite includes a native multi-platform client in `/app` targeting **Linux Desktop (x64)**, **Android**, and **Windows Desktop**, matching the web app's monochromatic design, KaTeX math rendering, Excalidraw whiteboards, and zero-database Google Drive storage.

### Directory Structure
```
app/
├── lib/
│   ├── core/               # Constants, pastel folder colors, monochromatic theme, diff engine
│   ├── data/
│   │   ├── auth/           # Google Sign-In (Mobile) & OAuth loopback (Desktop)
│   │   ├── drive/          # Google Drive API v3 CRUD & metadata persistence
│   │   └── storage/        # SharedPreferences & local disk caching
│   ├── models/             # DriveItem, NoteDocument, WorkspaceMetadata, DiffResult
│   ├── providers/          # Riverpod state management (Auth, Workspace, Notes, Theme)
│   ├── ui/
│   │   ├── canvas/         # Excalidraw canvas vector renderer
│   │   ├── editor/         # KaTeX math view, syntax highlighter, Markdown editor
│   │   ├── explorer/       # Nested file explorer tree, color picker modal
│   │   ├── landing/        # Minimalist landing & OAuth login screen
│   │   ├── mobile/         # Mobile bottom bar & markdown formatting ribbon
│   │   ├── modals/         # SyncModal (Discard & Pull), DiffModal, SettingsModal
│   │   └── workspace/      # HeaderBar, OutlineDrawer, WorkspaceShell
│   └── main.dart           # App entrypoint & ProviderScope setup
├── android/                # Android native project (JDK 21 LTS configured)
├── linux/                  # Linux GTK/C++ desktop runner
├── windows/                # Windows desktop runner
└── pubspec.yaml            # Flutter dependencies (Riverpod, Google APIs, KaTeX, Fonts)
```

### Development & Build Commands
```bash
# Navigate to the Flutter app directory
cd app

# Analyze Dart code for errors/lints
flutter analyze

# Run unit and diff engine tests
flutter test

# Run on connected Linux desktop
flutter run -d linux

# Run on connected Android physical phone or emulator
flutter run -d android

# Build production Linux desktop bundle
flutter build linux --release

# Build production Android APK
flutter build apk --release

# Build Windows desktop executable
flutter build windows --release
```

