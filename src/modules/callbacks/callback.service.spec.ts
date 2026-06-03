import { DataSource } from 'typeorm';
import { RawEventStatus } from '../../database/entities/raw-event.entity';
import { DEMO_BRAND_ID } from '../common/demo.constants';
import { CallbackService } from './callback.service';
import { IdempotencyKeysRepository } from './repositories/idempotency-keys.repository';
import { RawEventsRepository } from './repositories/raw-events.repository';

describe('CallbackService', () => {
  let service: CallbackService;
  let idempotencyKeysRepository: jest.Mocked<IdempotencyKeysRepository>;
  let rawEventsRepository: jest.Mocked<RawEventsRepository>;
  let transactionFn: jest.Mock;

  const pspInput = {
    source: 'psp' as const,
    provider: 'liqpay',
    brandId: DEMO_BRAND_ID,
    idempotencyKey: 'evt-liqpay-001',
    body: { eventType: 'payment.completed', data: { amount: 100 } },
  };

  const gspInput = {
    source: 'gsp' as const,
    provider: 'wayforpay',
    brandId: DEMO_BRAND_ID,
    idempotencyKey: 'evt-wayforpay-001',
    body: { eventType: 'payment.completed', data: { amount: 200 } },
  };

  beforeEach(() => {
    idempotencyKeysRepository = {
      findByScope: jest.fn(),
      create: jest.fn(),
    };

    rawEventsRepository = {
      findById: jest.fn(),
      create: jest.fn().mockResolvedValue({
        id: 'raw-event-1',
        status: RawEventStatus.PENDING,
      }),
    };

    transactionFn = jest.fn(async (work: (manager: unknown) => Promise<string>) =>
      work({}),
    );

    const dataSource = {
      transaction: transactionFn,
    } as unknown as DataSource;

    const configService = {
      get: jest.fn(() => 'local_webhook_hmac_stub'),
    };

    service = new CallbackService(
      idempotencyKeysRepository,
      rawEventsRepository,
      dataSource,
      configService as never,
    );
  });

  it('returns duplicate without persisting when key exists (psp/liqpay)', async () => {
    idempotencyKeysRepository.findByScope.mockResolvedValue({
      id: 'idem-1',
      key: pspInput.idempotencyKey,
      source: pspInput.source,
      provider: pspInput.provider,
      brandId: pspInput.brandId,
      rawEventId: 'existing-event-id',
      createdAt: new Date(),
    } as never);

    const result = await service.handleWebhook(pspInput);

    expect(result).toEqual({
      eventId: 'existing-event-id',
      status: 'duplicate',
      duplicate: true,
    });
    expect(transactionFn).not.toHaveBeenCalled();
    expect(rawEventsRepository.create).not.toHaveBeenCalled();
  });

  it('persists raw event and idempotency key for new callback (gsp/wayforpay)', async () => {
    idempotencyKeysRepository.findByScope.mockResolvedValue(null);

    const result = await service.handleWebhook(gspInput);

    expect(transactionFn).toHaveBeenCalled();
    expect(rawEventsRepository.create).toHaveBeenCalledWith(
      expect.objectContaining({
        brandId: DEMO_BRAND_ID,
        provider: 'wayforpay',
        source: 'gsp',
        eventType: 'payment.completed',
        idempotencyKey: 'evt-wayforpay-001',
        status: RawEventStatus.PENDING,
      }),
      expect.anything(),
    );
    expect(idempotencyKeysRepository.create).toHaveBeenCalledWith(
      expect.objectContaining({
        key: 'evt-wayforpay-001',
        source: 'gsp',
        provider: 'wayforpay',
        rawEventId: 'raw-event-1',
      }),
      expect.anything(),
    );
    expect(result).toEqual({
      eventId: 'raw-event-1',
      status: 'created',
      duplicate: false,
    });
  });

  it('treats same key on psp and gsp as separate events', async () => {
    idempotencyKeysRepository.findByScope.mockResolvedValue(null);

    await service.handleWebhook({
      ...pspInput,
      idempotencyKey: 'shared-event-id',
    });
    await service.handleWebhook({
      ...gspInput,
      provider: 'liqpay',
      idempotencyKey: 'shared-event-id',
    });

    expect(idempotencyKeysRepository.findByScope).toHaveBeenCalledWith(
      DEMO_BRAND_ID,
      'psp',
      'liqpay',
      'shared-event-id',
    );
    expect(idempotencyKeysRepository.findByScope).toHaveBeenCalledWith(
      DEMO_BRAND_ID,
      'gsp',
      'liqpay',
      'shared-event-id',
    );
    expect(transactionFn).toHaveBeenCalledTimes(2);
  });
});
