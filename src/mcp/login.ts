import http from "http";
import { google } from "googleapis";
import { saveLocalCredentials } from "./auth";
import dotenv from "dotenv";
import path from "path";
import { exec } from "child_process";

dotenv.config({ path: path.resolve(process.cwd(), ".env") });

const clientId =
  process.env.AUTH_GOOGLE_DESKTOP_ID ||
  process.env.AUTH_GOOGLE_ID ||
  process.env.GOOGLE_CLIENT_ID;

const clientSecret =
  process.env.AUTH_GOOGLE_DESKTOP_SECRET ||
  process.env.AUTH_GOOGLE_SECRET ||
  process.env.GOOGLE_CLIENT_SECRET;

if (!clientId || !clientSecret) {
  console.error("Missing AUTH_GOOGLE_ID / AUTH_GOOGLE_SECRET in .env");
  process.exit(1);
}

const PORT = 8085;
const REDIRECT_URI = `http://localhost:${PORT}/oauth2callback`;

const oauth2Client = new google.auth.OAuth2(clientId, clientSecret, REDIRECT_URI);

const authUrl = oauth2Client.generateAuthUrl({
  access_type: "offline",
  scope: [
    "https://www.googleapis.com/auth/drive",
    "https://www.googleapis.com/auth/drive.file",
    "openid",
    "email",
    "profile",
  ],
  prompt: "consent",
});

const server = http.createServer(async (req, res) => {
  try {
    const url = new URL(req.url || "", `http://localhost:${PORT}`);
    if (url.pathname === "/oauth2callback") {
      const code = url.searchParams.get("code");
      if (!code) {
        res.writeHead(400, { "Content-Type": "text/html" });
        res.end("<h3>Missing auth code</h3>");
        return;
      }

      const { tokens } = await oauth2Client.getToken(code);
      if (!tokens.refresh_token && !tokens.access_token) {
        res.writeHead(500, { "Content-Type": "text/html" });
        res.end("<h3>Failed to obtain tokens from Google</h3>");
        return;
      }

      saveLocalCredentials({
        refreshToken: tokens.refresh_token || undefined,
        accessToken: tokens.access_token || undefined,
      });

      res.writeHead(200, { "Content-Type": "text/html" });
      res.end(`
        <div style="font-family: system-ui, sans-serif; text-align: center; padding: 40px; background: #09090b; color: #fafafa; height: 100vh;">
          <h2 style="color: #10b981;">Authentication Successful!</h2>
          <p>Netherite MCP Server is now authenticated with your Google Drive.</p>
          <p style="color: #71717a; font-size: 13px;">You can close this tab and return to Antigravity.</p>
        </div>
      `);

      console.log("\nAuthentication successful! Saved tokens to ~/.netherite/credentials.json\n");

      setTimeout(() => {
        server.close();
        process.exit(0);
      }, 1000);
    }
  } catch (err: any) {
    res.writeHead(500, { "Content-Type": "text/html" });
    res.end(`<h3>OAuth Error: ${err.message}</h3>`);
    console.error("OAuth Error:", err);
  }
});

server.listen(PORT, () => {
  console.log(`\n========================================`);
  console.log(`Netherite MCP Google Drive Authorization`);
  console.log(`========================================\n`);
  console.log(`Please visit the following URL to authorize Netherite MCP:\n`);
  console.log(authUrl);
  console.log(`\nWaiting for authorization on ${REDIRECT_URI}...\n`);

  // Attempt to open browser automatically on Linux / Mac
  const openCmd = process.platform === "darwin" ? "open" : "xdg-open";
  exec(`${openCmd} "${authUrl}"`, () => {});
});
