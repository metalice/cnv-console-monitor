import { type MigrationInterface, type QueryRunner } from 'typeorm';

export class AddNotificationSubscriptions1709000000004 implements MigrationInterface {
  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query('DROP TABLE IF EXISTS "notification_subscriptions"');
  }

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "notification_subscriptions" (
        "id" SERIAL PRIMARY KEY,
        "name" VARCHAR NOT NULL,
        "components" TEXT NOT NULL DEFAULT '[]',
        "slack_webhook" VARCHAR,
        "email_recipients" TEXT,
        "schedule" VARCHAR NOT NULL DEFAULT '0 7 * * *',
        "timezone" VARCHAR NOT NULL DEFAULT 'Asia/Jerusalem',
        "enabled" BOOLEAN NOT NULL DEFAULT true,
        "created_by" VARCHAR,
        "created_at" TIMESTAMP DEFAULT NOW(),
        "updated_at" TIMESTAMP DEFAULT NOW()
      )
    `);
  }
}
