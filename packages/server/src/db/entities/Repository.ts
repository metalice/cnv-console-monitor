import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';

@Entity('repositories')
export class Repository {
  @Column({ length: 512, type: 'varchar' })
  api_base_url!: string;

  @Column({ default: '["main"]', type: 'jsonb' })
  branches!: string;

  @Column({ default: 5, type: 'int' })
  cache_ttl_min!: number;

  @Column({ default: '[]', type: 'jsonb' })
  components!: string;

  @CreateDateColumn()
  created_at!: Date;

  @Column({ default: '[]', type: 'jsonb' })
  doc_paths!: string;

  @Column({ default: true, type: 'boolean' })
  @Index('idx_repositories_enabled')
  enabled!: boolean;

  @Column({ nullable: true, type: 'jsonb' })
  frontmatter_schema!: string | null;

  @Column({ type: 'varchar' })
  global_token_key!: string;

  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ type: 'varchar' })
  name!: string;

  @Column({ type: 'varchar' })
  project_id!: string;

  @Column({ type: 'varchar' })
  @Index('idx_repositories_provider')
  provider!: string;

  @Column({ default: '[]', nullable: true, type: 'jsonb' })
  skip_annotations!: string | null;

  @Column({ default: '[]', type: 'jsonb' })
  test_paths!: string;

  @UpdateDateColumn()
  updated_at!: Date;

  @Column({ length: 512, type: 'varchar' })
  url!: string;

  @Column({ nullable: true, type: 'varchar' })
  webhook_secret!: string | null;
}
