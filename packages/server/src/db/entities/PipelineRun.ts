import { Column, Entity, PrimaryGeneratedColumn } from 'typeorm';

@Entity('pipeline_runs')
export class PipelineRun {
  @Column({ default: false, type: 'boolean' })
  cancelled!: boolean;

  @Column({ nullable: true, type: 'timestamp' })
  completed_at!: Date | null;

  @Column({ nullable: true, type: 'int' })
  duration_ms!: number | null;

  @PrimaryGeneratedColumn()
  id!: number;

  @Column({ nullable: true, type: 'jsonb' })
  log!: { timestamp: number; phase: string; level: string; message: string }[] | null;

  @Column({ type: 'jsonb' })
  phases!: Record<string, unknown>;

  @Column({ type: 'varchar' })
  run_id!: string;

  @Column({ type: 'timestamp' })
  started_at!: Date;

  @Column({ nullable: true, type: 'text' })
  summary!: string | null;

  @Column({ type: 'varchar' })
  trigger!: string;
}
