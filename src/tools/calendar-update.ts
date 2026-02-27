import { z } from "zod";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import type { GraphClient } from "../graph/client.js";
import type { AuditLogger } from "../safety/audit.js";

export function registerCalendarUpdate(
  server: McpServer,
  graph: GraphClient,
  audit: AuditLogger,
): void {
  server.tool(
    "calendar_update",
    "Update an existing calendar event",
    {
      eventId: z.string().describe("The event ID to update"),
      subject: z.string().optional().describe("New subject"),
      start: z.string().optional().describe("New start date-time (ISO 8601)"),
      end: z.string().optional().describe("New end date-time (ISO 8601)"),
      timezone: z.string().optional().describe("Timezone for start/end"),
      body: z.string().optional().describe("New body content"),
      bodyType: z.enum(["text", "html"]).optional().describe("Body format"),
      location: z.string().optional().describe("New location"),
    },
    async ({ eventId, subject, start, end, timezone = "Europe/Amsterdam", body, bodyType = "text", location }) => {
      const patch: Record<string, unknown> = {};

      if (subject) patch.subject = subject;
      if (start) patch.start = { dateTime: start, timeZone: timezone };
      if (end) patch.end = { dateTime: end, timeZone: timezone };
      if (body) patch.body = { contentType: bodyType === "html" ? "HTML" : "Text", content: body };
      if (location) patch.location = { displayName: location };

      const updated = await graph.patch<Record<string, unknown>>(
        `/me/events/${encodeURIComponent(eventId)}`,
        patch,
      );

      await audit.log({
        action: "calendar_update",
        tool: "calendar_update",
        success: true,
        subject: (updated.subject as string) || subject,
      });

      return {
        content: [
          {
            type: "text" as const,
            text: JSON.stringify({
              updated: true,
              eventId: updated.id,
              subject: updated.subject,
            }, null, 2),
          },
        ],
      };
    },
  );
}
