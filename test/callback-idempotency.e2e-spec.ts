import { INestApplication } from '@nestjs/common';
import { DataSource } from 'typeorm';
import { App } from 'supertest/types';
import { createE2eApp } from './helpers/e2e-app';
import { postWebhook } from './helpers/webhook';

const runE2e = process.env.E2E === 'true';

(runE2e ? describe : describe.skip)('Callback idempotency (e2e)', () => {
  let app: INestApplication<App>;
  let dataSource: DataSource;

  const idempotencyKey = `e2e-liqpay-${Date.now()}`;
  const brandId = 'brand-a';
  const provider = 'liqpay';
  let firstEventId: string;

  beforeAll(async () => {
    app = await createE2eApp();
    dataSource = app.get(DataSource);
  });

  afterAll(async () => {
    await app?.close();
  });

  it('first POST returns 201 and persists event', async () => {
    const response = await postWebhook(app, { idempotencyKey }).expect(201);

    expect(response.body).toMatchObject({
      status: 'created',
      duplicate: false,
      eventId: expect.any(String),
    });

    firstEventId = response.body.eventId;
  });

  it('duplicate POST returns 200 with same eventId', async () => {
    const response = await postWebhook(app, { idempotencyKey }).expect(200);

    expect(response.body).toMatchObject({
      status: 'duplicate',
      duplicate: true,
      eventId: firstEventId,
    });
  });

  it('database contains exactly one raw_event and one idempotency_key', async () => {
    const [rawRows] = await dataSource.query(
      `SELECT COUNT(*)::int AS count FROM raw_events
       WHERE idempotency_key = $1 AND brand_id = $2 AND provider = $3`,
      [idempotencyKey, brandId, provider],
    );
    const [idemRows] = await dataSource.query(
      `SELECT COUNT(*)::int AS count FROM idempotency_keys
       WHERE key = $1 AND brand_id = $2 AND provider = $3`,
      [idempotencyKey, brandId, provider],
    );

    expect(rawRows.count).toBe(1);
    expect(idemRows.count).toBe(1);
  });
});
