# Netherite Developer Documentation

## Setting up Google Cloud Platform (GCP) Credentials

Netherite requires Google Drive API access to store and retrieve user notes and images. You must set up a Google Cloud Project to obtain the necessary OAuth 2.0 credentials (`Client ID` and `Client Secret`).

### Step-by-step Guide

1. **Create a New Project:**
   - Go to the [Google Cloud Console](https://console.cloud.google.com/).
   - Click the project dropdown at the top and select **New Project**.
   - Name it "Netherite" (or whatever you prefer) and click **Create**.

2. **Enable APIs:**
   - In the left sidebar, go to **APIs & Services > Library**.
   - Search for **Google Drive API** and click **Enable**.

3. **Configure OAuth Consent Screen:**
   - In the left sidebar, go to **APIs & Services > OAuth consent screen**.
   - Choose **External** (unless you have a Google Workspace org and want to restrict it). Click **Create**.
   - **App Information:** Enter "Netherite" as the App name and your email for support.
   - **App Domain:** You can leave this blank for local development. Add your Vercel domain later.
   - **Developer contact info:** Enter your email.
   - Click **Save and Continue**.
   - **Scopes:** Click **Add or Remove Scopes**.
     - Manually add `https://www.googleapis.com/auth/drive.file`.
     - Click **Update** and then **Save and Continue**.
   - **Test Users:** Add your own Google email address here so you can log in during development. Click **Save and Continue**.

4. **Create Credentials:**
   - Go to **APIs & Services > Credentials**.
   - Click **Create Credentials** at the top and select **OAuth client ID**.
   - **Application type:** Web application.
   - **Name:** "Netherite Next.js App"
   - **Authorized JavaScript origins:** 
     - Add `http://localhost:3000` (for local development).
   - **Authorized redirect URIs:**
     - Add `http://localhost:3000/api/auth/callback/google`.
   - Click **Create**.

5. **Update `.env`:**
   - Copy the **Client ID** and **Client Secret**.
   - In your `.env` file, set:
     ```env
     GOOGLE_CLIENT_ID="your-client-id"
     GOOGLE_CLIENT_SECRET="your-client-secret"
     NEXTAUTH_URL="http://localhost:3000"
     NEXTAUTH_SECRET="your-generated-secret-here"
     ```
   - (You can generate a `NEXTAUTH_SECRET` by running `openssl rand -base64 32` in your terminal).

Once deployed to Vercel, you will need to add the Vercel domains to the **Authorized origins** and **Authorized redirect URIs** in the GCP console, and update the `.env` variables in the Vercel dashboard.
