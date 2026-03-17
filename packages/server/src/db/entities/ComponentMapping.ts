import { Entity, Column, PrimaryColumn, CreateDateColumn } from 'typeorm';

@Entity('component_mappings')
export class ComponentMapping {
  @PrimaryColumn({ type: 'varchar' })
  pattern!: string;

  @Column({ type: 'varchar' })
  component!: string;

  @Column({ type: 'varchar', default: 'manual' })
  type!: string;

  @CreateDateColumn()
  created_at!: Date;
}
