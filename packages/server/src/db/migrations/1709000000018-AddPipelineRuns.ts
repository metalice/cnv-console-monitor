import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddPipelineRuns1709000000018 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "pipeline_runs" (
        "id" SERIAL PRIMARY KEY,
        "run_id" varchar NOT NULL,
        "started_at" TIMESTAMP NOT NULL DEFAULT now(),
        "completed_at" TIMESTAMP,
        "duration_ms" integer,
        "cancelled" boolean DEFAULT false,
        "trigger" varchar NOT NULL DEFAULT 'manual',
        "phases" jsonb NOT NULL DEFAULT '{}',
        "summary" text,
        "log" jsonb
      )
    `);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS "idx_pipeline_runs_started" ON "pipeline_runs" ("started_at" DESC)`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE IF EXISTS "pipeline_runs"`);
  }
}
