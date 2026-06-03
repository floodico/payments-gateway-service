import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import {
  IdempotencyKeyEntity,
  RawEventEntity,
  SessionEntity,
  UserEntity,
} from './entities';

@Module({
  imports: [
    TypeOrmModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => {
        const db = configService.get<{
          host: string;
          port: number;
          username: string;
          password: string;
          name: string;
        }>('database')!;

        const nodeEnv = configService.get<string>('nodeEnv', 'development');

        return {
          type: 'postgres' as const,
          host: db.host,
          port: db.port,
          username: db.username,
          password: db.password,
          database: db.name,
          entities: [
            UserEntity,
            SessionEntity,
            RawEventEntity,
            IdempotencyKeyEntity,
          ],
          migrations: [`${__dirname}/migrations/*{.ts,.js}`],
          migrationsRun: true,
          synchronize: false,
          logging: nodeEnv === 'development',
        };
      },
    }),
  ],
})
export class DatabaseModule {}
