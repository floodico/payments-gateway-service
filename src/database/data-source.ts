import { config } from 'dotenv';
import { DataSource } from 'typeorm';
import {
  IdempotencyKeyEntity,
  RawEventEntity,
  SessionEntity,
  UserEntity,
} from './entities';

config();

export default new DataSource({
  type: 'postgres',
  host: process.env.DB_HOST ?? 'localhost',
  port: parseInt(process.env.DB_PORT ?? '5432', 10),
  username: process.env.DB_USER ?? 'payments',
  password: process.env.DB_PASSWORD ?? 'payments',
  database: process.env.DB_NAME ?? 'payments_gateway',
  entities: [UserEntity, SessionEntity, RawEventEntity, IdempotencyKeyEntity],
  migrations: [`${__dirname}/migrations/*{.ts,.js}`],
});
