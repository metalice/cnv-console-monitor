import { type MigrationInterface, type QueryRunner } from 'typeorm';

export class CleanSlateV21709000000014 implements MigrationInterface {
  public down = async (_queryRunner: QueryRunner): Promise<void> => {
    // Intentional data clear
  };

  public up = async (queryRunner: QueryRunner): Promise<void> => {
    await queryRunner.query(`DELETE FROM "test_items"`);
    await queryRunner.query(`DELETE FROM "launches"`);
    await queryRunner.query(`DELETE FROM "component_mappings"`);
  };
}
