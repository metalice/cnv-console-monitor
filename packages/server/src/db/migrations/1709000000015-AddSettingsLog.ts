import { type MigrationInterface, type QueryRunner } from 'typeorm';

export class AddSettingsLog1709000000015 implements MigrationInterface {
  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE IF EXISTS "settings_log"`);
  }

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "settings_log" (
        "id" SERIAL PRIMARY KEY,
        "key" varchar NOT NULL,
        "old_value" text,
        "new_value" text NOT NULL,
        "changed_by" varchar,
        "changed_at" TIMESTAMP DEFAULT now()
      )
    `);
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS "idx_settings_log_changed_at" ON "settings_log" ("changed_at" DESC)`,
    );
  }
}
