import { type MigrationInterface, type QueryRunner } from 'typeorm';

export class CleanupAutoMappings1709000000010 implements MigrationInterface {
  public down = async (_queryRunner: QueryRunner): Promise<void> => {
    // No-op: auto mappings are no longer seeded
  };

  public up = async (queryRunner: QueryRunner): Promise<void> => {
    await queryRunner.query(`DELETE FROM "component_mappings" WHERE "type" = 'auto'`);
  };
}
