import { Column, CreateDateColumn, Entity, PrimaryColumn } from 'typeorm';

@Entity('component_mappings')
export class ComponentMapping {
  @Column({ type: 'varchar' })
  component!: string;

  @CreateDateColumn()
  created_at!: Date;

  @PrimaryColumn({ type: 'varchar' })
  pattern!: string;

  @Column({ default: 'manual', type: 'varchar' })
  type!: string;
}
