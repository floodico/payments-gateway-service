import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { EntityManager, Repository } from 'typeorm';
import { IdempotencyKeyEntity } from '../../../database/entities/idempotency-key.entity';

@Injectable()
export class IdempotencyKeysRepository {
  constructor(
    @InjectRepository(IdempotencyKeyEntity)
    private readonly repository: Repository<IdempotencyKeyEntity>,
  ) {}

  findByScope(
    brandId: string,
    source: string,
    provider: string,
    key: string,
    manager?: EntityManager,
  ): Promise<IdempotencyKeyEntity | null> {
    const repo = manager
      ? manager.getRepository(IdempotencyKeyEntity)
      : this.repository;

    return repo.findOne({
      where: { brandId, source, provider, key },
      relations: { rawEvent: true },
    });
  }

  create(
    data: Partial<IdempotencyKeyEntity>,
    manager?: EntityManager,
  ): Promise<IdempotencyKeyEntity> {
    const repo = manager
      ? manager.getRepository(IdempotencyKeyEntity)
      : this.repository;

    return repo.save(repo.create(data));
  }
}
