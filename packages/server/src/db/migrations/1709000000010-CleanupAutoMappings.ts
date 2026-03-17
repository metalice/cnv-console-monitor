import { MigrationInterface, QueryRunner } from 'typeorm';

export class CleanupAutoMappings1709000000010 implements MigrationInterface {
  public up = async (queryRunner: QueryRunner): Promise<void> => {
    await queryRunner.query(`DELETE FROM "component_mappings" WHERE "type" = 'auto'`);
  };

  public down = async (_queryRunner: QueryRunner): Promise<void> => {
    // no-op: auto mappings are no longer seeded
  };
}
