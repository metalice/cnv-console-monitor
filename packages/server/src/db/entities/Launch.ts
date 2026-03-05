import { Entity, PrimaryGeneratedColumn, Column, Index, CreateDateColumn } from 'typeorm';

@Entity('launches')
export class Launch {
  @PrimaryGeneratedColumn()
  id!: number;

  @Column({ type: 'int', unique: true })
  @Index('idx_launches_rp_id')
  rp_id!: number;

  @Column({ type: 'varchar' })
  uuid!: string;

  @Column({ type: 'varchar' })
  @Index('idx_launches_name')
  name!: string;

  @Column({ type: 'int' })
  number!: number;

  @Column({ type: 'varchar' })
  @Index('idx_launches_status')
  status!: string;

  @Column({ type: 'varchar', nullable: true })
  cnv_version!: string | null;

  @Column({ type: 'varchar', nullable: true })
  bundle!: string | null;

  @Column({ type: 'varchar', nullable: true })
  ocp_version!: string | null;

  @Column({ type: 'varchar', nullable: true })
  tier!: string | null;

  @Column({ type: 'varchar', nullable: true })
  cluster_name!: string | null;

  @Column({ type: 'int', default: 0 })
  total!: number;

  @Column({ type: 'int', default: 0 })
  passed!: number;

  @Column({ type: 'int', default: 0 })
  failed!: number;

  @Column({ type: 'int', default: 0 })
  skipped!: number;

  @Column({ type: 'bigint' })
  @Index('idx_launches_start_time')
  start_time!: number;

  @Column({ type: 'bigint', nullable: true })
  end_time!: number | null;

  @Column({ type: 'float', nullable: true })
  duration!: number | null;

  @CreateDateColumn()
  fetched_at!: Date;
}
