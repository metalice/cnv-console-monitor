import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn } from 'typeorm';

@Entity('settings_log')
export class SettingsLog {
  @PrimaryGeneratedColumn()
  id!: number;

  @Column({ type: 'varchar' })
  key!: string;

  @Column({ type: 'text', nullable: true })
  old_value!: string | null;

  @Column({ type: 'text' })
  new_value!: string;

  @Column({ type: 'varchar', nullable: true })
  changed_by!: string | null;

  @CreateDateColumn()
  changed_at!: Date;
}
