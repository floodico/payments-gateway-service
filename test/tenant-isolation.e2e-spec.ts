import { INestApplication } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { randomUUID } from 'crypto';
import request from 'supertest';
import { App } from 'supertest/types';
import { createE2eApp } from './helpers/e2e-app';

const runE2e = process.env.E2E === 'true';

(runE2e ? describe : describe.skip)('Tenant isolation (e2e)', () => {
  let app: INestApplication<App>;
  let jwtService: JwtService;

  const password = 'password123';
  const brandAEmail = `tenant-a-${Date.now()}@test.com`;
  let brandAUserId: string;

  beforeAll(async () => {
    app = await createE2eApp();
    jwtService = app.get(JwtService);

    const registerResponse = await request(app.getHttpServer())
      .post('/auth/register')
      .send({
        brandId: 'brand-a',
        email: brandAEmail,
        password,
      })
      .expect(201);

    brandAUserId = registerResponse.body.id;
  });

  afterAll(async () => {
    await app?.close();
  });

  it('GET /profile/me returns 403 when JWT brandId does not match user tenant', async () => {
    const crossTenantToken = await jwtService.signAsync({
      sub: brandAUserId,
      brandId: 'brand-b',
      jti: randomUUID(),
    });

    await request(app.getHttpServer())
      .get('/profile/me')
      .set('Authorization', `Bearer ${crossTenantToken}`)
      .expect(403);
  });

  it('GET /profile/me returns 200 when JWT brandId matches user tenant', async () => {
    const loginResponse = await request(app.getHttpServer())
      .post('/auth/login')
      .send({ brandId: 'brand-a', email: brandAEmail, password })
      .expect(200);

    await request(app.getHttpServer())
      .get('/profile/me')
      .set('Authorization', `Bearer ${loginResponse.body.accessToken}`)
      .expect(200)
      .expect((res) => {
        expect(res.body.id).toBe(brandAUserId);
        expect(res.body.brandId).toBe('brand-a');
      });
  });
});
