import { MigrationInterface, QueryRunner } from 'typeorm';

export class CleanSlate1709000000012 implements MigrationInterface {
  public up = async (queryRunner: QueryRunner): Promise<void> => {
    await queryRunner.query(`DELETE FROM "test_items"`);
    await queryRunner.query(`DELETE FROM "launches"`);
    await queryRunner.query(`DELETE FROM "component_mappings"`);
    await queryRunner.query(`DELETE FROM "settings" WHERE "key" IN ('schedule.pollIntervalMinutes', 'schedule.initialLookbackDays')`);
  };

  public down = async (_queryRunner: QueryRunner): Promise<void> => {
    // no-op: data clearing is intentional
  };
}
