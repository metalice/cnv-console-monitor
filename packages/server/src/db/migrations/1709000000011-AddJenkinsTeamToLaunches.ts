import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddJenkinsTeamToLaunches1709000000011 implements MigrationInterface {
  public up = async (queryRunner: QueryRunner): Promise<void> => {
    await queryRunner.query(`ALTER TABLE "launches" ADD COLUMN IF NOT EXISTS "jenkins_team" VARCHAR`);
  };

  public down = async (queryRunner: QueryRunner): Promise<void> => {
    await queryRunner.query(`ALTER TABLE "launches" DROP COLUMN IF EXISTS "jenkins_team"`);
  };
}
