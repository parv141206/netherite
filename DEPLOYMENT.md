# Deploying Netherite to Vercel

Follow this step-by-step guide to deploy your instance of Netherite to [Vercel](https://vercel.com/) with Google OAuth 2.0 authentication and Google Drive integration.

---

## 1. Google Cloud Console Setup

Netherite uses Google OAuth to authenticate users and read/write `.md` notes and image assets directly to the user's Google Drive.

1. Go to the [Google Cloud Console](https://console.cloud.google.com/).
2. Create a new project (e.g., `Netherite-Studio`) or select an existing one.
3. Enable the **Google Drive API**:
   - Navigate to **APIs & Services** > **Library**.
   - Search for **Google Drive API** and click **Enable**.
4. Configure the **OAuth Consent Screen**:
   - Navigate to **APIs & Services** > **OAuth consent screen**.
   - Select **External** and click **Create**.
   - Fill in the required app information (App name: `Netherite`, support email).
   - In **Scopes**, add:
     - `.../auth/drive.file` (Per-file access created or opened by the app)
     - `openid`
     - `.../auth/userinfo.email`
     - `.../auth/userinfo.profile`
   - In **Test users**, add your own Google email address while in Testing mode.
5. Create OAuth Credentials:
   - Navigate to **APIs & Services** > **Credentials**.
   - Click **+ Create Credentials** > **OAuth client ID**.
   - Application type: **Web application**.
   - Name: `Netherite Web Client`.
   - **Authorized JavaScript origins**:
     - `http://localhost:3000`
     - `https://<your-project-name>.vercel.app` (Add after creating your Vercel project)
   - **Authorized redirect URIs**:
     - `http://localhost:3000/api/auth/callback/google`
     - `https://<your-project-name>.vercel.app/api/auth/callback/google`
   - Click **Create** and copy your **Client ID** and **Client Secret**.

---

## 2. Deploy to Vercel

### Option A: Via GitHub (Recommended)

1. Push your repository to GitHub:
   ```bash
   git remote add origin https://github.com/<your-username>/netherite.git
   git branch -M main
   git push -u origin main
   ```
2. Go to [vercel.com/new](https://vercel.com/new) and import your repository.
3. In **Environment Variables**, add the following:

| Variable | Value | Notes |
| :--- | :--- | :--- |
| `AUTH_SECRET` | `<32-byte-base64-secret>` | Generate with `openssl rand -base64 32` |
| `AUTH_TRUST_HOST` | `true` | Required for NextAuth on Vercel |
| `AUTH_GOOGLE_ID` | `your-client-id.apps.googleusercontent.com` | From Google Cloud Console |
| `AUTH_GOOGLE_SECRET` | `your-client-secret` | From Google Cloud Console |

> [!NOTE]
> **Zero Database Required**: Netherite uses encrypted JWT sessions and stores all notes, folders, and assets directly in your Google Drive (`/netherite`). No database, connection string, or serverless storage setup is needed!

4. Click **Deploy**.
5. Once deployment completes, copy your Vercel URL (e.g. `https://netherite-studio.vercel.app`) and update the **Authorized JavaScript origins** and **Authorized redirect URIs** in your Google Cloud Console.

---

### Option B: Via Vercel CLI

```bash
# Install Vercel CLI
bun add -g vercel

# Deploy
vercel
```

---

## 3. Verification

1. Open your production Vercel URL.
2. Click **Sign In with Google**.
3. Grant permissions for Google Drive file access.
4. Your personal `/netherite` workspace will initialize automatically in Google Drive!
