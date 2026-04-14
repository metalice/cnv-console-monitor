import { type MigrationInterface, type QueryRunner } from 'typeorm';

export class AddWeeklyReport1709000000026 implements MigrationInterface {
  name = 'AddWeeklyReport1709000000026';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE "team_members_weekly" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "display_name" varchar NOT NULL,
        "email" varchar,
        "github_username" varchar,
        "gitlab_username" varchar,
        "jira_account_id" varchar,
        "component" varchar,
        "is_active" boolean NOT NULL DEFAULT true,
        "ai_mapped" boolean NOT NULL DEFAULT false,
        "mapping_confidence" float,
        "created_at" TIMESTAMP NOT NULL DEFAULT now(),
        "updated_at" TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "PK_team_members_weekly" PRIMARY KEY ("id")
      )
    `);

    await queryRunner.query(`
      CREATE TABLE "weekly_reports" (
        "week_id" varchar NOT NULL,
        "week_start" date NOT NULL,
        "week_end" date NOT NULL,
        "component" varchar NOT NULL DEFAULT '',
        "state" varchar NOT NULL DEFAULT 'DRAFT',
        "manager_highlights" text,
        "task_summary" jsonb,
        "warnings" text,
        "sent_at" TIMESTAMP,
        "created_at" TIMESTAMP NOT NULL DEFAULT now(),
        "updated_at" TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "PK_weekly_reports" PRIMARY KEY ("week_id")
      )
    `);

    await queryRunner.query(`
      CREATE TABLE "person_reports_weekly" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "week_id" varchar NOT NULL,
        "member_id" uuid NOT NULL,
        "prs" jsonb NOT NULL DEFAULT '[]',
        "jira_tickets" jsonb NOT NULL DEFAULT '[]',
        "commits" jsonb NOT NULL DEFAULT '[]',
        "stats" jsonb NOT NULL DEFAULT '{}',
        "ai_summary" text,
        "manager_notes" text,
        "excluded" boolean NOT NULL DEFAULT false,
        "sort_order" int NOT NULL DEFAULT 0,
        CONSTRAINT "PK_person_reports_weekly" PRIMARY KEY ("id"),
        CONSTRAINT "UQ_person_reports_weekly_week_member" UNIQUE ("week_id", "member_id"),
        CONSTRAINT "FK_person_reports_weekly_week" FOREIGN KEY ("week_id")
          REFERENCES "weekly_reports"("week_id") ON DELETE CASCADE,
        CONSTRAINT "FK_person_reports_weekly_member" FOREIGN KEY ("member_id")
          REFERENCES "team_members_weekly"("id") ON DELETE CASCADE
      )
    `);

    await queryRunner.query(
      `CREATE INDEX "IDX_person_reports_weekly_week" ON "person_reports_weekly" ("week_id")`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_person_reports_weekly_member" ON "person_reports_weekly" ("member_id")`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_weekly_reports_component" ON "weekly_reports" ("component")`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_team_members_weekly_github" ON "team_members_weekly" ("github_username")`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_team_members_weekly_jira" ON "team_members_weekly" ("jira_account_id")`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE IF EXISTS "person_reports_weekly"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "weekly_reports"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "team_members_weekly"`);
  }
}
