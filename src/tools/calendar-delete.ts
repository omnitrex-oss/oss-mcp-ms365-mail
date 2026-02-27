import { z } from "zod";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import type { GraphClient } from "../graph/client.js";
import type { AuditLogger } from "../safety/audit.js";

export function registerCalendarDelete(
  server: McpServer,
  graph: GraphClient,
  audit: AuditLogger,
): void {
  server.tool(
    "calendar_delete",
    "Delete/cancel a calendar event",
    {
      eventId: z.string().describe("The event ID to delete"),
    },
    async ({ eventId }) => {
      await graph.delete(`/me/events/${encodeURIComponent(eventId)}`);

      await audit.log({
        action: "calendar_delete",
        tool: "calendar_delete",
        success: true,
      });

      return {
        content: [
          {
            type: "text" as const,
            text: JSON.stringify({ deleted: true, eventId }, null, 2),
          },
        ],
      };
    },
  );
}
