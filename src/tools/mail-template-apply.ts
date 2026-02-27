import { z } from "zod";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import type { GraphClient } from "../graph/client.js";
import type { AuditLogger } from "../safety/audit.js";
import { findTemplate, applyVariables } from "../utils/template.js";

export function registerMailTemplateApply(
  server: McpServer,
  graph: GraphClient,
  audit: AuditLogger,
): void {
  server.tool(
    "mail_template_apply",
    "Apply an email template with variables and create a draft. Use mail_template_list to see available templates.",
    {
      templateName: z.string().describe("Name of the template to apply (from mail_template_list)"),
      variables: z.record(z.string()).describe("Key-value pairs to fill template variables (e.g., {name: 'John', company: 'Acme'})"),
      toOverride: z.string().optional().describe("Override the 'to' address from the template"),
    },
    async ({ templateName, variables, toOverride }) => {
      const template = await findTemplate(templateName);
      if (!template) {
        return {
          content: [
            {
              type: "text" as const,
              text: JSON.stringify({
                error: `Template '${templateName}' not found. Use mail_template_list to see available templates.`,
              }),
            },
          ],
        };
      }

      // Apply variable substitution
      const subject = applyVariables(template.metadata.subject, variables);
      const body = applyVariables(template.body, variables);
      const to = toOverride || (template.metadata.to ? applyVariables(template.metadata.to, variables) : null);
      const cc = template.metadata.cc ? applyVariables(template.metadata.cc, variables) : null;

      if (!to) {
        return {
          content: [
            {
              type: "text" as const,
              text: JSON.stringify({
                error: "No recipient specified. Provide 'toOverride' or define 'to' in the template.",
              }),
            },
          ],
        };
      }

      // Create the draft via Graph API
      const draftPayload: Record<string, unknown> = {
        subject,
        body: { contentType: "Text", content: body },
        toRecipients: [{ emailAddress: { address: to } }],
      };

      if (cc) {
        draftPayload.ccRecipients = [{ emailAddress: { address: cc } }];
      }

      const draft = await graph.post<Record<string, unknown>>("/me/messages", draftPayload);

      await audit.log({
        action: "template_apply",
        tool: "mail_template_apply",
        success: true,
        subject,
        recipients: [to, ...(cc ? [cc] : [])],
        draftId: draft.id as string,
      });

      return {
        content: [
          {
            type: "text" as const,
            text: JSON.stringify(
              {
                draftCreated: true,
                draftId: draft.id,
                templateUsed: templateName,
                subject,
                to,
                cc: cc || undefined,
                bodyPreview: body.slice(0, 200),
                nextStep: "Use mail_draft_send to review and send this draft.",
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
