import { Column, CreateDateColumn, Entity, Index, PrimaryGeneratedColumn } from 'typeorm';

@Entity('quarantine_log')
export class QuarantineLog {
  @Column({ type: 'varchar' })
  action!: string;

  @Column({ nullable: true, type: 'varchar' })
  actor!: string | null;

  @CreateDateColumn()
  created_at!: Date;

  @Column({ nullable: true, type: 'jsonb' })
  details!: string | null;

  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ type: 'uuid' })
  @Index('idx_quarantine_log_quarantine_id')
  quarantine_id!: string;
}
