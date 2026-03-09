import { Entity, PrimaryColumn, Column, UpdateDateColumn } from 'typeorm';

@Entity('settings')
export class Setting {
  @PrimaryColumn({ type: 'varchar' })
  key!: string;

  @Column({ type: 'text' })
  value!: string;

  @Column({ type: 'varchar', nullable: true })
  updated_by!: string | null;

  @UpdateDateColumn()
  updated_at!: Date;
}
