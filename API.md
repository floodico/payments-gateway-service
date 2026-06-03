# API examples

Base URL: `http://localhost:3000`

Interactive docs (Swagger UI): http://localhost:3000/api

Demo values used below: `brand-a`, `user@pgservice.com`.

Common error shape:

```json
{
  "statusCode": 400,
  "error": "Bad Request",
  "message": "...",
  "correlationId": "uuid",
  "timestamp": "2026-06-03T12:00:00.000Z",
  "path": "/auth/register"
}
```

---

## Health

```bash
curl -s http://localhost:3000/health
```

---

## Identity

### Register

```bash
curl -s -X POST http://localhost:3000/auth/register \
  -H 'Content-Type: application/json' \
  -d '{
    "brandId": "brand-a",
    "email": "user@pgservice.com",
    "password": "password123"
  }'
```

`201` — user object (no password).

### Login

```bash
curl -s -X POST http://localhost:3000/auth/login \
  -H 'Content-Type: application/json' \
  -d '{
    "brandId": "brand-a",
    "email": "user@pgservice.com",
    "password": "password123"
  }'
```

`200`:

```json
{
  "accessToken": "eyJ...",
  "tokenType": "Bearer",
  "expiresIn": "1h"
}
```

### Profile

```bash
export TOKEN="<accessToken>"

curl -s http://localhost:3000/profile/me \
  -H "Authorization: Bearer $TOKEN"
```

`200` — user for token tenant. JWT `brandId` mismatch → `403`.

---

## Webhooks (PSP / GSP)

Path sets **source** (`psp` or `gsp`). `:provider` is the vendor slug only (e.g. `liqpay`, not `psp/liqpay`).

Required headers:

| Header | Description |
|--------|-------------|
| `X-Brand-Id` | Tenant |
| `Idempotency-Key` | Provider event id (or body `idempotencyKey`) |
| `X-Signature` | Must match `WEBHOOK_SIGNATURE_SECRET` |

### Idempotency scope

Duplicates are detected per **`(brand_id, source, provider, idempotency_key)`**.

- Replay on the **same** path + provider + key → `200`, same `eventId`
- Same key on **psp** and **gsp** → two separate events (`201` each)

### PSP — LiqPay

```bash
curl -s -X POST http://localhost:3000/webhooks/psp/liqpay \
  -H 'Content-Type: application/json' \
  -H 'X-Brand-Id: brand-a' \
  -H 'Idempotency-Key: evt-liqpay-001' \
  -H 'X-Signature: local_webhook_hmac_stub' \
  -d '{
    "eventType": "payment.completed",
    "data": { "amount": 100, "currency": "UAH" }
  }'
```

First call: `201`

```json
{
  "eventId": "uuid",
  "status": "created",
  "duplicate": false
}
```

Same request again: `200`

```json
{
  "eventId": "uuid",
  "status": "duplicate",
  "duplicate": true
}
```

### GSP — WayForPay

```bash
curl -s -X POST http://localhost:3000/webhooks/gsp/wayforpay \
  -H 'Content-Type: application/json' \
  -H 'X-Brand-Id: brand-a' \
  -H 'Idempotency-Key: evt-wayforpay-001' \
  -H 'X-Signature: local_webhook_hmac_stub' \
  -d '{
    "eventType": "payment.completed",
    "data": { "orderReference": "ORD-1" }
  }'
```

---

## Environment

See `.env.example` — `JWT_SECRET`, `WEBHOOK_SIGNATURE_SECRET`, database vars.

## Database

After pulling schema changes:

```bash
npm run migration:run
```

Migration `1748880000000-IdempotencyScopeBySource` adds `source` to `idempotency_keys`.
