import { type MigrationInterface, type QueryRunner } from 'typeorm';

export class AddSubscriptionJiraWebhook1709000000007 implements MigrationInterface {
  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "notification_subscriptions" DROP COLUMN IF EXISTS "jira_webhook"`,
    );
  }

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "notification_subscriptions" ADD COLUMN IF NOT EXISTS "jira_webhook" VARCHAR`,
    );
  }
}
