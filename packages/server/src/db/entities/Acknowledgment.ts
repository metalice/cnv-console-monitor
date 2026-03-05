import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, Unique } from 'typeorm';

@Entity('acknowledgments')
@Unique('uq_ack_date_reviewer', ['date', 'reviewer'])
export class Acknowledgment {
  @PrimaryGeneratedColumn()
  id!: number;

  @Column({ type: 'varchar' })
  date!: string;

  @Column({ type: 'varchar' })
  reviewer!: string;

  @Column({ type: 'text', nullable: true })
  notes!: string | null;

  @CreateDateColumn()
  acknowledged_at!: Date;
}
