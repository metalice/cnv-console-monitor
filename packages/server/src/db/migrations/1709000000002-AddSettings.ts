import { type MigrationInterface, type QueryRunner } from 'typeorm';

export class AddSettings1709000000002 implements MigrationInterface {
  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query('DROP TABLE IF EXISTS "settings"');
  }

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "settings" (
        "key" VARCHAR PRIMARY KEY,
        "value" TEXT NOT NULL,
        "updated_by" VARCHAR,
        "updated_at" TIMESTAMP DEFAULT NOW()
      )
    `);
  }
}
