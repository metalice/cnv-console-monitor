import { Column, CreateDateColumn, Entity, PrimaryColumn } from 'typeorm';

@Entity('ai_cache')
export class AICache {
  @CreateDateColumn()
  created_at!: Date;

  @Column({ type: 'bigint' })
  expires_at!: number;

  @Column({ type: 'varchar' })
  model!: string;

  @PrimaryColumn({ type: 'varchar' })
  prompt_hash!: string;

  @Column({ type: 'varchar' })
  provider!: string;

  @Column({ type: 'text' })
  response!: string;

  @Column({ default: 0, type: 'int' })
  tokens_used!: number;
}
