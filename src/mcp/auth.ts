import fs from "fs";
import path from "path";
import os from "os";
import dotenv from "dotenv";

// Load local .env if available
try {
  dotenv.config({ path: path.resolve(process.cwd(), ".env") });
} catch {}

export interface McpAuthCredentials {
  refreshToken?: string;
  accessToken?: string;
  clientId?: string;
  clientSecret?: string;
}

const LOCAL_CREDENTIALS_PATH = path.join(os.homedir(), ".netherite", "credentials.json");

/**
 * Saves refreshed credentials to ~/.netherite/credentials.json for local CLI tooling
 */
export function saveLocalCredentials(credentials: McpAuthCredentials) {
  try {
    const dir = path.dirname(LOCAL_CREDENTIALS_PATH);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    fs.writeFileSync(
      LOCAL_CREDENTIALS_PATH,
      JSON.stringify(
        {
          ...credentials,
          updatedAt: new Date().toISOString(),
        },
        null,
        2
      ),
      "utf-8"
    );
  } catch (err) {
    // Non-fatal if filesystem is restricted
    console.warn("Could not persist local credentials:", err);
  }
}

/**
 * Loads credentials from ~/.netherite/credentials.json
 */
export function loadLocalCredentials(): McpAuthCredentials | null {
  try {
    if (fs.existsSync(LOCAL_CREDENTIALS_PATH)) {
      const raw = fs.readFileSync(LOCAL_CREDENTIALS_PATH, "utf-8");
      return JSON.parse(raw);
    }
  } catch {}
  return null;
}

/**
 * Resolves session object with refresh/access token for Google Drive operations
 */
export function getMcpSession(): { refreshToken?: string; accessToken?: string } {
  // 1. Environment variables
  const envRefreshToken =
    process.env.NETHERITE_REFRESH_TOKEN ||
    process.env.GOOGLE_REFRESH_TOKEN ||
    process.env.AUTH_GOOGLE_REFRESH_TOKEN;

  const envAccessToken =
    process.env.NETHERITE_ACCESS_TOKEN ||
    process.env.GOOGLE_ACCESS_TOKEN;

  if (envRefreshToken) {
    return {
      refreshToken: envRefreshToken,
      accessToken: envAccessToken,
    };
  }

  // 2. Saved local config (~/.netherite/credentials.json)
  const local = loadLocalCredentials();
  if (local?.refreshToken) {
    return {
      refreshToken: local.refreshToken,
      accessToken: local.accessToken,
    };
  }

  // 3. Fallback: if running inside local server where only access token or mock is present
  if (envAccessToken) {
    return {
      accessToken: envAccessToken,
    };
  }

  throw new Error(
    "Netherite MCP Authentication Required:\n" +
      "No Google Drive credentials found. Please provide NETHERITE_REFRESH_TOKEN (or GOOGLE_REFRESH_TOKEN) in your environment,\n" +
      "or log in to Netherite in your browser which automatically syncs to ~/.netherite/credentials.json."
  );
}
