import { type MigrationInterface, type QueryRunner } from 'typeorm';

export class AddReportGeneratedBy1709000000034 implements MigrationInterface {
  name = 'AddReportGeneratedBy1709000000034';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "weekly_reports" ADD COLUMN IF NOT EXISTS "generated_by" varchar`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "weekly_reports" DROP COLUMN IF EXISTS "generated_by"`);
  }
}
