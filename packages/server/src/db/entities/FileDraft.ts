import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  PrimaryGeneratedColumn,
  Unique,
  UpdateDateColumn,
} from 'typeorm';

@Entity('file_drafts')
@Unique(['user_email', 'repo_id', 'branch', 'file_path'])
export class FileDraft {
  @Column({ length: 40, type: 'varchar' })
  base_commit_sha!: string;

  @Column({ type: 'varchar' })
  branch!: string;

  @CreateDateColumn()
  created_at!: Date;

  @Column({ type: 'text' })
  draft_content!: string;

  @Column({ length: 1024, type: 'varchar' })
  file_path!: string;

  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ type: 'text' })
  original_content!: string;

  @Column({ type: 'uuid' })
  @Index('idx_file_drafts_repo')
  repo_id!: string;

  @Column({ default: 'pending', length: 20, type: 'varchar' })
  status!: string;

  @UpdateDateColumn()
  updated_at!: Date;

  @Column({ type: 'varchar' })
  @Index('idx_file_drafts_user')
  user_email!: string;
}
