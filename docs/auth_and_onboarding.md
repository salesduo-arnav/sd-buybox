# Auth & Integration Onboarding

sd-buybox has **no standalone auth or user store**. Identity, orgs, users, and integration accounts all live in `sd-core-platform`. Buybox is a thin consumer that validates sessions upstream and reads org-scoped data on demand.

## Auth Flow

User authentication is delegated to core-platform via cookie-based sessions.

1. User logs in on core-platform; browser receives a `session_id` cookie (name configurable via `SESSION_COOKIE_NAME`).
2. Request hits buybox → [auth.middleware.ts](backend/src/middlewares/auth.middleware.ts) reads the cookie and calls core-platform's `/auth/me`.
3. Response (user + memberships) is cached in an LRU (`SESSION_CACHE_TTL_MS`, default 60s) to avoid hammering core-platform.
4. [resolveOrganization()](backend/src/middlewares/auth.middleware.ts#L119) picks the active org from the `x-organization-id` header and checks membership.

No JWTs, no local password store, no refresh tokens — just session cookie pass-through.

## Org Management

Orgs exist **only in core-platform**. Buybox tables carry an `organization_id` column but no `organizations` table. Org metadata (name, slug, role) is pulled from `CorePlatformUser.memberships` on each session validation. No sync job, no webhook listener.

## User Management (JIT)

Users are never persisted in buybox. Every request re-derives identity from the cached `/auth/me` result. Audit logs store `actor_id` only. Adding a user to an org in core-platform makes them immediately usable in buybox on their next request — no provisioning step.

## Integration Onboarding

There is **no onboarding endpoint in buybox**. The flow is:

1. Org admin connects an integration (Amazon SP-API, etc.) in the core-platform UI.
2. Core-platform stores the credentials and exposes them on `/internal/integrations/accounts?org_id=...`.
3. Buybox's [integrations.controller.ts](backend/src/controllers/integrations.controller.ts#L16) fetches them on demand via the internal API.

Onboarding is therefore **idempotent and implicit** — a new org is "onboarded" the moment it has a connected account upstream.

## Core-Platform Interaction

Service-to-service calls go through [corePlatform.client.ts](backend/src/services/corePlatform.client.ts), which injects `X-Service-Key` (from `INTERNAL_API_KEY`) and `X-Service-Name: buybox` on every `/internal/*` route.

| Direction | Endpoint | Auth | Purpose |
|---|---|---|---|
| buybox → core | `GET /auth/me` | user cookie | validate session, fetch memberships |
| buybox → core | `POST /auth/logout` | user cookie | invalidate session |
| buybox → core | `GET /internal/integrations/accounts` | service key | list connected accounts for org |
| buybox → core | `POST /internal/audit-logs` | service key | fire-and-forget audit trail |
| buybox → core | `POST /internal/email/send`, `/internal/slack/send-to-channel` | service key | notifications |

Core-platform never calls buybox. All coupling is one-way.

## Edge Cases (business-critical)

- **Org deleted or user removed from org in core-platform** — `/auth/me` still succeeds, but the membership is gone, so [resolveOrganization](backend/src/middlewares/auth.middleware.ts#L119) returns **403**. The user is effectively locked out of that org's buybox data within one cache TTL (≤60s). Historical rows remain in the DB keyed by `organization_id` but become unreachable via API — intentional, so re-adding the user restores access without data loss.

- **Core-platform unreachable during auth** — middleware returns **503 `AUTH_UPSTREAM_UNAVAILABLE`** rather than failing open. Cached sessions within TTL continue to work; expired ones cannot re-validate and are rejected. This is deliberate: buybox will not serve org data it cannot verify membership for.

- **Core-platform unreachable during logout** — logout succeeds locally, cookie is cleared, a warning is logged. We prioritise the user's intent to log out over upstream confirmation.

- **Token/session expiry mid-session** — the LRU cache entry is evicted on a 401 from `/auth/me`, the cookie is cleared in the response, and the user sees a clean 401. No stale cached identity is ever reused after an upstream rejection.

- **Duplicate onboarding attempts** — not possible. Buybox has no onboarding write path; account linking is owned by core-platform and is idempotent there.

- **Integration account revoked upstream mid-operation** — in-flight jobs reading the account will 401/404 from core-platform and fail into the standard job retry path (`JOB_QUEUE_RETRY_LIMIT`, default 3). No partial writes: jobs are transactional at the scan level.
