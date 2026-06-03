import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { IdempotencyKeyEntity } from '../../database/entities/idempotency-key.entity';
import { RawEventEntity } from '../../database/entities/raw-event.entity';
import { CallbackService } from './callback.service';
import { IdempotencyKeysRepository } from './repositories/idempotency-keys.repository';
import { RawEventsRepository } from './repositories/raw-events.repository';
import { WebhooksController } from './webhooks.controller';

@Module({
  imports: [TypeOrmModule.forFeature([RawEventEntity, IdempotencyKeyEntity])],
  controllers: [WebhooksController],
  providers: [
    CallbackService,
    RawEventsRepository,
    IdempotencyKeysRepository,
  ],
})
export class CallbacksModule {}
