import type { MigrationInterface, QueryRunner } from 'typeorm';

export class AddAICache1709000000021 implements MigrationInterface {
  public up = async (queryRunner: QueryRunner): Promise<void> => {
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "ai_cache" (
        "prompt_hash" VARCHAR PRIMARY KEY,
        "model" VARCHAR NOT NULL,
        "provider" VARCHAR NOT NULL,
        "response" TEXT NOT NULL,
        "tokens_used" INT DEFAULT 0,
        "expires_at" BIGINT NOT NULL,
        "created_at" TIMESTAMP DEFAULT NOW()
      )
    `);
  };

  public down = async (queryRunner: QueryRunner): Promise<void> => {
    await queryRunner.query(`DROP TABLE IF EXISTS "ai_cache"`);
  };
}
