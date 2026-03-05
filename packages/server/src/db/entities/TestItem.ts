import { Entity, PrimaryGeneratedColumn, Column, Index, CreateDateColumn } from 'typeorm';

@Entity('test_items')
export class TestItem {
  @PrimaryGeneratedColumn()
  id!: number;

  @Column({ type: 'int', unique: true })
  rp_id!: number;

  @Column({ type: 'int' })
  @Index('idx_test_items_launch')
  launch_rp_id!: number;

  @Column({ type: 'varchar' })
  name!: string;

  @Column({ type: 'varchar' })
  @Index('idx_test_items_status')
  status!: string;

  @Column({ type: 'varchar', nullable: true })
  polarion_id!: string | null;

  @Column({ type: 'varchar', nullable: true })
  defect_type!: string | null;

  @Column({ type: 'text', nullable: true })
  defect_comment!: string | null;

  @Column({ type: 'varchar', nullable: true })
  ai_prediction!: string | null;

  @Column({ type: 'int', nullable: true })
  ai_confidence!: number | null;

  @Column({ type: 'text', nullable: true })
  error_message!: string | null;

  @Column({ type: 'varchar', nullable: true })
  jira_key!: string | null;

  @Column({ type: 'varchar', nullable: true })
  jira_status!: string | null;

  @Column({ type: 'varchar', nullable: true })
  @Index('idx_test_items_unique_id')
  unique_id!: string | null;

  @Column({ type: 'bigint', nullable: true })
  start_time!: number | null;

  @Column({ type: 'bigint', nullable: true })
  end_time!: number | null;

  @CreateDateColumn()
  fetched_at!: Date;
}
