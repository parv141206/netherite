import { google } from "googleapis";

export interface CalendarEventItem {
  id: string;
  summary: string;
  description?: string;
  location?: string;
  start: string;
  end: string;
  isAllDay: boolean;
  htmlLink?: string;
  attendees?: Array<{ email?: string; displayName?: string; responseStatus?: string }>;
  meetLink?: string;
  colorId?: string;
}

export async function getCalendarClient(session: any) {
  const accessToken = session?.accessToken;
  const refreshToken = session?.refreshToken;

  if (!accessToken && !refreshToken) {
    throw new Error("No Google account linked or missing access token in session");
  }

  const oauth2Client = new google.auth.OAuth2(
    process.env.AUTH_GOOGLE_ID || process.env.GOOGLE_CLIENT_ID,
    process.env.AUTH_GOOGLE_SECRET || process.env.GOOGLE_CLIENT_SECRET
  );

  oauth2Client.setCredentials({
    access_token: accessToken,
    refresh_token: refreshToken,
  });

  // Proactively ensure access token is fresh before invoking Calendar API
  if (refreshToken) {
    try {
      const tokenRes = await oauth2Client.getAccessToken();
      if (tokenRes.token && tokenRes.token !== accessToken) {
        oauth2Client.setCredentials({
          access_token: tokenRes.token,
          refresh_token: refreshToken,
        });
        if (session) {
          session.accessToken = tokenRes.token;
        }
      }
    } catch (refreshErr) {
      console.warn("Proactive Calendar OAuth token refresh:", refreshErr);
    }
  }

  return google.calendar({ version: "v3", auth: oauth2Client });
}
