import type { MigrationInterface, QueryRunner } from 'typeorm';

export class AddTriageLogPinning1709000000019 implements MigrationInterface {
  public up = async (queryRunner: QueryRunner): Promise<void> => {
    await queryRunner.query(`ALTER TABLE "triage_log" ADD COLUMN IF NOT EXISTS "pinned" BOOLEAN DEFAULT FALSE`);
    await queryRunner.query(`ALTER TABLE "triage_log" ADD COLUMN IF NOT EXISTS "pin_note" TEXT`);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS "idx_triage_log_pinned" ON "triage_log" ("pinned") WHERE "pinned" = TRUE`);
  };

  public down = async (queryRunner: QueryRunner): Promise<void> => {
    await queryRunner.query(`DROP INDEX IF EXISTS "idx_triage_log_pinned"`);
    await queryRunner.query(`ALTER TABLE "triage_log" DROP COLUMN IF EXISTS "pin_note"`);
    await queryRunner.query(`ALTER TABLE "triage_log" DROP COLUMN IF EXISTS "pinned"`);
  };
}
