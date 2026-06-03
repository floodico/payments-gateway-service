import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { EntityManager, Repository } from 'typeorm';
import { RawEventEntity } from '../../../database/entities/raw-event.entity';

@Injectable()
export class RawEventsRepository {
  constructor(
    @InjectRepository(RawEventEntity)
    private readonly repository: Repository<RawEventEntity>,
  ) {}

  findById(id: string): Promise<RawEventEntity | null> {
    return this.repository.findOne({ where: { id } });
  }

  create(
    data: Partial<RawEventEntity>,
    manager?: EntityManager,
  ): Promise<RawEventEntity> {
    const repo = manager
      ? manager.getRepository(RawEventEntity)
      : this.repository;

    return repo.save(repo.create(data));
  }
}
