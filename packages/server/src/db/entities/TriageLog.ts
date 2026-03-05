import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn } from 'typeorm';

@Entity('triage_log')
export class TriageLog {
  @PrimaryGeneratedColumn()
  id!: number;

  @Column({ type: 'int' })
  test_item_rp_id!: number;

  @Column({ type: 'varchar' })
  action!: string;

  @Column({ type: 'text', nullable: true })
  old_value!: string | null;

  @Column({ type: 'text', nullable: true })
  new_value!: string | null;

  @Column({ type: 'varchar', nullable: true })
  performed_by!: string | null;

  @CreateDateColumn()
  performed_at!: Date;
}
