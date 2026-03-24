import { Column, CreateDateColumn, Entity, PrimaryGeneratedColumn } from 'typeorm';

@Entity('release_milestones')
export class ReleaseMilestoneEntity {
  @CreateDateColumn()
  created_at!: Date;

  @Column({ nullable: true, type: 'varchar' })
  created_by!: string | null;

  @Column({ type: 'date' })
  date!: string;

  @PrimaryGeneratedColumn()
  id!: number;

  @Column({ type: 'varchar' })
  milestone_type!: string;

  @Column({ type: 'varchar' })
  name!: string;

  @Column({ nullable: true, type: 'text' })
  notes!: string | null;

  @Column({ type: 'varchar' })
  version!: string;
}
