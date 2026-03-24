import { type MigrationInterface, type QueryRunner } from 'typeorm';

export class AddSubscriptionReminder1709000000016 implements MigrationInterface {
  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "notification_subscriptions" DROP COLUMN IF EXISTS "reminder_enabled"`,
    );
    await queryRunner.query(
      `ALTER TABLE "notification_subscriptions" DROP COLUMN IF EXISTS "reminder_time"`,
    );
    await queryRunner.query(
      `ALTER TABLE "notification_subscriptions" DROP COLUMN IF EXISTS "reminder_days"`,
    );
  }

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "notification_subscriptions" ADD COLUMN IF NOT EXISTS "reminder_enabled" boolean DEFAULT false`,
    );
    await queryRunner.query(
      `ALTER TABLE "notification_subscriptions" ADD COLUMN IF NOT EXISTS "reminder_time" varchar DEFAULT '10:00'`,
    );
    await queryRunner.query(
      `ALTER TABLE "notification_subscriptions" ADD COLUMN IF NOT EXISTS "reminder_days" varchar DEFAULT '1,2,3,4,5'`,
    );
  }
}
