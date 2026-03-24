import { Column, Entity, PrimaryColumn, UpdateDateColumn } from 'typeorm';

@Entity('settings')
export class Setting {
  @PrimaryColumn({ type: 'varchar' })
  key!: string;

  @UpdateDateColumn()
  updated_at!: Date;

  @Column({ nullable: true, type: 'varchar' })
  updated_by!: string | null;

  @Column({ type: 'text' })
  value!: string;
}
