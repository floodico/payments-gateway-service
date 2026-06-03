import { MigrationInterface, QueryRunner } from 'typeorm';

export class IdempotencyScopeBySource1748880000000 implements MigrationInterface {
  name = 'IdempotencyScopeBySource1748880000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "idempotency_keys"
      ADD COLUMN "source" character varying(16) NOT NULL DEFAULT 'psp'
    `);

    await queryRunner.query(`
      ALTER TABLE "idempotency_keys"
      DROP CONSTRAINT "UQ_idempotency_keys_brand_provider_key"
    `);

    await queryRunner.query(`
      ALTER TABLE "idempotency_keys"
      ADD CONSTRAINT "UQ_idempotency_keys_brand_source_provider_key"
      UNIQUE ("brand_id", "source", "provider", "key")
    `);

    await queryRunner.query(`
      ALTER TABLE "idempotency_keys"
      ALTER COLUMN "source" DROP DEFAULT
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "idempotency_keys"
      DROP CONSTRAINT "UQ_idempotency_keys_brand_source_provider_key"
    `);

    await queryRunner.query(`
      ALTER TABLE "idempotency_keys"
      ADD CONSTRAINT "UQ_idempotency_keys_brand_provider_key"
      UNIQUE ("brand_id", "provider", "key")
    `);

    await queryRunner.query(`
      ALTER TABLE "idempotency_keys" DROP COLUMN "source"
    `);
  }
}
