import { Column, CreateDateColumn, Entity, PrimaryGeneratedColumn } from 'typeorm';

@Entity('acknowledgments')
export class Acknowledgment {
  @CreateDateColumn()
  acknowledged_at!: Date;

  @Column({ nullable: true, type: 'varchar' })
  component!: string | null;

  @Column({ type: 'varchar' })
  date!: string;

  @PrimaryGeneratedColumn()
  id!: number;

  @Column({ nullable: true, type: 'text' })
  notes!: string | null;

  @Column({ type: 'varchar' })
  reviewer!: string;
}
