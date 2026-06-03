import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { RawEventEntity } from './raw-event.entity';

@Entity('idempotency_keys')
@Index(['brandId', 'source', 'provider', 'key'], { unique: true })
export class IdempotencyKeyEntity {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ type: 'varchar', length: 255 })
  key!: string;

  @Column({ type: 'varchar', length: 16 })
  source!: string;

  @Column({ type: 'varchar', length: 64 })
  provider!: string;

  @Column({ name: 'brand_id', type: 'varchar', length: 64 })
  brandId!: string;

  @Column({ name: 'raw_event_id', type: 'uuid' })
  rawEventId!: string;

  @ManyToOne(() => RawEventEntity, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'raw_event_id' })
  rawEvent!: RawEventEntity;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt!: Date;
}
