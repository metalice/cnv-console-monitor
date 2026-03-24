import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';

@Entity('quarantines')
export class Quarantine {
  @Column({ nullable: true, type: 'timestamp' })
  ai_fix_detected_at!: Date | null;

  @Column({ default: false, type: 'boolean' })
  ai_suggested!: boolean;

  @Column({ nullable: true, type: 'varchar' })
  @Index('idx_quarantines_component')
  component!: string | null;

  @CreateDateColumn()
  created_at!: Date;

  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ length: 50, nullable: true, type: 'varchar' })
  jira_key!: string | null;

  @CreateDateColumn()
  quarantined_at!: Date;

  @Column({ type: 'varchar' })
  quarantined_by!: string;

  @Column({ type: 'text' })
  reason!: string;

  @Column({ nullable: true, type: 'uuid' })
  repo_id!: string | null;

  @Column({ nullable: true, type: 'timestamp' })
  resolved_at!: Date | null;

  @Column({ nullable: true, type: 'varchar' })
  resolved_by!: string | null;

  @Column({ length: 512, nullable: true, type: 'varchar' })
  revert_pr_url!: string | null;

  @Column({ default: false, type: 'boolean' })
  rp_defect_updated!: boolean;

  @Column({ nullable: true, type: 'varchar' })
  skip_pr_status!: string | null;

  @Column({ length: 512, nullable: true, type: 'varchar' })
  skip_pr_url!: string | null;

  @Column({ default: 14, type: 'int' })
  sla_days!: number;

  @Column({ type: 'timestamp' })
  @Index('idx_quarantines_sla_deadline')
  sla_deadline!: Date;

  @Column({ default: 'active', type: 'varchar' })
  @Index('idx_quarantines_status')
  status!: string;

  @Column({ length: 1024, nullable: true, type: 'varchar' })
  test_file_path!: string | null;

  @Column({ length: 1024, type: 'varchar' })
  @Index('idx_quarantines_test_name')
  test_name!: string;

  @UpdateDateColumn()
  updated_at!: Date;
}
