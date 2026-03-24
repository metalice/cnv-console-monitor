import { Column, CreateDateColumn, Entity, Index, PrimaryGeneratedColumn } from 'typeorm';

@Entity('test_items')
export class TestItem {
  @Column({ nullable: true, type: 'int' })
  ai_confidence!: number | null;

  @Column({ nullable: true, type: 'varchar' })
  ai_prediction!: string | null;

  @Column({ nullable: true, type: 'text' })
  defect_comment!: string | null;

  @Column({ nullable: true, type: 'varchar' })
  defect_type!: string | null;

  @Column({ nullable: true, type: 'bigint' })
  end_time!: number | null;

  @Column({ nullable: true, type: 'text' })
  error_message!: string | null;

  @CreateDateColumn()
  fetched_at!: Date;

  @PrimaryGeneratedColumn()
  id!: number;

  @Column({ nullable: true, type: 'varchar' })
  jira_key!: string | null;

  @Column({ nullable: true, type: 'varchar' })
  jira_status!: string | null;

  @Column({ type: 'int' })
  @Index('idx_test_items_launch')
  launch_rp_id!: number;

  @Column({ type: 'varchar' })
  name!: string;

  @Column({ nullable: true, type: 'varchar' })
  polarion_id!: string | null;

  @Column({ type: 'int', unique: true })
  rp_id!: number;

  @Column({ nullable: true, type: 'bigint' })
  start_time!: number | null;

  @Column({ type: 'varchar' })
  @Index('idx_test_items_status')
  status!: string;

  @Column({ nullable: true, type: 'varchar' })
  @Index('idx_test_items_unique_id')
  unique_id!: string | null;
}
