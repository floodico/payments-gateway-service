import { INestApplication } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { Logger } from 'nestjs-pino';
import request from 'supertest';
import { App } from 'supertest/types';
import { AppModule } from '../src/app.module';
import { CORRELATION_ID_HEADER } from '../src/modules/common/constants';

const runE2e = process.env.E2E === 'true';

(runE2e ? describe : describe.skip)('App (e2e)', () => {
  let app: INestApplication<App>;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication({ bufferLogs: true });
    app.useLogger(app.get(Logger));
    await app.init();
  });

  afterAll(async () => {
    await app?.close();
  });

  it('GET /health returns ok', () => {
    return request(app.getHttpServer())
      .get('/health')
      .expect(200)
      .expect({ status: 'ok', database: 'up' });
  });

  it('propagates X-Correlation-Id on responses', () => {
    const correlationId = 'test-correlation-id-123';

    return request(app.getHttpServer())
      .get('/health')
      .set(CORRELATION_ID_HEADER, correlationId)
      .expect(200)
      .expect('X-Correlation-Id', correlationId);
  });
});
