import { Entity, PrimaryColumn, Column, CreateDateColumn } from 'typeorm';

@Entity('ai_cache')
export class AICache {
  @PrimaryColumn({ type: 'varchar' })
  prompt_hash!: string;

  @Column({ type: 'varchar' })
  model!: string;

  @Column({ type: 'varchar' })
  provider!: string;

  @Column({ type: 'text' })
  response!: string;

  @Column({ type: 'int', default: 0 })
  tokens_used!: number;

  @Column({ type: 'bigint' })
  expires_at!: number;

  @CreateDateColumn()
  created_at!: Date;
}
