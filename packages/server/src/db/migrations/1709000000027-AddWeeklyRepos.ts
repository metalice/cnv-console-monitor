import { type MigrationInterface, type QueryRunner } from 'typeorm';

export class AddWeeklyRepos1709000000027 implements MigrationInterface {
  name = 'AddWeeklyRepos1709000000027';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE IF EXISTS "weekly_repos"`);

    await queryRunner.query(`
      CREATE TABLE "weekly_repos" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "name" varchar NOT NULL,
        "component" varchar NOT NULL,
        "provider" varchar NOT NULL,
        "url" varchar NOT NULL,
        "enabled" boolean NOT NULL DEFAULT true,
        "created_at" TIMESTAMP NOT NULL DEFAULT now(),
        "updated_at" TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "PK_weekly_repos" PRIMARY KEY ("id")
      )
    `);

    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS "idx_weekly_repos_component" ON "weekly_repos" ("component")`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE IF EXISTS "weekly_repos"`);
  }
}
