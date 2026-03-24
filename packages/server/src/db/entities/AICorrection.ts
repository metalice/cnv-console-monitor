import { Column, CreateDateColumn, Entity, PrimaryGeneratedColumn } from 'typeorm';

@Entity('ai_corrections')
export class AICorrection {
  @Column({ type: 'varchar' })
  ai_value!: string;

  @Column({ nullable: true, type: 'text' })
  context!: string | null;

  @CreateDateColumn()
  created_at!: Date;

  @Column({ type: 'varchar' })
  field!: string;

  @Column({ type: 'varchar' })
  human_value!: string;

  @PrimaryGeneratedColumn()
  id!: number;

  @Column({ type: 'varchar' })
  issue_key!: string;

  @Column({ nullable: true, type: 'varchar' })
  performed_by!: string | null;
}
