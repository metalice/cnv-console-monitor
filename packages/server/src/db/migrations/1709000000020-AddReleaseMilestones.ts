import type { MigrationInterface, QueryRunner } from 'typeorm';

export class AddReleaseMilestones1709000000020 implements MigrationInterface {
  public down = async (queryRunner: QueryRunner): Promise<void> => {
    await queryRunner.query(`DROP TABLE IF EXISTS "release_milestones"`);
  };

  public up = async (queryRunner: QueryRunner): Promise<void> => {
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "release_milestones" (
        "id" SERIAL PRIMARY KEY,
        "version" VARCHAR NOT NULL,
        "milestone_type" VARCHAR NOT NULL,
        "name" VARCHAR NOT NULL,
        "date" DATE NOT NULL,
        "notes" TEXT,
        "created_by" VARCHAR,
        "created_at" TIMESTAMP DEFAULT NOW()
      )
    `);
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS "idx_release_milestones_version" ON "release_milestones" ("version")`,
    );
  };
}
