import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { App } from 'supertest/types';
import {
  BRAND_ID_HEADER,
  IDEMPOTENCY_KEY_HEADER,
  WEBHOOK_SIGNATURE_HEADER,
} from '../../src/modules/common/constants';

const DEFAULT_SIGNATURE = 'local_webhook_hmac_stub';

export interface WebhookRequestOptions {
  source?: 'psp' | 'gsp';
  provider?: string;
  brandId?: string;
  idempotencyKey: string;
  signature?: string;
  body?: Record<string, unknown>;
}

export function postWebhook(
  app: INestApplication<App>,
  options: WebhookRequestOptions,
) {
  const source = options.source ?? 'psp';
  const provider = options.provider ?? 'liqpay';
  const path = `/webhooks/${source}/${provider}`;

  return request(app.getHttpServer())
    .post(path)
    .set(BRAND_ID_HEADER, options.brandId ?? 'brand-a')
    .set(IDEMPOTENCY_KEY_HEADER, options.idempotencyKey)
    .set(WEBHOOK_SIGNATURE_HEADER, options.signature ?? DEFAULT_SIGNATURE)
    .send(
      options.body ?? {
        eventType: 'payment.completed',
        data: { amount: 100 },
      },
    );
}
