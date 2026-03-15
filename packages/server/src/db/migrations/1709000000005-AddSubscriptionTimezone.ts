import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddSubscriptionTimezone1709000000005 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "notification_subscriptions" ADD COLUMN IF NOT EXISTS "timezone" VARCHAR NOT NULL DEFAULT 'Asia/Jerusalem'`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "notification_subscriptions" DROP COLUMN IF EXISTS "timezone"`);
  }
}
