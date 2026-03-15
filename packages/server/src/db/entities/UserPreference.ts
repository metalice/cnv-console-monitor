import { Entity, PrimaryColumn, Column, UpdateDateColumn } from 'typeorm';

@Entity('user_preferences')
export class UserPreference {
  @PrimaryColumn({ type: 'varchar' })
  user_email!: string;

  @Column({ type: 'text', default: '{}' })
  preferences!: string;

  @UpdateDateColumn()
  updated_at!: Date;
}
