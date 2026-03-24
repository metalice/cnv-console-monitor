import type { MigrationInterface, QueryRunner } from 'typeorm';

export class AddAICorrections1709000000022 implements MigrationInterface {
  public down = async (queryRunner: QueryRunner): Promise<void> => {
    await queryRunner.query(`DROP TABLE IF EXISTS "ai_corrections"`);
  };

  public up = async (queryRunner: QueryRunner): Promise<void> => {
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "ai_corrections" (
        "id" SERIAL PRIMARY KEY,
        "issue_key" VARCHAR NOT NULL,
        "field" VARCHAR NOT NULL,
        "ai_value" VARCHAR NOT NULL,
        "human_value" VARCHAR NOT NULL,
        "context" TEXT,
        "performed_by" VARCHAR,
        "created_at" TIMESTAMP DEFAULT NOW()
      )
    `);
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS "idx_ai_corrections_issue" ON "ai_corrections" ("issue_key")`,
    );
  };
}
