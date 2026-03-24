import { Column, CreateDateColumn, Entity, Index, PrimaryGeneratedColumn } from 'typeorm';

@Entity('edit_activity')
export class EditActivity {
  @Column({ length: 50, type: 'varchar' })
  @Index('idx_edit_activity_action')
  action!: string;

  @Column({ type: 'varchar' })
  @Index('idx_edit_activity_actor')
  actor!: string;

  @CreateDateColumn()
  @Index('idx_edit_activity_created')
  created_at!: Date;

  @Column({ nullable: true, type: 'jsonb' })
  details!: Record<string, unknown> | null;

  @Column({ length: 1024, type: 'varchar' })
  file_path!: string;

  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ nullable: true, type: 'uuid' })
  repo_id!: string | null;
}
