import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';

@Entity('weekly_repos')
export class WeeklyRepoEntity {
  @Column({ type: 'varchar' })
  @Index('idx_weekly_repos_component')
  component!: string;

  @CreateDateColumn()
  created_at!: Date;

  @Column({ default: true, type: 'boolean' })
  enabled!: boolean;

  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ type: 'varchar' })
  name!: string;

  @Column({ type: 'varchar' })
  provider!: string;

  @UpdateDateColumn()
  updated_at!: Date;

  @Column({ type: 'varchar' })
  url!: string;
}
