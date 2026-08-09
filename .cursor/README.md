# Cursor setup for Kiosk

## Included in the repo

| File | Purpose |
|------|---------|
| `mcp.json` | Project MCPs: Context7 (docs), Playwright (browser E2E) |
| `rules/*.mdc` | Agent rules for architecture, frontend, backend, tools |
| `../AGENTS.md` | Short agent onboarding |

## After pull / clone

1. Open the `kiosk` folder as the Cursor workspace root.
2. Cursor Settings → **MCP** → ensure `context7` and `playwright` show as connected (first run may download via `npx`).
3. Optional marketplace / user MCPs (not stored in this repo):
   - Figma: chat `/add-plugin figma` or Framelink in user `~/.cursor/mcp.json`
   - Postman: enable + authenticate
   - Browser / GitLens: usually already available

## Do not put secrets here

API keys belong in user-level MCP config or env vars — never in committed `mcp.json`.
