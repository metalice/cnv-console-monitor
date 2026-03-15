import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn } from 'typeorm';

@Entity('acknowledgments')
export class Acknowledgment {
  @PrimaryGeneratedColumn()
  id!: number;

  @Column({ type: 'varchar' })
  date!: string;

  @Column({ type: 'varchar' })
  reviewer!: string;

  @Column({ type: 'text', nullable: true })
  notes!: string | null;

  @Column({ type: 'varchar', nullable: true })
  component!: string | null;

  @CreateDateColumn()
  acknowledged_at!: Date;
}
