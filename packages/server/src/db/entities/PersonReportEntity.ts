import { Column, Entity, JoinColumn, ManyToOne, PrimaryGeneratedColumn, Unique } from 'typeorm';

import { TeamMemberEntity } from './TeamMemberEntity';
import { WeeklyReportEntity } from './WeeklyReportEntity';

@Entity('person_reports_weekly')
@Unique(['week_id', 'member_id'])
export class PersonReportEntity {
  @Column({ nullable: true, type: 'text' })
  ai_summary!: string | null;

  @Column({ default: '[]', type: 'jsonb' })
  commits!: unknown[];

  @Column({ default: false, type: 'boolean' })
  excluded!: boolean;

  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ default: '[]', type: 'jsonb' })
  jira_tickets!: unknown[];

  @Column({ nullable: true, type: 'text' })
  manager_notes!: string | null;

  @ManyToOne(() => TeamMemberEntity)
  @JoinColumn({ name: 'member_id' })
  member!: TeamMemberEntity;

  @Column({ type: 'uuid' })
  member_id!: string;

  @Column({ default: '[]', type: 'jsonb' })
  prs!: unknown[];

  @ManyToOne(() => WeeklyReportEntity, weeklyReport => weeklyReport.person_reports, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'report_id' })
  report!: WeeklyReportEntity;

  @Column({ nullable: true, type: 'uuid' })
  report_id!: string;

  @Column({ default: 0, type: 'int' })
  sort_order!: number;

  @Column({ default: '{}', type: 'jsonb' })
  stats!: Record<string, number>;

  @Column({ type: 'varchar' })
  week_id!: string;
}
