import { Entity, PrimaryGeneratedColumn, Column, Index, CreateDateColumn } from 'typeorm';

@Entity('quarantine_log')
export class QuarantineLog {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ type: 'uuid' })
  @Index('idx_quarantine_log_quarantine_id')
  quarantine_id!: string;

  @Column({ type: 'varchar' })
  action!: string;

  @Column({ type: 'varchar', nullable: true })
  actor!: string | null;

  @Column({ type: 'jsonb', nullable: true })
  details!: string | null;

  @CreateDateColumn()
  created_at!: Date;
}
