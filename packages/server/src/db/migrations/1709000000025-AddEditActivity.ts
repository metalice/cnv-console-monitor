import type { MigrationInterface, QueryRunner } from 'typeorm';

export class AddEditActivity1709000000025 implements MigrationInterface {
  public down = async (queryRunner: QueryRunner): Promise<void> => {
    await queryRunner.query(`DROP TABLE IF EXISTS "edit_activity"`);
  };

  public up = async (queryRunner: QueryRunner): Promise<void> => {
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "edit_activity" (
        "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        "actor" VARCHAR(255) NOT NULL,
        "action" VARCHAR(50) NOT NULL,
        "file_path" VARCHAR(1024) NOT NULL,
        "repo_id" UUID REFERENCES repositories(id) ON DELETE SET NULL,
        "details" JSONB,
        "created_at" TIMESTAMP NOT NULL DEFAULT NOW()
      )
    `);
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS "idx_edit_activity_actor" ON "edit_activity" ("actor", "created_at" DESC)`,
    );
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS "idx_edit_activity_action" ON "edit_activity" ("action")`,
    );
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS "idx_edit_activity_created" ON "edit_activity" ("created_at" DESC)`,
    );
  };
}
