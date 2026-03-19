import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn } from 'typeorm';

@Entity('pipeline_runs')
export class PipelineRun {
  @PrimaryGeneratedColumn()
  id!: number;

  @Column({ type: 'varchar' })
  run_id!: string;

  @Column({ type: 'timestamp' })
  started_at!: Date;

  @Column({ type: 'timestamp', nullable: true })
  completed_at!: Date | null;

  @Column({ type: 'int', nullable: true })
  duration_ms!: number | null;

  @Column({ type: 'boolean', default: false })
  cancelled!: boolean;

  @Column({ type: 'varchar' })
  trigger!: string;

  @Column({ type: 'jsonb' })
  phases!: Record<string, unknown>;

  @Column({ type: 'text', nullable: true })
  summary!: string | null;

  @Column({ type: 'jsonb', nullable: true })
  log!: Array<{ timestamp: number; phase: string; level: string; message: string }> | null;
}
