import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { UserEntity } from '../../../database/entities/user.entity';

@Injectable()
export class UsersRepository {
  constructor(
    @InjectRepository(UserEntity)
    private readonly repository: Repository<UserEntity>,
  ) {}

  findByBrandAndEmail(brandId: string, email: string): Promise<UserEntity | null> {
    return this.repository.findOne({
      where: { brandId, email: email.toLowerCase() },
    });
  }

  findByIdAndBrand(id: string, brandId: string): Promise<UserEntity | null> {
    return this.repository.findOne({ where: { id, brandId } });
  }

  create(data: Partial<UserEntity>): Promise<UserEntity> {
    const user = this.repository.create(data);
    return this.repository.save(user);
  }
}
