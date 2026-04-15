import { type MigrationInterface, type QueryRunner } from 'typeorm';

export class ReportCompositeKey1709000000029 implements MigrationInterface {
  name = 'ReportCompositeKey1709000000029';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DELETE FROM "person_reports_weekly"`);
    await queryRunner.query(`DELETE FROM "weekly_reports"`);

    await queryRunner.query(
      `ALTER TABLE "person_reports_weekly" DROP CONSTRAINT IF EXISTS "FK_person_reports_weekly_week"`,
    );
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_person_reports_weekly_week"`);
    await queryRunner.query(
      `ALTER TABLE "weekly_reports" DROP CONSTRAINT IF EXISTS "PK_weekly_reports"`,
    );

    await queryRunner.query(
      `ALTER TABLE "weekly_reports" ADD COLUMN "id" uuid NOT NULL DEFAULT uuid_generate_v4()`,
    );
    await queryRunner.query(
      `ALTER TABLE "weekly_reports" ADD CONSTRAINT "PK_weekly_reports" PRIMARY KEY ("id")`,
    );
    await queryRunner.query(
      `CREATE UNIQUE INDEX "idx_weekly_reports_week_component" ON "weekly_reports" ("week_id", "component")`,
    );

    await queryRunner.query(`ALTER TABLE "person_reports_weekly" ADD COLUMN "report_id" uuid`);
    await queryRunner.query(
      `ALTER TABLE "person_reports_weekly" ADD CONSTRAINT "FK_person_reports_report_id" FOREIGN KEY ("report_id") REFERENCES "weekly_reports"("id") ON DELETE CASCADE`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "person_reports_weekly" DROP CONSTRAINT IF EXISTS "FK_person_reports_report_id"`,
    );
    await queryRunner.query(
      `ALTER TABLE "person_reports_weekly" DROP COLUMN IF EXISTS "report_id"`,
    );
    await queryRunner.query(`DROP INDEX IF EXISTS "idx_weekly_reports_week_component"`);
    await queryRunner.query(
      `ALTER TABLE "weekly_reports" DROP CONSTRAINT IF EXISTS "PK_weekly_reports"`,
    );
    await queryRunner.query(`ALTER TABLE "weekly_reports" DROP COLUMN IF EXISTS "id"`);
    await queryRunner.query(
      `ALTER TABLE "weekly_reports" ADD CONSTRAINT "PK_weekly_reports" PRIMARY KEY ("week_id")`,
    );
    await queryRunner.query(
      `ALTER TABLE "person_reports_weekly" ADD CONSTRAINT "FK_person_reports_weekly_week" FOREIGN KEY ("week_id") REFERENCES "weekly_reports"("week_id") ON DELETE CASCADE`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_person_reports_weekly_week" ON "person_reports_weekly" ("week_id")`,
    );
  }
}
