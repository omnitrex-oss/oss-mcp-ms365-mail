import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { listTemplates } from "../utils/template.js";

export function registerMailTemplateList(
  server: McpServer,
): void {
  server.tool(
    "mail_template_list",
    "List available email templates from ~/.mcp-outlook/templates/",
    {},
    async () => {
      const templates = await listTemplates();

      const formatted = templates.map((t) => ({
        name: t.metadata.name,
        subject: t.metadata.subject,
        to: t.metadata.to || null,
        cc: t.metadata.cc || null,
        bodyPreview: t.body.slice(0, 200) + (t.body.length > 200 ? "..." : ""),
        filePath: t.filePath,
      }));

      return {
        content: [
          {
            type: "text" as const,
            text: JSON.stringify(
              {
                templates: formatted,
                count: formatted.length,
                templatesDir: "~/.mcp-outlook/templates/",
              },
              null,
              2,
            ),
          },
        ],
      };
    },
  );
}
