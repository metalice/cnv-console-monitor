import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, Index, Unique } from 'typeorm';

@Entity('file_drafts')
@Unique(['user_email', 'repo_id', 'branch', 'file_path'])
export class FileDraft {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ type: 'varchar' })
  @Index('idx_file_drafts_user')
  user_email!: string;

  @Column({ type: 'uuid' })
  @Index('idx_file_drafts_repo')
  repo_id!: string;

  @Column({ type: 'varchar' })
  branch!: string;

  @Column({ type: 'varchar', length: 1024 })
  file_path!: string;

  @Column({ type: 'text' })
  original_content!: string;

  @Column({ type: 'text' })
  draft_content!: string;

  @Column({ type: 'varchar', length: 40 })
  base_commit_sha!: string;

  @Column({ type: 'varchar', length: 20, default: 'pending' })
  status!: string;

  @CreateDateColumn()
  created_at!: Date;

  @UpdateDateColumn()
  updated_at!: Date;
}
