import { z } from "zod";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import type { GraphClient } from "../graph/client.js";
import type { AuditLogger } from "../safety/audit.js";

export function registerCalendarList(
  server: McpServer,
  graph: GraphClient,
  _audit: AuditLogger,
): void {
  server.tool(
    "calendar_list",
    "List calendar events with optional date range filter",
    {
      startDateTime: z
        .string()
        .optional()
        .describe("Start of date range (ISO 8601, e.g., '2026-03-01T00:00:00'). Defaults to now."),
      endDateTime: z
        .string()
        .optional()
        .describe("End of date range (ISO 8601). Defaults to 7 days from start."),
      top: z
        .number()
        .min(1)
        .max(50)
        .optional()
        .describe("Number of events to return (default: 25, max: 50)"),
    },
    async ({ startDateTime, endDateTime, top = 25 }) => {
      const start = startDateTime || new Date().toISOString();
      const end = endDateTime || new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();

      const params = new URLSearchParams();
      params.set("startDateTime", start);
      params.set("endDateTime", end);
      params.set("$top", String(top));
      params.set("$orderby", "start/dateTime");
      params.set("$select", "id,subject,start,end,location,organizer,attendees,isOnlineMeeting,onlineMeetingUrl,bodyPreview");

      const path = `/me/calendarView?${params.toString()}`;
      const result = await graph.getPaginated<Record<string, unknown>>(path, 1);

      const events = result.items.map(formatEvent);

      return {
        content: [
          {
            type: "text" as const,
            text: JSON.stringify({ events, count: events.length, hasMore: result.hasMore }, null, 2),
          },
        ],
      };
    },
  );
}

function formatEvent(event: Record<string, unknown>) {
  const start = event.start as Record<string, string> | undefined;
  const end = event.end as Record<string, string> | undefined;
  const organizer = event.organizer as Record<string, Record<string, string>> | undefined;
  const attendees = event.attendees as Array<Record<string, unknown>> | undefined;
  const location = event.location as Record<string, string> | undefined;

  return {
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
    bodyPreview: event.bodyPreview,
  };
}
