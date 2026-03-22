import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn } from 'typeorm';

@Entity('ai_corrections')
export class AICorrection {
  @PrimaryGeneratedColumn()
  id!: number;

  @Column({ type: 'varchar' })
  issue_key!: string;

  @Column({ type: 'varchar' })
  field!: string;

  @Column({ type: 'varchar' })
  ai_value!: string;

  @Column({ type: 'varchar' })
  human_value!: string;

  @Column({ type: 'text', nullable: true })
  context!: string | null;

  @Column({ type: 'varchar', nullable: true })
  performed_by!: string | null;

  @CreateDateColumn()
  created_at!: Date;
}
