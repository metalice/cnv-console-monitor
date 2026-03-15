import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddComponentToAckAndTriage1709000000008 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "acknowledgments" ADD COLUMN IF NOT EXISTS "component" VARCHAR`);
    await queryRunner.query(`ALTER TABLE "triage_log" ADD COLUMN IF NOT EXISTS "component" VARCHAR`);
    await queryRunner.query(`ALTER TABLE "acknowledgments" DROP CONSTRAINT IF EXISTS "uq_ack_date_reviewer"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "uq_ack_date_reviewer"`);
    await queryRunner.query(`CREATE UNIQUE INDEX IF NOT EXISTS "uq_ack_date_reviewer_component" ON "acknowledgments" ("date", "reviewer", COALESCE("component", ''))`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX IF EXISTS "uq_ack_date_reviewer_component"`);
    await queryRunner.query(`ALTER TABLE "acknowledgments" DROP COLUMN IF EXISTS "component"`);
    await queryRunner.query(`ALTER TABLE "triage_log" DROP COLUMN IF EXISTS "component"`);
  }
}
