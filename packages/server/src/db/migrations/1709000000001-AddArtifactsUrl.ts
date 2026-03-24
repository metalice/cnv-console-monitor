import { type MigrationInterface, type QueryRunner } from 'typeorm';

export class AddArtifactsUrl1709000000001 implements MigrationInterface {
  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "launches" DROP COLUMN IF EXISTS "artifacts_url"`);
  }

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "launches" ADD COLUMN IF NOT EXISTS "artifacts_url" VARCHAR`,
    );
  }
}
