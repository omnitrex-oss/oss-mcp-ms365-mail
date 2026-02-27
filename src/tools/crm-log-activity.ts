import { z } from "zod";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import type { AuditLogger } from "../safety/audit.js";

export function registerCrmLogActivity(
  server: McpServer,
  audit: AuditLogger,
): void {
  server.tool(
    "crm_log_activity",
    "Log an activity to the Omnitrex CRM customer timeline. Requires OMNITREX_PLATFORM_URL and OMNITREX_API_KEY environment variables.",
    {
      customerId: z.string().describe("The NodeCustomerInfo ID in the platform"),
      type: z.enum([
        "EMAIL_SENT",
        "EMAIL_RECEIVED",
        "MEETING_SCHEDULED",
        "MEETING_COMPLETED",
        "NOTE_ADDED",
      ]).describe("Activity type"),
      subject: z.string().describe("Activity subject/title"),
      description: z.string().optional().describe("Activity description"),
      metadata: z.record(z.string()).optional().describe("Additional metadata key-value pairs"),
    },
    async ({ customerId, type, subject, description, metadata }) => {
      const platformUrl = process.env.OMNITREX_PLATFORM_URL;
      const apiKey = process.env.OMNITREX_API_KEY;

      if (!platformUrl || !apiKey) {
        return {
          content: [
            {
              type: "text" as const,
              text: JSON.stringify({
                error: "OMNITREX_PLATFORM_URL and OMNITREX_API_KEY environment variables are required.",
              }),
            },
          ],
        };
      }

      try {
        const url = `${platformUrl}/api/customers/${customerId}/activities`;
        const response = await fetch(url, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${apiKey}`,
          },
          body: JSON.stringify({ type, subject, description, metadata }),
        });

        if (!response.ok) {
          const errorText = await response.text();
          return {
            content: [
              {
                type: "text" as const,
                text: JSON.stringify({
                  error: `Platform API returned ${response.status}: ${errorText}`,
                }),
              },
            ],
          };
        }

        const result = await response.json();

        await audit.log({
          action: "crm_log_activity",
          tool: "crm_log_activity",
          success: true,
          subject,
        });

        return {
          content: [
            {
              type: "text" as const,
              text: JSON.stringify(
                {
                  logged: true,
                  customerId,
                  activityType: type,
                  subject,
                  activityId: result.data?.id,
                },
                null,
                2,
              ),
            },
          ],
        };
      } catch (err) {
        const message = err instanceof Error ? err.message : "Unknown error";
        return {
          content: [
            {
              type: "text" as const,
              text: JSON.stringify({ error: `Failed to log activity: ${message}` }),
            },
          ],
        };
      }
    },
  );
}
