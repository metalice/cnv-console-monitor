import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn } from 'typeorm';

@Entity('release_milestones')
export class ReleaseMilestoneEntity {
  @PrimaryGeneratedColumn()
  id!: number;

  @Column({ type: 'varchar' })
  version!: string;

  @Column({ type: 'varchar' })
  milestone_type!: string;

  @Column({ type: 'varchar' })
  name!: string;

  @Column({ type: 'date' })
  date!: string;

  @Column({ type: 'text', nullable: true })
  notes!: string | null;

  @Column({ type: 'varchar', nullable: true })
  created_by!: string | null;

  @CreateDateColumn()
  created_at!: Date;
}
