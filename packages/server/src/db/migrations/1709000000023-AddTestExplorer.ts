import type { MigrationInterface, QueryRunner } from 'typeorm';

export class AddTestExplorer1709000000023 implements MigrationInterface {
  public down = async (queryRunner: QueryRunner): Promise<void> => {
    await queryRunner.query(`DROP TABLE IF EXISTS "quarantine_log"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "user_tokens"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "quarantines"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "repo_files"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "repositories"`);
  };

  public up = async (queryRunner: QueryRunner): Promise<void> => {
    // Repositories table
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "repositories" (
        "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        "name" VARCHAR(255) NOT NULL,
        "provider" VARCHAR(10) NOT NULL CHECK (provider IN ('gitlab', 'github')),
        "url" VARCHAR(512) NOT NULL,
        "api_base_url" VARCHAR(512) NOT NULL,
        "project_id" VARCHAR(255) NOT NULL,
        "branches" JSONB NOT NULL DEFAULT '["main"]',
        "global_token_key" VARCHAR(100) NOT NULL,
        "doc_paths" JSONB NOT NULL DEFAULT '[]',
        "test_paths" JSONB NOT NULL DEFAULT '[]',
        "frontmatter_schema" JSONB,
        "components" JSONB NOT NULL DEFAULT '[]',
        "cache_ttl_min" INTEGER NOT NULL DEFAULT 5,
        "webhook_secret" VARCHAR(255),
        "skip_annotations" JSONB DEFAULT '[]',
        "enabled" BOOLEAN NOT NULL DEFAULT true,
        "created_at" TIMESTAMP NOT NULL DEFAULT NOW(),
        "updated_at" TIMESTAMP NOT NULL DEFAULT NOW(),
        UNIQUE("provider", "project_id")
      )
    `);

    // Repo_files table
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "repo_files" (
        "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        "repo_id" UUID NOT NULL REFERENCES repositories(id) ON DELETE CASCADE,
        "branch" VARCHAR(100) NOT NULL DEFAULT 'main',
        "file_path" VARCHAR(1024) NOT NULL,
        "file_type" VARCHAR(10) NOT NULL CHECK (file_type IN ('doc', 'test', 'other')),
        "file_name" VARCHAR(255) NOT NULL,
        "content_hash" VARCHAR(64),
        "frontmatter" JSONB,
        "counterpart_id" UUID REFERENCES repo_files(id),
        "rp_test_name" VARCHAR(1024),
        "last_synced_at" TIMESTAMP NOT NULL DEFAULT NOW(),
        UNIQUE("repo_id", "branch", "file_path")
      )
    `);

    // Quarantines table
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "quarantines" (
        "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        "test_name" VARCHAR(1024) NOT NULL,
        "test_file_path" VARCHAR(1024),
        "repo_id" UUID REFERENCES repositories(id),
        "component" VARCHAR(255),
        "status" VARCHAR(20) NOT NULL DEFAULT 'active' CHECK (status IN ('proposed', 'active', 'overdue', 'expired', 'resolved')),
        "reason" TEXT NOT NULL,
        "quarantined_by" VARCHAR(255) NOT NULL,
        "quarantined_at" TIMESTAMP NOT NULL DEFAULT NOW(),
        "resolved_at" TIMESTAMP,
        "resolved_by" VARCHAR(255),
        "sla_days" INTEGER NOT NULL DEFAULT 14,
        "sla_deadline" TIMESTAMP NOT NULL,
        "jira_key" VARCHAR(50),
        "rp_defect_updated" BOOLEAN NOT NULL DEFAULT false,
        "skip_pr_url" VARCHAR(512),
        "skip_pr_status" VARCHAR(20) CHECK (skip_pr_status IN ('pending', 'merged', 'closed')),
        "revert_pr_url" VARCHAR(512),
        "ai_suggested" BOOLEAN NOT NULL DEFAULT false,
        "ai_fix_detected_at" TIMESTAMP,
        "created_at" TIMESTAMP NOT NULL DEFAULT NOW(),
        "updated_at" TIMESTAMP NOT NULL DEFAULT NOW()
      )
    `);

    // Quarantine_log table
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "quarantine_log" (
        "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        "quarantine_id" UUID NOT NULL REFERENCES quarantines(id) ON DELETE CASCADE,
        "action" VARCHAR(50) NOT NULL,
        "actor" VARCHAR(255),
        "details" JSONB,
        "created_at" TIMESTAMP NOT NULL DEFAULT NOW()
      )
    `);

    // User_tokens table
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "user_tokens" (
        "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        "user_email" VARCHAR(255) NOT NULL,
        "provider" VARCHAR(10) NOT NULL CHECK (provider IN ('gitlab', 'github', 'jira')),
        "encrypted_token" TEXT NOT NULL,
        "provider_username" VARCHAR(255),
        "provider_email" VARCHAR(255),
        "validated_at" TIMESTAMP,
        "is_valid" BOOLEAN NOT NULL DEFAULT true,
        "created_at" TIMESTAMP NOT NULL DEFAULT NOW(),
        "updated_at" TIMESTAMP NOT NULL DEFAULT NOW(),
        UNIQUE("user_email", "provider")
      )
    `);

    // Indexes
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS "idx_repositories_provider" ON "repositories" ("provider")`,
    );
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS "idx_repositories_enabled" ON "repositories" ("enabled")`,
    );
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS "idx_repo_files_repo" ON "repo_files" ("repo_id")`,
    );
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS "idx_repo_files_type" ON "repo_files" ("file_type")`,
    );
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS "idx_repo_files_counterpart" ON "repo_files" ("counterpart_id")`,
    );
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS "idx_quarantines_status" ON "quarantines" ("status")`,
    );
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS "idx_quarantines_component" ON "quarantines" ("component")`,
    );
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS "idx_quarantines_test" ON "quarantines" ("test_name")`,
    );
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS "idx_quarantines_sla" ON "quarantines" ("sla_deadline") WHERE status = 'active'`,
    );
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS "idx_quarantine_log_qid" ON "quarantine_log" ("quarantine_id")`,
    );
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS "idx_user_tokens_user" ON "user_tokens" ("user_email")`,
    );
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS "idx_user_tokens_provider" ON "user_tokens" ("provider")`,
    );
  };
}
