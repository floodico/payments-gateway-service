import { MigrationInterface, QueryRunner } from 'typeorm';

export class InitialSchema1748793600000 implements MigrationInterface {
  name = 'InitialSchema1748793600000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE "users" (
        "id" uuid NOT NULL DEFAULT gen_random_uuid(),
        "brand_id" character varying(64) NOT NULL,
        "email" character varying(255) NOT NULL,
        "password_hash" character varying(255) NOT NULL,
        "created_at" TIMESTAMPTZ NOT NULL DEFAULT now(),
        "updated_at" TIMESTAMPTZ NOT NULL DEFAULT now(),
        CONSTRAINT "PK_users" PRIMARY KEY ("id"),
        CONSTRAINT "UQ_users_brand_email" UNIQUE ("brand_id", "email")
      )
    `);

    await queryRunner.query(`
      CREATE TABLE "sessions" (
        "id" uuid NOT NULL DEFAULT gen_random_uuid(),
        "user_id" uuid NOT NULL,
        "token_hash" character varying(255) NOT NULL,
        "expires_at" TIMESTAMPTZ NOT NULL,
        "created_at" TIMESTAMPTZ NOT NULL DEFAULT now(),
        CONSTRAINT "PK_sessions" PRIMARY KEY ("id"),
        CONSTRAINT "FK_sessions_user" FOREIGN KEY ("user_id")
          REFERENCES "users"("id") ON DELETE CASCADE
      )
    `);
    await queryRunner.query(
      `CREATE INDEX "IDX_sessions_user_id" ON "sessions" ("user_id")`,
    );

    await queryRunner.query(`
      CREATE TABLE "raw_events" (
        "id" uuid NOT NULL DEFAULT gen_random_uuid(),
        "brand_id" character varying(64) NOT NULL,
        "provider" character varying(64) NOT NULL,
        "source" character varying(16) NOT NULL,
        "event_type" character varying(128) NOT NULL,
        "payload" jsonb NOT NULL,
        "idempotency_key" character varying(255) NOT NULL,
        "status" character varying(32) NOT NULL DEFAULT 'pending',
        "created_at" TIMESTAMPTZ NOT NULL DEFAULT now(),
        CONSTRAINT "PK_raw_events" PRIMARY KEY ("id")
      )
    `);
    await queryRunner.query(
      `CREATE INDEX "IDX_raw_events_brand_id" ON "raw_events" ("brand_id")`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_raw_events_idempotency_key" ON "raw_events" ("idempotency_key")`,
    );

    await queryRunner.query(`
      CREATE TABLE "idempotency_keys" (
        "id" uuid NOT NULL DEFAULT gen_random_uuid(),
        "key" character varying(255) NOT NULL,
        "provider" character varying(64) NOT NULL,
        "brand_id" character varying(64) NOT NULL,
        "raw_event_id" uuid NOT NULL,
        "created_at" TIMESTAMPTZ NOT NULL DEFAULT now(),
        CONSTRAINT "PK_idempotency_keys" PRIMARY KEY ("id"),
        CONSTRAINT "UQ_idempotency_keys_brand_provider_key"
          UNIQUE ("brand_id", "provider", "key"),
        CONSTRAINT "FK_idempotency_keys_raw_event" FOREIGN KEY ("raw_event_id")
          REFERENCES "raw_events"("id") ON DELETE CASCADE
      )
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE "idempotency_keys"`);
    await queryRunner.query(`DROP TABLE "raw_events"`);
    await queryRunner.query(`DROP TABLE "sessions"`);
    await queryRunner.query(`DROP TABLE "users"`);
  }
}
