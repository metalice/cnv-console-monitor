import { type MigrationInterface, type QueryRunner } from 'typeorm';

export class AddFeedback1709000000032 implements MigrationInterface {
  name = 'AddFeedback1709000000032';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "feedback" (
        "id" SERIAL PRIMARY KEY,
        "category" varchar(20) NOT NULL,
        "description" text NOT NULL,
        "status" varchar(20) NOT NULL DEFAULT 'new',
        "priority" varchar(20),
        "tags" jsonb NOT NULL DEFAULT '[]',
        "screenshot" text,
        "console_errors" text,
        "page_url" varchar(500) NOT NULL,
        "component_filter" varchar(500),
        "user_agent" varchar,
        "submitted_by" varchar NOT NULL,
        "admin_note" text,
        "satisfaction" boolean,
        "created_at" TIMESTAMP NOT NULL DEFAULT now(),
        "updated_at" TIMESTAMP NOT NULL DEFAULT now()
      )
    `);

    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS "idx_feedback_category" ON "feedback" ("category")`,
    );
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS "idx_feedback_status" ON "feedback" ("status")`,
    );
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS "idx_feedback_priority" ON "feedback" ("priority")`,
    );
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS "idx_feedback_submitted_by" ON "feedback" ("submitted_by")`,
    );
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS "idx_feedback_created_at" ON "feedback" ("created_at")`,
    );

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "feedback_votes" (
        "id" SERIAL PRIMARY KEY,
        "feedback_id" int NOT NULL REFERENCES "feedback"("id") ON DELETE CASCADE,
        "user_email" varchar NOT NULL,
        "created_at" TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "uq_feedback_vote" UNIQUE ("feedback_id", "user_email")
      )
    `);

    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS "idx_feedback_votes_feedback_id" ON "feedback_votes" ("feedback_id")`,
    );

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "feedback_responses" (
        "id" SERIAL PRIMARY KEY,
        "feedback_id" int NOT NULL REFERENCES "feedback"("id") ON DELETE CASCADE,
        "author_email" varchar NOT NULL,
        "author_name" varchar NOT NULL,
        "message" text NOT NULL,
        "created_at" TIMESTAMP NOT NULL DEFAULT now()
      )
    `);

    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS "idx_feedback_responses_feedback_id" ON "feedback_responses" ("feedback_id")`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE IF EXISTS "feedback_responses"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "feedback_votes"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "feedback"`);
  }
}
