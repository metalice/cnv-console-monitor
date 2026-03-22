import { Entity, PrimaryGeneratedColumn, Column, Index, CreateDateColumn, UpdateDateColumn } from 'typeorm';

@Entity('quarantines')
export class Quarantine {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ type: 'varchar', length: 1024 })
  @Index('idx_quarantines_test_name')
  test_name!: string;

  @Column({ type: 'varchar', length: 1024, nullable: true })
  test_file_path!: string | null;

  @Column({ type: 'uuid', nullable: true })
  repo_id!: string | null;

  @Column({ type: 'varchar', nullable: true })
  @Index('idx_quarantines_component')
  component!: string | null;

  @Column({ type: 'varchar', default: 'active' })
  @Index('idx_quarantines_status')
  status!: string;

  @Column({ type: 'text' })
  reason!: string;

  @Column({ type: 'varchar' })
  quarantined_by!: string;

  @CreateDateColumn()
  quarantined_at!: Date;

  @Column({ type: 'timestamp', nullable: true })
  resolved_at!: Date | null;

  @Column({ type: 'varchar', nullable: true })
  resolved_by!: string | null;

  @Column({ type: 'int', default: 14 })
  sla_days!: number;

  @Column({ type: 'timestamp' })
  @Index('idx_quarantines_sla_deadline')
  sla_deadline!: Date;

  @Column({ type: 'varchar', length: 50, nullable: true })
  jira_key!: string | null;

  @Column({ type: 'boolean', default: false })
  rp_defect_updated!: boolean;

  @Column({ type: 'varchar', length: 512, nullable: true })
  skip_pr_url!: string | null;

  @Column({ type: 'varchar', nullable: true })
  skip_pr_status!: string | null;

  @Column({ type: 'varchar', length: 512, nullable: true })
  revert_pr_url!: string | null;

  @Column({ type: 'boolean', default: false })
  ai_suggested!: boolean;

  @Column({ type: 'timestamp', nullable: true })
  ai_fix_detected_at!: Date | null;

  @CreateDateColumn()
  created_at!: Date;

  @UpdateDateColumn()
  updated_at!: Date;
}
