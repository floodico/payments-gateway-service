# Design decisions

## Tenant isolation (`brandId`)

**Decision:** `brandId` is a string tenant key on domain rows. There is no separate `tenants` table for the MVP.

| Surface | How `brandId` is set |
|---------|----------------------|
| Identity (`/auth/*`, `/profile/me`) | User registers with `brandId`; JWT payload carries `sub` + `brandId`; `TenantGuard` copies context to the request |
| Webhooks (`/webhooks/*`) | Inbound `X-Brand-Id` header (trusted after signature stub) |

**Why:** White-label gateway: many brands, one deployment. A `tenants` table adds little until billing, config, or suspension per brand.

**Trade-off:** Webhook `X-Brand-Id` is not validated against a tenant registry yet.

---

## PSP / GSP

**PSP** — payment-in callbacks (e.g. LiqPay). **GSP** — separate game/partner callback channel.

**Routing:** `POST /webhooks/psp/:provider` and `POST /webhooks/gsp/:provider`. Same handler; `raw_events.source` is `psp` or `gsp`.

**`:provider`** stores the vendor slug only (`liqpay`, `wayforpay`), not `psp/liqpay`. Channel is always `source`.

**Signature:** Stub — `X-Signature` equals `WEBHOOK_SIGNATURE_SECRET` (constant-time compare).

---

## Idempotency scope

**Decision:** Scoped per **`(brand_id, source, provider, idempotency_key)`**.

| Column / field | Example | Role |
|----------------|---------|------|
| `source` | `psp` / `gsp` | Callback channel (from URL) |
| `provider` | `liqpay` | Vendor slug (from path param) |
| `key` | `evt-001` | Provider delivery id (header or body) |

**Why `source` on `idempotency_keys`:** `provider` does not include the channel. Without `source`, the same key on PSP and GSP would incorrectly dedupe.

**Storage:** `idempotency_keys.source` matches `raw_events.source`. Unique constraint: `UQ_idempotency_keys_brand_source_provider_key`.

**Migration:** `1748880000000-IdempotencyScopeBySource` (adds `source`, replaces old unique on `(brand_id, provider, key)`).

**Key source:** Header `idempotency-key` → body `idempotencyKey` → `400`.

**HTTP:** First delivery `201` (`created`); replay `200` (`duplicate`, same `eventId`).

---

## `raw_events` — audit log vs outbox

**Decision:** One table for audit + queue:

| Concern | How |
|---------|-----|
| Audit | `payload` (jsonb), `created_at`, append-only |
| Ledger queue | `status`: `pending` → `processed` / `failed`; future worker polls `pending` |

**Rule:** Callbacks never update balances — only `raw_events` + `idempotency_keys`.

**Not in MVP:** `processed_at`, retries, dead-letter queue.

---

## Idempotency table vs unique on `raw_events`

Separate `idempotency_keys` → fast lookup, race safety (`23505` → duplicate), links to `raw_event_id`.

---

## JWT vs session table

Stateless JWT; `sessions` row on login for audit / future revocation.

---

## Correlation ID

`X-Correlation-Id` in logs, errors, and response headers.

---

## OpenAPI

Swagger UI at `/api`. Demo examples use `user@pgservice.com` via `demo.constants.ts`.

---

## If we had more time

- Per-provider HMAC signatures
- `tenants` table + webhook API keys
- Ledger worker + `processed_at`
- Contract tests for webhook payloads
- Rate limiting on `/webhooks/*`
