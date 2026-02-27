import { readdir, readFile } from "node:fs/promises";
import { join } from "node:path";
import { homedir } from "node:os";

export interface TemplateMetadata {
  name: string;
  subject: string;
  to?: string;
  cc?: string;
  bcc?: string;
}

export interface Template {
  metadata: TemplateMetadata;
  body: string;
  filePath: string;
}

const TEMPLATES_DIR = join(homedir(), ".mcp-outlook", "templates");

/**
 * Parse a YAML front matter + Markdown body template file.
 */
export function parseTemplate(content: string, filePath: string): Template {
  const fmMatch = content.match(/^---\n([\s\S]*?)\n---\n([\s\S]*)$/);
  if (!fmMatch) {
    throw new Error(`Invalid template format (missing YAML front matter): ${filePath}`);
  }

  const yamlStr = fmMatch[1];
  const body = fmMatch[2].trim();

  // Simple YAML parser for flat key-value pairs
  const metadata: Record<string, string> = {};
  for (const line of yamlStr.split("\n")) {
    const colonIdx = line.indexOf(":");
    if (colonIdx === -1) continue;
    const key = line.slice(0, colonIdx).trim();
    let value = line.slice(colonIdx + 1).trim();
    // Strip quotes
    if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
      value = value.slice(1, -1);
    }
    metadata[key] = value;
  }

  if (!metadata.name) {
    throw new Error(`Template missing 'name' field: ${filePath}`);
  }
  if (!metadata.subject) {
    throw new Error(`Template missing 'subject' field: ${filePath}`);
  }

  return {
    metadata: {
      name: metadata.name,
      subject: metadata.subject,
      to: metadata.to,
      cc: metadata.cc,
      bcc: metadata.bcc,
    },
    body,
    filePath,
  };
}

/**
 * List all templates from the templates directory.
 */
export async function listTemplates(): Promise<Template[]> {
  try {
    const files = await readdir(TEMPLATES_DIR);
    const templates: Template[] = [];

    for (const file of files) {
      if (!file.endsWith(".md") && !file.endsWith(".txt")) continue;
      try {
        const content = await readFile(join(TEMPLATES_DIR, file), "utf-8");
        templates.push(parseTemplate(content, join(TEMPLATES_DIR, file)));
      } catch {
        // Skip invalid templates
      }
    }

    return templates;
  } catch {
    // Templates directory doesn't exist yet
    return [];
  }
}

/**
 * Find a template by name.
 */
export async function findTemplate(name: string): Promise<Template | null> {
  const templates = await listTemplates();
  return templates.find((t) => t.metadata.name === name) || null;
}

/**
 * Apply Mustache-style variable substitution to a string.
 * Replaces {{variable}} with the provided value.
 */
export function applyVariables(text: string, variables: Record<string, string>): string {
  return text.replace(/\{\{(\w+)\}\}/g, (match, key) => {
    return variables[key] !== undefined ? variables[key] : match;
  });
}
