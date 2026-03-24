import { Column, Entity, PrimaryColumn, UpdateDateColumn } from 'typeorm';

@Entity('user_preferences')
export class UserPreference {
  @Column({ default: '{}', type: 'text' })
  preferences!: string;

  @UpdateDateColumn()
  updated_at!: Date;

  @PrimaryColumn({ type: 'varchar' })
  user_email!: string;
}
