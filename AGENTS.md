# AGENTS.md — Kiosk

Guide for Cursor Agent working in this monorepo.

## What this project is

Persian RTL self-service **kiosk**: customers order products; admins manage catalog, orders, reports, users. Backend is Django REST; frontend is Next.js.

## Quick map

| Area | Path |
|------|------|
| Backend | `kiosk_backend/` |
| Frontend | `kiosk_frontend/` |
| API client modules | `kiosk_frontend/lib/api/` |
| UI components | `kiosk_frontend/components/{admin,customer,shared}/` |
| Docker | `docker-compose.yml`, `docker-compose.production.yml` |
| Customer API docs (OpenAPI YAML) | `kiosk_frontend/Kiosk Backend API.yaml` |

## Local run (typical)

```bash
# Full stack via Docker
docker-compose up -d

# Or frontend only (API must be reachable)
cd kiosk_frontend && npm run dev

# Backend (from kiosk_backend, with venv)
python manage.py runserver
```

Defaults often used in code: API `http://127.0.0.1:8000/api` or browser `/api` behind nginx.

## Design system (do not reinvent)

- Font: Vazir (`--font-vazir`)
- Direction: RTL (`lang="fa" dir="rtl"`)
- Brand: primary `#E17100`, background `#FFF3E8` via shadcn CSS variables in `kiosk_frontend/app/globals.css`
- New UI: `@/components/ui/*` (shadcn new-york). Add more with `npx shadcn@latest add <component>`
- Legacy: `components/shared` still used in places — migrate gradually

## Cursor Agent setup in this repo

Project files:

- `.cursor/mcp.json` — Context7 + Playwright for the agent
- `.cursor/rules/*.mdc` — project / frontend / backend / tool rules
- This `AGENTS.md`

### Enable once in Cursor

1. **Reload MCP**: Cursor Settings → MCP → refresh / restart so project `mcp.json` loads.
2. **Postman** (optional): Settings → MCP → authenticate Postman plugin.
3. **Figma** (optional): prefer `/add-plugin figma` or keep Framelink in user MCP — do **not** commit API keys into the repo.
4. Keep Browser + GitLens enabled if already available.

### Security

- Never commit `.env` or personal access tokens.
- Prefer env vars for any token-based MCP; rotate keys if they were ever pasted into config files checked into git or shared chats.
