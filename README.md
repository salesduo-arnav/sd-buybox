# sd-buybox

Buy Box visibility tracker — a micro tool that delegates all auth to
[sd-core-platform](../sd-core-platform). Buybox never owns users, sessions,
or passwords; it reads the `session_id` cookie set by core-platform and
proxies `/auth/me` on every request.

## Running locally

Two supported dev flows:

### Flow A — docker (canonical full stack)

Everything in containers. Browser talks to `buybox.lvh.me` via the
core-platform gateway. The `session_id` cookie is shared across `*.lvh.me`
subdomains because core-platform sets `COOKIE_DOMAIN=.lvh.me`.

```bash
# 1. Bring up core-platform first — it owns the shared `salesduo-net` network.
cd ../sd-core-platform && make dev

# 2. Bring up buybox (attaches to salesduo-net; the core-platform gateway
#    can now resolve buybox-backend and buybox-frontend by name).
cd ../sd-buybox && docker compose up --build -d
```

Then open <http://buybox.lvh.me>. `*.lvh.me` resolves to 127.0.0.1 by default,
so you don't need to edit `/etc/hosts`. The core-platform gateway
([sd-core-platform/gateway/nginx.conf](../sd-core-platform/gateway/nginx.conf))
has a `server_name buybox.lvh.me` block that proxies `/api/*` to buybox
backend and everything else to buybox frontend.

### Flow B — non-docker (raw `npm run dev`)

Both stacks run on localhost with different ports. The `session_id` cookie
becomes a host-only cookie on `localhost` (shared across ports because
cookies key on host, not port).

```bash
# 1. Start core-platform's db/redis.
cd ../sd-core-platform && make dev-db

# 2. Start core-platform backend + frontend (in separate terminals).
#    IMPORTANT: your core-platform .env must leave COOKIE_DOMAIN UNSET or 'localhost'.
cd ../sd-core-platform/backend && npm run dev
cd ../sd-core-platform/frontend && npm run dev

# 3. Start buybox backend + frontend.
cd ../sd-buybox/backend && npm run dev    # :5003
cd ../sd-buybox/frontend && npm run dev   # :5004
```

Then open <http://localhost:5004>. Confirm in devtools that after logging in
on `localhost:5173`, the `session_id` cookie has no `Domain` attribute (it's
host-only on `localhost`) and is sent on requests to `localhost:5003`.

## Environment

See [.env.example](./.env.example) — it documents both flows. The critical
vars for auth integration:

| Var | Flow A (docker) | Flow B (non-docker) |
| --- | --- | --- |
| `CORE_PLATFORM_URL` | `http://app.lvh.me` | `http://localhost:5173` |
| `CORE_PLATFORM_INTERNAL_URL` | `http://core-backend:3000` | `http://localhost:3000` |
| `CORS_ORIGINS` | `http://buybox.lvh.me` | `http://localhost:5004` |
| `VITE_API_BASE_URL` | `http://buybox.lvh.me` | `http://localhost:5003` |
| `VITE_CORE_PLATFORM_URL` | `http://app.lvh.me` | `http://localhost:5173` |
| `INTERNAL_API_KEY` | must match core-platform's | must match core-platform's |

`docker-compose.yml` pre-sets the Flow A overrides, so for Flow A you
generally don't need to edit `.env` at all beyond filling in `INTERNAL_API_KEY`.

## Architecture notes

- **No local users.** `req.auth.user` is populated by the `authenticate`
  middleware ([backend/src/middlewares/auth.middleware.ts](./backend/src/middlewares/auth.middleware.ts))
  which calls core-platform's `/auth/me`. A small in-memory cache
  (`SESSION_CACHE_TTL_MS`, default 60s) keeps this off the hot path.
- **Org scoping is verified.** The `resolveOrganization` middleware checks
  that the `x-organization-id` header matches a real membership on the user,
  returning 403 if not — no silent fallback to "first membership".
- **All cross-service HTTP is centralized** in [backend/src/services/corePlatform.client.ts](./backend/src/services/corePlatform.client.ts).
  Nothing else in the backend should import `axios` for core-platform URLs.
- **Frontend login redirect** is centralized in [frontend/src/lib/authRedirect.ts](./frontend/src/lib/authRedirect.ts).
- **Integration accounts** are proxied from core-platform via
  `GET /api/integrations/accounts` — buybox does not own the integrations table.
