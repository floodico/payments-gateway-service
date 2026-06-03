# payments-gateway-service

Requires **Node.js 24**.

## Run with Docker

```bash
docker compose up --build
```

- API: http://localhost:3000
- Health: http://localhost:3000/health
- OpenAPI UI: http://localhost:3000/api

Stop:

```bash
docker compose down
```

## Run locally

```bash
cp .env.example .env
docker compose up postgres -d
npm install
npm run migration:run
npm run start:dev
```

## Tests

```bash
npm test
docker compose up postgres -d
npm run test:e2e
```

E2E: health, webhook idempotency (`psp/liqpay`, including psp vs gsp scope), tenant isolation.

Docs: [API.md](./API.md), [DECISIONS.md](./DECISIONS.md). OpenAPI: `/api`.

After schema updates: `npm run migration:run` (includes `idempotency_keys.source`).

## Useful commands

| Command | Description |
|---------|-------------|
| `npm run start:dev` | Dev server (watch) |
| `npm run build` | Build |
| `npm run migration:run` | Apply DB migrations |
| `docker compose up postgres -d` | Postgres only |
