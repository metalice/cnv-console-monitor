import { MigrationInterface, QueryRunner } from 'typeorm';

export class InitialSchema1709000000000 implements MigrationInterface {
  name = 'InitialSchema1709000000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "launches" (
        "id" SERIAL PRIMARY KEY,
        "rp_id" INTEGER NOT NULL UNIQUE,
        "uuid" VARCHAR NOT NULL,
        "name" VARCHAR NOT NULL,
        "number" INTEGER NOT NULL,
        "status" VARCHAR NOT NULL,
        "cnv_version" VARCHAR,
        "bundle" VARCHAR,
        "ocp_version" VARCHAR,
        "tier" VARCHAR,
        "cluster_name" VARCHAR,
        "total" INTEGER NOT NULL DEFAULT 0,
        "passed" INTEGER NOT NULL DEFAULT 0,
        "failed" INTEGER NOT NULL DEFAULT 0,
        "skipped" INTEGER NOT NULL DEFAULT 0,
        "start_time" BIGINT NOT NULL,
        "end_time" BIGINT,
        "duration" FLOAT,
        "fetched_at" TIMESTAMP NOT NULL DEFAULT now()
      )
    `);

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "test_items" (
        "id" SERIAL PRIMARY KEY,
        "rp_id" INTEGER NOT NULL UNIQUE,
        "launch_rp_id" INTEGER NOT NULL,
        "name" VARCHAR NOT NULL,
        "status" VARCHAR NOT NULL,
        "polarion_id" VARCHAR,
        "defect_type" VARCHAR,
        "defect_comment" TEXT,
        "ai_prediction" VARCHAR,
        "ai_confidence" INTEGER,
        "error_message" TEXT,
        "jira_key" VARCHAR,
        "jira_status" VARCHAR,
        "unique_id" VARCHAR,
        "start_time" BIGINT,
        "end_time" BIGINT,
        "fetched_at" TIMESTAMP NOT NULL DEFAULT now()
      )
    `);

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "acknowledgments" (
        "id" SERIAL PRIMARY KEY,
        "date" VARCHAR NOT NULL,
        "reviewer" VARCHAR NOT NULL,
        "notes" TEXT,
        "acknowledged_at" TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "uq_ack_date_reviewer" UNIQUE ("date", "reviewer")
      )
    `);

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "triage_log" (
        "id" SERIAL PRIMARY KEY,
        "test_item_rp_id" INTEGER NOT NULL,
        "action" VARCHAR NOT NULL,
        "old_value" TEXT,
        "new_value" TEXT,
        "performed_by" VARCHAR,
        "performed_at" TIMESTAMP NOT NULL DEFAULT now()
      )
    `);

    await queryRunner.query(`CREATE INDEX IF NOT EXISTS "idx_launches_start_time" ON "launches" ("start_time")`);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS "idx_launches_name" ON "launches" ("name")`);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS "idx_launches_status" ON "launches" ("status")`);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS "idx_test_items_launch" ON "test_items" ("launch_rp_id")`);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS "idx_test_items_status" ON "test_items" ("status")`);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS "idx_test_items_unique_id" ON "test_items" ("unique_id")`);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS "idx_acknowledgments_date" ON "acknowledgments" ("date")`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE IF EXISTS "triage_log"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "acknowledgments"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "test_items"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "launches"`);
  }
}
