import { DataSource } from 'typeorm';
import { RawEventStatus } from '../../database/entities/raw-event.entity';
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
    brandId: 'brand-a',
    idempotencyKey: 'evt-liqpay-001',
    body: { eventType: 'payment.completed', data: { amount: 100 } },
  };

  const gspInput = {
    source: 'gsp' as const,
    provider: 'wayforpay',
    brandId: 'brand-a',
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
        brandId: 'brand-a',
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
});
