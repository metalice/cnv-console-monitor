import { type MigrationInterface, type QueryRunner } from 'typeorm';

export class AddWeeklyAggregateStats1709000000028 implements MigrationInterface {
  name = 'AddWeeklyAggregateStats1709000000028';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "weekly_reports" ADD COLUMN IF NOT EXISTS "aggregate_stats" jsonb`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "weekly_reports" DROP COLUMN IF EXISTS "aggregate_stats"`);
  }
}
