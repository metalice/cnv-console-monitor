import type { MigrationInterface, QueryRunner } from 'typeorm';

export class AddFileDrafts1709000000024 implements MigrationInterface {
  public down = async (queryRunner: QueryRunner): Promise<void> => {
    await queryRunner.query(`DROP TABLE IF EXISTS "file_drafts"`);
  };

  public up = async (queryRunner: QueryRunner): Promise<void> => {
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "file_drafts" (
        "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        "user_email" VARCHAR(255) NOT NULL,
        "repo_id" UUID NOT NULL REFERENCES repositories(id) ON DELETE CASCADE,
        "branch" VARCHAR(255) NOT NULL,
        "file_path" VARCHAR(1024) NOT NULL,
        "original_content" TEXT NOT NULL,
        "draft_content" TEXT NOT NULL,
        "base_commit_sha" VARCHAR(40) NOT NULL,
        "status" VARCHAR(20) NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'submitting', 'submitted', 'conflict')),
        "created_at" TIMESTAMP NOT NULL DEFAULT NOW(),
        "updated_at" TIMESTAMP NOT NULL DEFAULT NOW(),
        UNIQUE("user_email", "repo_id", "branch", "file_path")
      )
    `);
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS "idx_file_drafts_user" ON "file_drafts" ("user_email", "status")`,
    );
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS "idx_file_drafts_repo" ON "file_drafts" ("repo_id", "branch")`,
    );
  };
}
