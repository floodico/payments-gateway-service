import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { SessionEntity } from '../../../database/entities/session.entity';

@Injectable()
export class SessionsRepository {
  constructor(
    @InjectRepository(SessionEntity)
    private readonly repository: Repository<SessionEntity>,
  ) {}

  create(data: Partial<SessionEntity>): Promise<SessionEntity> {
    const session = this.repository.create(data);
    return this.repository.save(session);
  }
}
