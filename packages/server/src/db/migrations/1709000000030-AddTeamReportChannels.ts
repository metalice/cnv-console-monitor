import { type MigrationInterface, type QueryRunner } from 'typeorm';

export class AddTeamReportChannels1709000000030 implements MigrationInterface {
  name = 'AddTeamReportChannels1709000000030';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "notification_subscriptions" ADD COLUMN IF NOT EXISTS "team_report_slack_webhook" varchar`,
    );
    await queryRunner.query(
      `ALTER TABLE "notification_subscriptions" ADD COLUMN IF NOT EXISTS "team_report_email_recipients" text`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "notification_subscriptions" DROP COLUMN IF EXISTS "team_report_slack_webhook"`,
    );
    await queryRunner.query(
      `ALTER TABLE "notification_subscriptions" DROP COLUMN IF EXISTS "team_report_email_recipients"`,
    );
  }
}
