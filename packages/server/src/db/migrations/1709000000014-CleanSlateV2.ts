import { MigrationInterface, QueryRunner } from 'typeorm';

export class CleanSlateV21709000000014 implements MigrationInterface {
  public up = async (queryRunner: QueryRunner): Promise<void> => {
    await queryRunner.query(`DELETE FROM "test_items"`);
    await queryRunner.query(`DELETE FROM "launches"`);
    await queryRunner.query(`DELETE FROM "component_mappings"`);
  };

  public down = async (_queryRunner: QueryRunner): Promise<void> => {
    // intentional data clear
  };
}
