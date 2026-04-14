import {
  Column,
  CreateDateColumn,
  Entity,
  OneToMany,
  PrimaryColumn,
  UpdateDateColumn,
} from 'typeorm';

import { PersonReportEntity } from './PersonReportEntity';

@Entity('weekly_reports')
export class WeeklyReportEntity {
  @Column({ default: '', type: 'varchar' })
  component!: string;

  @CreateDateColumn()
  created_at!: Date;

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

  @PrimaryColumn({ type: 'varchar' })
  week_id!: string;

  @Column({ type: 'date' })
  week_start!: Date;
}
