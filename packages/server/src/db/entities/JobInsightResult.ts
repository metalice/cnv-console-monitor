import { Column, CreateDateColumn, Entity, Index, PrimaryGeneratedColumn } from 'typeorm';

@Entity('job_insight_results')
export class JobInsightResult {
  @Column({ type: 'varchar' })
  ai_model!: string;

  @Column({ type: 'varchar' })
  ai_provider!: string;

  @Column({ type: 'int' })
  build_number!: number;

  @Column({ nullable: true, type: 'timestamp' })
  completed_at!: Date | null;

  @CreateDateColumn()
  created_at!: Date;

  @PrimaryGeneratedColumn()
  id!: number;

  @Column({ type: 'varchar', unique: true })
  @Index('idx_job_insight_job_id')
  job_id!: string;

  @Column({ type: 'varchar' })
  job_name!: string;

  @Column({ type: 'int' })
  @Index('idx_job_insight_launch_rp_id')
  launch_rp_id!: number;

  @Column({ nullable: true, type: 'jsonb' })
  result!: Record<string, unknown> | null;

  @Column({ default: 'queued', type: 'varchar' })
  @Index('idx_job_insight_status')
  status!: string;

  @Column({ type: 'varchar' })
  triggered_by!: string;
}
