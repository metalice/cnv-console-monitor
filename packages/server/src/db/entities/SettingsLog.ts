import { Column, CreateDateColumn, Entity, PrimaryGeneratedColumn } from 'typeorm';

@Entity('settings_log')
export class SettingsLog {
  @CreateDateColumn()
  changed_at!: Date;

  @Column({ nullable: true, type: 'varchar' })
  changed_by!: string | null;

  @PrimaryGeneratedColumn()
  id!: number;

  @Column({ type: 'varchar' })
  key!: string;

  @Column({ type: 'text' })
  new_value!: string;

  @Column({ nullable: true, type: 'text' })
  old_value!: string | null;
}
