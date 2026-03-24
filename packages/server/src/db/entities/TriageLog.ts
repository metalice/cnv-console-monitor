import { Column, CreateDateColumn, Entity, PrimaryGeneratedColumn } from 'typeorm';

@Entity('triage_log')
export class TriageLog {
  @Column({ type: 'varchar' })
  action!: string;

  @Column({ nullable: true, type: 'varchar' })
  component!: string | null;

  @PrimaryGeneratedColumn()
  id!: number;

  @Column({ nullable: true, type: 'text' })
  new_value!: string | null;

  @Column({ nullable: true, type: 'text' })
  old_value!: string | null;

  @CreateDateColumn()
  performed_at!: Date;

  @Column({ nullable: true, type: 'varchar' })
  performed_by!: string | null;

  @Column({ nullable: true, type: 'text' })
  pin_note!: string | null;

  @Column({ default: false, type: 'boolean' })
  pinned!: boolean;

  @Column({ type: 'int' })
  test_item_rp_id!: number;
}
