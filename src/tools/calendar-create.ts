import { z } from "zod";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import type { GraphClient } from "../graph/client.js";
import type { AuditLogger } from "../safety/audit.js";

export function registerCalendarCreate(
  server: McpServer,
  graph: GraphClient,
  audit: AuditLogger,
): void {
  server.tool(
    "calendar_create",
    "Create a new calendar event with optional attendees and online meeting",
    {
      subject: z.string().describe("Event subject/title"),
      start: z.string().describe("Start date-time (ISO 8601, e.g., '2026-03-15T14:00:00')"),
      end: z.string().describe("End date-time (ISO 8601, e.g., '2026-03-15T15:00:00')"),
      timezone: z.string().optional().describe("Timezone (default: 'Europe/Amsterdam')"),
      body: z.string().optional().describe("Event body/description (HTML or text)"),
      bodyType: z.enum(["text", "html"]).optional().describe("Body format (default: text)"),
      location: z.string().optional().describe("Event location"),
      attendees: z.array(z.string()).optional().describe("Attendee email addresses"),
      isOnlineMeeting: z.boolean().optional().describe("Create as Teams meeting (default: false)"),
    },
    async ({ subject, start, end, timezone = "Europe/Amsterdam", body, bodyType = "text", location, attendees, isOnlineMeeting = false }) => {
      const eventPayload: Record<string, unknown> = {
        subject,
        start: { dateTime: start, timeZone: timezone },
        end: { dateTime: end, timeZone: timezone },
      };

      if (body) {
        eventPayload.body = { contentType: bodyType === "html" ? "HTML" : "Text", content: body };
      }

      if (location) {
        eventPayload.location = { displayName: location };
      }

      if (attendees && attendees.length > 0) {
        eventPayload.attendees = attendees.map((email) => ({
          emailAddress: { address: email },
          type: "required",
        }));
      }

      if (isOnlineMeeting) {
        eventPayload.isOnlineMeeting = true;
        eventPayload.onlineMeetingProvider = "teamsForBusiness";
      }

      const created = await graph.post<Record<string, unknown>>("/me/events", eventPayload);

      await audit.log({
        action: "calendar_create",
        tool: "calendar_create",
        success: true,
        subject,
        recipients: attendees,
      });

      return {
        content: [
          {
            type: "text" as const,
            text: JSON.stringify({
              created: true,
              eventId: created.id,
              subject: created.subject,
              onlineMeetingUrl: created.onlineMeetingUrl || null,
              start: (created.start as Record<string, string>)?.dateTime,
              end: (created.end as Record<string, string>)?.dateTime,
            }, null, 2),
          },
        ],
      };
    },
  );
}
