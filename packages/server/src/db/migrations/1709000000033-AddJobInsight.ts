import { type MigrationInterface, type QueryRunner } from 'typeorm';

export class AddJobInsight1709000000033 implements MigrationInterface {
  name = 'AddJobInsight1709000000033';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "job_insight_results" (
        "id" SERIAL PRIMARY KEY,
        "job_id" varchar NOT NULL UNIQUE,
        "launch_rp_id" int NOT NULL,
        "job_name" varchar NOT NULL,
        "build_number" int NOT NULL,
        "ai_provider" varchar NOT NULL,
        "ai_model" varchar NOT NULL,
        "status" varchar NOT NULL DEFAULT 'queued',
        "result" jsonb,
        "triggered_by" varchar NOT NULL,
        "completed_at" TIMESTAMP,
        "created_at" TIMESTAMP NOT NULL DEFAULT now()
      )
    `);

    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS "idx_job_insight_job_id" ON "job_insight_results" ("job_id")`,
    );
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS "idx_job_insight_launch_rp_id" ON "job_insight_results" ("launch_rp_id")`,
    );
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS "idx_job_insight_status" ON "job_insight_results" ("status")`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE IF EXISTS "job_insight_results"`);
  }
}
