import { type DefaultSession, type NextAuthConfig } from "next-auth";
import GoogleProvider from "next-auth/providers/google";

/**
 * NextAuth TypeScript definitions with JWT token properties
 */
declare module "next-auth" {
  interface Session extends DefaultSession {
    accessToken?: string;
    refreshToken?: string;
    user: {
      id: string;
    } & DefaultSession["user"];
  }
}

async function refreshGoogleAccessToken(token: any) {
  try {
    const clientId = process.env.AUTH_GOOGLE_ID || process.env.GOOGLE_CLIENT_ID;
    const clientSecret = process.env.AUTH_GOOGLE_SECRET || process.env.GOOGLE_CLIENT_SECRET;
    const url = "https://oauth2.googleapis.com/token";
    const response = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        client_id: clientId!,
        client_secret: clientSecret!,
        grant_type: "refresh_token",
        refresh_token: token.refreshToken as string,
      }),
    });

    const refreshedTokens = await response.json();

    if (!response.ok) {
      console.error("Failed to refresh Google access token:", refreshedTokens);
      return token;
    }

    return {
      ...token,
      accessToken: refreshedTokens.access_token,
      expiresAt: Math.floor(Date.now() / 1000 + (refreshedTokens.expires_in ?? 3600)),
      refreshToken: refreshedTokens.refresh_token ?? token.refreshToken,
    };
  } catch (error) {
    console.error("Error in refreshGoogleAccessToken:", error);
    return token;
  }
}

export const authConfig = {
  trustHost: true,
  secret: process.env.AUTH_SECRET || process.env.NEXTAUTH_SECRET,
  providers: [
    GoogleProvider({
      clientId: process.env.AUTH_GOOGLE_ID || process.env.GOOGLE_CLIENT_ID,
      clientSecret: process.env.AUTH_GOOGLE_SECRET || process.env.GOOGLE_CLIENT_SECRET,
      authorization: {
        params: {
          scope: "openid email profile https://www.googleapis.com/auth/drive.file",
          prompt: "consent",
          access_type: "offline",
          response_type: "code",
        },
      },
    }),
  ],
  session: {
    strategy: "jwt",
  },
  callbacks: {
    async jwt({ token, account }) {
      if (account) {
        token.accessToken = account.access_token;
        token.refreshToken = account.refresh_token;
        token.expiresAt = account.expires_at ?? Math.floor(Date.now() / 1000 + 3600);
        return token;
      }

      // Return current token if still valid (with 5 min safety buffer)
      if (token.expiresAt && Date.now() < ((token.expiresAt as number) - 300) * 1000) {
        return token;
      }

      // Access token has expired or is nearing expiration, refresh it
      if (token.refreshToken) {
        return await refreshGoogleAccessToken(token);
      }

      return token;
    },
    async session({ session, token }) {
      if (token) {
        session.accessToken = token.accessToken as string;
        session.refreshToken = token.refreshToken as string;
        if (session.user) {
          session.user.id = token.sub ?? "user";
        }
      }
      return session;
    },
  },
} satisfies NextAuthConfig;
