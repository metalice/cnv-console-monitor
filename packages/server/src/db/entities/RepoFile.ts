import { Column, CreateDateColumn, Entity, Index, PrimaryGeneratedColumn, Unique } from 'typeorm';

@Entity('repo_files')
@Unique('uq_repo_files_repo_branch_path', ['repo_id', 'branch', 'file_path'])
export class RepoFile {
  @Column({ default: 'main', type: 'varchar' })
  branch!: string;

  @Column({ length: 64, nullable: true, type: 'varchar' })
  content_hash!: string | null;

  @Column({ nullable: true, type: 'uuid' })
  @Index('idx_repo_files_counterpart_id')
  counterpart_id!: string | null;

  @Column({ type: 'varchar' })
  file_name!: string;

  @Column({ length: 1024, type: 'varchar' })
  file_path!: string;

  @Column({ type: 'varchar' })
  @Index('idx_repo_files_file_type')
  file_type!: string;

  @Column({ nullable: true, type: 'jsonb' })
  frontmatter!: string | null;

  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @CreateDateColumn()
  last_synced_at!: Date;

  @Column({ type: 'uuid' })
  @Index('idx_repo_files_repo_id')
  repo_id!: string;

  @Column({ length: 1024, nullable: true, type: 'varchar' })
  rp_test_name!: string | null;
}
