import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddUsersAndPreferences1709000000006 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "users" (
        "email" VARCHAR PRIMARY KEY,
        "name" VARCHAR NOT NULL,
        "role" VARCHAR NOT NULL DEFAULT 'user',
        "last_login" TIMESTAMP,
        "created_at" TIMESTAMP DEFAULT NOW()
      )
    `);

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "user_preferences" (
        "user_email" VARCHAR PRIMARY KEY,
        "preferences" TEXT NOT NULL DEFAULT '{}',
        "updated_at" TIMESTAMP DEFAULT NOW()
      )
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query('DROP TABLE IF EXISTS "user_preferences"');
    await queryRunner.query('DROP TABLE IF EXISTS "users"');
  }
}
