import {
  Column,
  CreateDateColumn,
  Entity,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';

@Entity('team_members_weekly')
export class TeamMemberEntity {
  @Column({ default: false, type: 'boolean' })
  ai_mapped!: boolean;

  @Column({ nullable: true, type: 'varchar' })
  component!: string | null;

  @CreateDateColumn()
  created_at!: Date;

  @Column({ type: 'varchar' })
  display_name!: string;

  @Column({ nullable: true, type: 'varchar' })
  email!: string | null;

  @Column({ nullable: true, type: 'varchar' })
  github_username!: string | null;

  @Column({ nullable: true, type: 'varchar' })
  gitlab_username!: string | null;

  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ default: true, type: 'boolean' })
  is_active!: boolean;

  @Column({ nullable: true, type: 'varchar' })
  jira_account_id!: string | null;

  @Column({ nullable: true, type: 'float' })
  mapping_confidence!: number | null;

  @UpdateDateColumn()
  updated_at!: Date;
}
