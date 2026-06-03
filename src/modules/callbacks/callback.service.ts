import {
  BadRequestException,
  Injectable,
  Logger,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectDataSource } from '@nestjs/typeorm';
import { DataSource, QueryFailedError } from 'typeorm';
import { RawEventStatus } from '../../database/entities/raw-event.entity';
import { WebhookPayloadDto } from './dto/webhook-payload.dto';
import { WebhookResponseDto } from './dto/webhook-response.dto';
import { CallbackSource } from './interfaces/callback-source';
import { IdempotencyKeysRepository } from './repositories/idempotency-keys.repository';
import { RawEventsRepository } from './repositories/raw-events.repository';

export interface HandleWebhookInput {
  source: CallbackSource;
  provider: string;
  brandId: string;
  idempotencyKey: string;
  body: WebhookPayloadDto;
}

@Injectable()
export class CallbackService {
  private readonly logger = new Logger(CallbackService.name);

  constructor(
    private readonly idempotencyKeysRepository: IdempotencyKeysRepository,
    private readonly rawEventsRepository: RawEventsRepository,
    @InjectDataSource() private readonly dataSource: DataSource,
    private readonly configService: ConfigService,
  ) {}

  getSignatureSecret(): string {
    return this.configService.get<string>(
      'webhook.signatureSecret',
      'local_webhook_hmac_stub',
    )!;
  }

  async handleWebhook(input: HandleWebhookInput): Promise<WebhookResponseDto> {
    const { source, provider, brandId, idempotencyKey, body } = input;

    const existing = await this.idempotencyKeysRepository.findByScope(
      brandId,
      source,
      provider,
      idempotencyKey,
    );

    if (existing) {
      return this.duplicateResponse(existing.rawEventId);
    }

    try {
      const eventId = await this.persistEvent(
        source,
        provider,
        brandId,
        idempotencyKey,
        body,
      );

      return {
        eventId,
        status: 'created',
        duplicate: false,
      };
    } catch (error) {
      if (this.isUniqueViolation(error)) {
        const raced = await this.idempotencyKeysRepository.findByScope(
          brandId,
          source,
          provider,
          idempotencyKey,
        );

        if (raced) {
          return this.duplicateResponse(raced.rawEventId);
        }
      }

      throw error;
    }
  }

  private async persistEvent(
    source: CallbackSource,
    provider: string,
    brandId: string,
    idempotencyKey: string,
    body: WebhookPayloadDto,
  ): Promise<string> {
    return this.dataSource.transaction(async (manager) => {
      const rawEvent = await this.rawEventsRepository.create(
        {
          brandId,
          provider,
          source,
          eventType: body.eventType,
          payload: {
            eventType: body.eventType,
            ...(body.data ?? {}),
          },
          idempotencyKey,
          status: RawEventStatus.PENDING,
        },
        manager,
      );

      await this.idempotencyKeysRepository.create(
        {
          key: idempotencyKey,
          source,
          provider,
          brandId,
          rawEventId: rawEvent.id,
        },
        manager,
      );

      this.logger.log(
        { eventId: rawEvent.id, brandId, provider, source },
        'Webhook event persisted',
      );

      return rawEvent.id;
    });
  }

  private duplicateResponse(eventId: string): WebhookResponseDto {
    return {
      eventId,
      status: 'duplicate',
      duplicate: true,
    };
  }

  private isUniqueViolation(error: unknown): boolean {
    return (
      error instanceof QueryFailedError &&
      (error as QueryFailedError & { code?: string }).code === '23505'
    );
  }
}

export function resolveIdempotencyKey(
  headerValue: string | undefined,
  body: Record<string, unknown>,
): string {
  const fromHeader = headerValue?.trim();
  if (fromHeader) {
    return fromHeader;
  }

  const fromBody = body['idempotencyKey'];
  if (typeof fromBody === 'string' && fromBody.trim().length > 0) {
    return fromBody.trim();
  }

  throw new BadRequestException('Idempotency key is required');
}

export function resolveBrandId(headerValue: string | undefined): string {
  const brandId = headerValue?.trim();
  if (!brandId) {
    throw new BadRequestException('X-Brand-Id header is required');
  }
  return brandId;
}
