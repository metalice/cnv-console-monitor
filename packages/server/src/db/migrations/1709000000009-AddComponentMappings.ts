import { type MigrationInterface, type QueryRunner } from 'typeorm';

export class AddComponentMappings1709000000009 implements MigrationInterface {
  public down = async (queryRunner: QueryRunner): Promise<void> => {
    await queryRunner.query('DROP TABLE IF EXISTS "component_mappings"');
  };

  public up = async (queryRunner: QueryRunner): Promise<void> => {
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "component_mappings" (
        "pattern" VARCHAR PRIMARY KEY,
        "component" VARCHAR NOT NULL,
        "type" VARCHAR NOT NULL DEFAULT 'manual',
        "created_at" TIMESTAMP DEFAULT NOW()
      )
    `);
    await queryRunner.query(`DELETE FROM "component_mappings" WHERE "type" = 'auto'`);
  };
}
