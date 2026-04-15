import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  OneToMany,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';

import { PersonReportEntity } from './PersonReportEntity';

@Entity('weekly_reports')
@Index('idx_weekly_reports_week_component', ['week_id', 'component'], { unique: true })
export class WeeklyReportEntity {
  @Column({ nullable: true, type: 'jsonb' })
  aggregate_stats!: Record<string, unknown> | null;

  @Column({ default: '', type: 'varchar' })
  component!: string;

  @CreateDateColumn()
  created_at!: Date;

  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ nullable: true, type: 'text' })
  manager_highlights!: string | null;

  @OneToMany(() => PersonReportEntity, pr => pr.report)
  person_reports!: PersonReportEntity[];

  @Column({ nullable: true, type: 'timestamp' })
  sent_at!: Date | null;

  @Column({ default: 'DRAFT', type: 'varchar' })
  state!: string;

  @Column({ nullable: true, type: 'jsonb' })
  task_summary!: Record<string, unknown> | null;

  @UpdateDateColumn()
  updated_at!: Date;

  @Column({ nullable: true, type: 'text' })
  warnings!: string | null;

  @Column({ type: 'date' })
  week_end!: Date;

  @Column({ type: 'varchar' })
  week_id!: string;

  @Column({ type: 'date' })
  week_start!: Date;
}
