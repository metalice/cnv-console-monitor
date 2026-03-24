import { type MigrationInterface, type QueryRunner } from 'typeorm';

export class AddJenkinsMetadataAndStatus1709000000013 implements MigrationInterface {
  public down = async (queryRunner: QueryRunner): Promise<void> => {
    await queryRunner.query(`DROP INDEX IF EXISTS "idx_launches_jenkins_status"`);
    await queryRunner.query(`ALTER TABLE "launches" DROP COLUMN IF EXISTS "jenkins_metadata"`);
    await queryRunner.query(`ALTER TABLE "launches" DROP COLUMN IF EXISTS "jenkins_status"`);
  };

  public up = async (queryRunner: QueryRunner): Promise<void> => {
    await queryRunner.query(
      `ALTER TABLE "launches" ADD COLUMN IF NOT EXISTS "jenkins_metadata" JSONB`,
    );
    await queryRunner.query(
      `ALTER TABLE "launches" ADD COLUMN IF NOT EXISTS "jenkins_status" VARCHAR DEFAULT 'pending'`,
    );
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS "idx_launches_jenkins_status" ON "launches" ("jenkins_status")`,
    );
  };
}
