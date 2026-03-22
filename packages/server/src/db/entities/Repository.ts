import { Entity, PrimaryGeneratedColumn, Column, Index, CreateDateColumn, UpdateDateColumn } from 'typeorm';

@Entity('repositories')
export class Repository {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ type: 'varchar' })
  name!: string;

  @Column({ type: 'varchar' })
  @Index('idx_repositories_provider')
  provider!: string;

  @Column({ type: 'varchar', length: 512 })
  url!: string;

  @Column({ type: 'varchar', length: 512 })
  api_base_url!: string;

  @Column({ type: 'varchar' })
  project_id!: string;

  @Column({ type: 'jsonb', default: '["main"]' })
  branches!: string;

  @Column({ type: 'varchar' })
  global_token_key!: string;

  @Column({ type: 'jsonb', default: '[]' })
  doc_paths!: string;

  @Column({ type: 'jsonb', default: '[]' })
  test_paths!: string;

  @Column({ type: 'jsonb', nullable: true })
  frontmatter_schema!: string | null;

  @Column({ type: 'jsonb', default: '[]' })
  components!: string;

  @Column({ type: 'int', default: 5 })
  cache_ttl_min!: number;

  @Column({ type: 'varchar', nullable: true })
  webhook_secret!: string | null;

  @Column({ type: 'jsonb', nullable: true, default: '[]' })
  skip_annotations!: string | null;

  @Column({ type: 'boolean', default: true })
  @Index('idx_repositories_enabled')
  enabled!: boolean;

  @CreateDateColumn()
  created_at!: Date;

  @UpdateDateColumn()
  updated_at!: Date;
}
