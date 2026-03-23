import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, Index } from 'typeorm';

@Entity('edit_activity')
export class EditActivity {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ type: 'varchar' })
  @Index('idx_edit_activity_actor')
  actor!: string;

  @Column({ type: 'varchar', length: 50 })
  @Index('idx_edit_activity_action')
  action!: string;

  @Column({ type: 'varchar', length: 1024 })
  file_path!: string;

  @Column({ type: 'uuid', nullable: true })
  repo_id!: string | null;

  @Column({ type: 'jsonb', nullable: true })
  details!: Record<string, unknown> | null;

  @CreateDateColumn()
  @Index('idx_edit_activity_created')
  created_at!: Date;
}
