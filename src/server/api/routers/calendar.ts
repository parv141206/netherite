import { z } from "zod";
import { createTRPCRouter, protectedProcedure } from "~/server/api/trpc";
import { getCalendarClient, type CalendarEventItem } from "~/server/googleCalendar";
import { createNote } from "~/server/googleDrive";

export const calendarRouter = createTRPCRouter({
  // 1. List Calendar Events
  listEvents: protectedProcedure
    .input(
      z
        .object({
          timeMin: z.string().optional(),
          timeMax: z.string().optional(),
          maxResults: z.number().min(1).max(250).default(100),
        })
        .optional()
    )
    .query(async ({ ctx, input }) => {
      try {
        const calendar = await getCalendarClient(ctx.session);

        const now = new Date();
        const defaultMin = new Date(now.getFullYear(), now.getMonth() - 1, 1).toISOString();
        const defaultMax = new Date(now.getFullYear(), now.getMonth() + 3, 1).toISOString();

        const res = await calendar.events.list({
          calendarId: "primary",
          timeMin: input?.timeMin || defaultMin,
          timeMax: input?.timeMax || defaultMax,
          maxResults: input?.maxResults || 100,
          singleEvents: true,
          orderBy: "startTime",
        });

        const rawEvents = res.data.items || [];
        const events: CalendarEventItem[] = rawEvents.map((item) => {
          const isAllDay = !item.start?.dateTime;
          const start = item.start?.dateTime || item.start?.date || new Date().toISOString();
          const end = item.end?.dateTime || item.end?.date || start;

          // Look for Google Meet or conferencing link
          const meetLink =
            item.conferenceData?.entryPoints?.find((ep) => ep.entryPointType === "video")?.uri ||
            item.hangoutLink ||
            undefined;

          return {
            id: item.id || `event-${Date.now()}-${Math.random()}`,
            summary: item.summary || "(No Title)",
            description: item.description || undefined,
            location: item.location || undefined,
            start,
            end,
            isAllDay,
            htmlLink: item.htmlLink || undefined,
            attendees: item.attendees?.map((a) => ({
              email: a.email || undefined,
              displayName: a.displayName || undefined,
              responseStatus: a.responseStatus || undefined,
            })),
            meetLink,
            colorId: item.colorId || undefined,
          };
        });

        return {
          events,
          timeZone: res.data.timeZone || "UTC",
          calendarSummary: res.data.summary || "Primary Calendar",
        };
      } catch (err: any) {
        console.error("Google Calendar listEvents error:", err);
        // Handle common OAuth scope not granted yet error gracefully
        const isScopeError =
          err?.message?.includes("insufficientPermissions") ||
          err?.message?.includes("ACCESS_TOKEN_SCOPE_INSUFFICIENT") ||
          err?.code === 403;

        return {
          events: [],
          timeZone: "UTC",
          calendarSummary: "Primary Calendar",
          error: isScopeError
            ? "Calendar permission required. Please sign in again with Calendar access enabled."
            : err?.message || "Failed to load Google Calendar events",
          needsReauth: isScopeError,
        };
      }
    }),

  // 2. Create New Calendar Event
  createEvent: protectedProcedure
    .input(
      z.object({
        summary: z.string().min(1),
        description: z.string().optional(),
        location: z.string().optional(),
        start: z.string(), // ISO string or YYYY-MM-DD
        end: z.string(),   // ISO string or YYYY-MM-DD
        isAllDay: z.boolean().default(false),
        attendees: z.array(z.string().email()).optional(),
        colorId: z.string().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const calendar = await getCalendarClient(ctx.session);

      const requestBody: any = {
        summary: input.summary,
        description: input.description,
        location: input.location,
        colorId: input.colorId,
      };

      if (input.isAllDay) {
        requestBody.start = { date: input.start.split("T")[0] };
        requestBody.end = { date: input.end.split("T")[0] };
      } else {
        requestBody.start = { dateTime: input.start };
        requestBody.end = { dateTime: input.end };
      }

      if (input.attendees && input.attendees.length > 0) {
        requestBody.attendees = input.attendees.map((email) => ({ email }));
      }

      const res = await calendar.events.insert({
        calendarId: "primary",
        requestBody,
      });

      return {
        id: res.data.id,
        htmlLink: res.data.htmlLink,
        summary: res.data.summary,
      };
    }),

  // 3. Delete Calendar Event
  deleteEvent: protectedProcedure
    .input(z.object({ eventId: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const calendar = await getCalendarClient(ctx.session);
      await calendar.events.delete({
        calendarId: "primary",
        eventId: input.eventId,
      });
      return { success: true, eventId: input.eventId };
    }),

  // 4. Create Linked Meeting Notes in Google Drive
  createMeetingNote: protectedProcedure
    .input(
      z.object({
        eventId: z.string(),
        summary: z.string(),
        start: z.string(),
        end: z.string().optional(),
        location: z.string().optional(),
        meetLink: z.string().optional(),
        description: z.string().optional(),
        attendees: z.array(z.string()).optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const dateFormatted = new Date(input.start).toLocaleDateString(undefined, {
        weekday: "short",
        year: "numeric",
        month: "short",
        day: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      });

      const attendeesSection =
        input.attendees && input.attendees.length > 0
          ? input.attendees.map((a) => `- [ ] ${a}`).join("\n")
          : "- *No attendees listed*";

      const noteTitle = `Meeting - ${input.summary.replace(/[/\\?%*:|"<>]/g, "-")}.md`;

      const noteMarkdown = `# 📅 Meeting Notes: ${input.summary}

> **Date & Time**: ${dateFormatted}  
> **Location / Meet**: ${input.meetLink ? `[Join Google Meet](${input.meetLink})` : input.location || "Online"}  
> **Calendar Event ID**: \`${input.eventId}\`

---

## 👥 Attendees
${attendeesSection}

## 🎯 Objectives & Agenda
- [ ] Topic 1: Key updates and progress
- [ ] Topic 2: Blockers and architecture review
- [ ] Topic 3: Next sprint priorities

## 📝 Discussion & Key Insights
${input.description ? `> *Event Description*: ${input.description}\n\n` : ""}
- Key insight 1:
- Key insight 2:

## ✅ Action Items & Tasks
- [ ] Action 1: Assigned to team
- [ ] Action 2: Review diagrams in Netherite

---
*Created with Netherite Sovereign Calendar Studio*
`;

      const createdFile = await createNote(ctx.session, noteTitle, noteMarkdown);
      return createdFile;
    }),
});
