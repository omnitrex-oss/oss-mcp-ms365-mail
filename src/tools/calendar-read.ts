import { z } from "zod";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import type { GraphClient } from "../graph/client.js";
import type { AuditLogger } from "../safety/audit.js";

export function registerCalendarRead(
  server: McpServer,
  graph: GraphClient,
  _audit: AuditLogger,
): void {
  server.tool(
    "calendar_read",
    "Read full details of a calendar event",
    {
      eventId: z.string().describe("The event ID to read"),
    },
    async ({ eventId }) => {
      const event = await graph.get<Record<string, unknown>>(
        `/me/events/${encodeURIComponent(eventId)}`,
      );

      const start = event.start as Record<string, string> | undefined;
      const end = event.end as Record<string, string> | undefined;
      const organizer = event.organizer as Record<string, Record<string, string>> | undefined;
      const attendees = event.attendees as Array<Record<string, unknown>> | undefined;
      const location = event.location as Record<string, string> | undefined;
      const body = event.body as Record<string, string> | undefined;

      const formatted = {
        id: event.id,
        subject: event.subject,
        start: start?.dateTime,
        end: end?.dateTime,
        timezone: start?.timeZone,
        location: location?.displayName,
        organizer: organizer?.emailAddress?.address,
        attendees: attendees?.map((a) => {
          const email = a.emailAddress as Record<string, string>;
          return { email: email?.address, name: email?.name, status: (a.status as Record<string, string>)?.response };
        }),
        isOnlineMeeting: event.isOnlineMeeting,
        onlineMeetingUrl: event.onlineMeetingUrl,
        body: body?.content,
        bodyType: body?.contentType,
        importance: event.importance,
        isAllDay: event.isAllDay,
        isCancelled: event.isCancelled,
        recurrence: event.recurrence,
      };

      return {
        content: [
          {
            type: "text" as const,
            text: JSON.stringify(formatted, null, 2),
          },
        ],
      };
    },
  );
}
