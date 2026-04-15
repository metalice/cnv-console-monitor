import { type MigrationInterface, type QueryRunner } from 'typeorm';

export class AddSubscriptionType1709000000031 implements MigrationInterface {
  name = 'AddSubscriptionType1709000000031';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "notification_subscriptions" ADD COLUMN IF NOT EXISTS "type" varchar NOT NULL DEFAULT 'test'`,
    );
    await queryRunner.query(
      `ALTER TABLE "notification_subscriptions" ADD COLUMN IF NOT EXISTS "team_report_schedule" varchar`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "notification_subscriptions" DROP COLUMN IF EXISTS "team_report_schedule"`,
    );
    await queryRunner.query(
      `ALTER TABLE "notification_subscriptions" DROP COLUMN IF EXISTS "type"`,
    );
  }
}
