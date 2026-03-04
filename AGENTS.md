# oss-mcp-outlook — AGENTS.md

<!-- FORMAT RULES — DO NOT REMOVE
This file follows the Omnitrex Harmonised AGENTS.md structure.
AI agents MUST preserve these exact sections when updating this file.
- Keep each section concise (see line targets below)
- Never add new top-level sections — use subsections within existing ones
- When updating Status/Roadmap, move completed items to a "Done" subsection or remove them
- Total file MUST stay under 200 lines
-->

## Identity

OSS MCP server for Microsoft 365 Outlook — email and calendar management via AI assistants. Public, community-maintained.

- **GitHub repo:** `omnitrex-oss/oss-mcp-outlook`
- **Local folder:** `C:\Users\maxim\projects\omnitrex-holding\omnitrex-oss\oss-mcp-ms365-mail\`
- **License:** MIT
- **Maintainer:** `@dieudonne84`

## Architecture

### Stack

TypeScript (ESM), MCP SDK, Zod (validation), Vitest (testing)

### Architecture Pattern

```
config.ts → auth/msal.ts → graph/client.ts → safety/ → tools/ → server.ts → index.ts
```

- Each tool in its own file under `src/tools/` exporting a register function
- Write tools audited via `safety/audit.ts`
- External recipient warnings via `safety/recipient-check.ts`
- Draft-before-send enforced via `safety/draft-guard.ts`
- Token storage: OS keychain (keytar) with file fallback

### Tools (17)

| Group | Count | Tools |
|-------|-------|-------|
| Mail | 10 | list, read, search, draft-create, draft-update, draft-send, reply, forward, attach, attachment-list |
| Calendar | 5 | list, read, create, update, delete |
| Templates | 2 | template-list, template-apply |

### Safety

- Rate limiting on write operations
- JSONL audit logging (never logs email body content)
- Draft-before-send (explicit confirmation required)
- External recipient warnings
- Max recipient limit (configurable)

## Commands

```bash
npm install
npm run build        # tsup (ESM bundle)
npm test             # Vitest (47 tests)
npm run lint         # tsc --noEmit
npm run dev          # Watch mode
```

## Status

**March 2026 — v0.1.0 published**
- 17 tools, 47 tests passing
- Fully rebranded from `oss-mcp-ms365-mail`
- CONTRIBUTING.md, SECURITY.md, LICENSE (MIT, Contributors)
- CI: GitHub Actions, CODEOWNERS, branch protection on `master`
- Git remote: `https://github.com/omnitrex-oss/oss-mcp-outlook.git`

### Done (March 2026)
- [x] Rebrand: package name, MCP server name, README, all docs
- [x] Branding scrub: zero references to internal company names
- [x] SECURITY.md added
- [x] CONTRIBUTING.md rewritten (MIT, correct URLs)
- [x] LICENSE updated (Copyright Contributors)
- [x] package.json metadata (repository, homepage, bugs, keywords)

## Roadmap

### v0.2.0
- [ ] npm publish to public registry
- [ ] Attachment download tool (download attachments to local files)
- [ ] Calendar sharing tools (share calendars, check availability)
- [ ] Fix upload session auth for attachments >3MB (needs extra Azure scope)

### Housekeeping
- [ ] Local folder rename: `oss-mcp-ms365-mail` → `oss-mcp-outlook` (blocked by VS Code file handles, low priority)

## Rules

- All write tools must be audited
- Draft-before-send pattern for all outgoing email
- No permanent delete operations
- Run `npm test && npm run lint` before committing
- Branch protection on `master`: require CI pass
- CODEOWNERS: `@dieudonne84` owns all files
- Never reference internal company names or real email addresses in code/docs
- Keep in sync with sibling repo `oss-mcp-onedrive` (shared patterns)
