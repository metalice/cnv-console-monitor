import { Entity, PrimaryGeneratedColumn, Column, Index, CreateDateColumn, Unique } from 'typeorm';

@Entity('repo_files')
@Unique('uq_repo_files_repo_branch_path', ['repo_id', 'branch', 'file_path'])
export class RepoFile {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ type: 'uuid' })
  @Index('idx_repo_files_repo_id')
  repo_id!: string;

  @Column({ type: 'varchar', default: 'main' })
  branch!: string;

  @Column({ type: 'varchar', length: 1024 })
  file_path!: string;

  @Column({ type: 'varchar' })
  @Index('idx_repo_files_file_type')
  file_type!: string;

  @Column({ type: 'varchar' })
  file_name!: string;

  @Column({ type: 'varchar', length: 64, nullable: true })
  content_hash!: string | null;

  @Column({ type: 'jsonb', nullable: true })
  frontmatter!: string | null;

  @Column({ type: 'uuid', nullable: true })
  @Index('idx_repo_files_counterpart_id')
  counterpart_id!: string | null;

  @Column({ type: 'varchar', length: 1024, nullable: true })
  rp_test_name!: string | null;

  @CreateDateColumn()
  last_synced_at!: Date;
}
