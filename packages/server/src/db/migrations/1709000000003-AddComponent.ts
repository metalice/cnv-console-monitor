import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddComponent1709000000003 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "launches" ADD COLUMN IF NOT EXISTS "component" VARCHAR`);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS "idx_launches_component" ON "launches" ("component")`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX IF EXISTS "idx_launches_component"`);
    await queryRunner.query(`ALTER TABLE "launches" DROP COLUMN IF EXISTS "component"`);
  }
}
