import { Column, CreateDateColumn, Entity, Index, PrimaryGeneratedColumn } from 'typeorm';

@Entity('launches')
export class Launch {
  @Column({ nullable: true, type: 'varchar' })
  artifacts_url!: string | null;

  @Column({ nullable: true, type: 'varchar' })
  bundle!: string | null;

  @Column({ nullable: true, type: 'varchar' })
  cluster_name!: string | null;

  @Column({ nullable: true, type: 'varchar' })
  cnv_version!: string | null;

  @Column({ nullable: true, type: 'varchar' })
  @Index('idx_launches_component')
  component!: string | null;

  @Column({ nullable: true, type: 'float' })
  duration!: number | null;

  @Column({ nullable: true, type: 'bigint' })
  end_time!: number | null;

  @Column({ default: 0, type: 'int' })
  failed!: number;

  @CreateDateColumn()
  fetched_at!: Date;

  @PrimaryGeneratedColumn()
  id!: number;

  @Column({ nullable: true, type: 'jsonb' })
  jenkins_metadata!: Record<string, unknown> | null;

  @Column({ default: 'pending', nullable: true, type: 'varchar' })
  @Index('idx_launches_jenkins_status')
  jenkins_status!: string | null;

  @Column({ nullable: true, type: 'varchar' })
  jenkins_team!: string | null;

  @Column({ type: 'varchar' })
  @Index('idx_launches_name')
  name!: string;

  @Column({ type: 'int' })
  number!: number;

  @Column({ nullable: true, type: 'varchar' })
  ocp_version!: string | null;

  @Column({ default: 0, type: 'int' })
  passed!: number;

  @Column({ type: 'int', unique: true })
  @Index('idx_launches_rp_id')
  rp_id!: number;

  @Column({ default: 0, type: 'int' })
  skipped!: number;

  @Column({ type: 'bigint' })
  @Index('idx_launches_start_time')
  start_time!: number;

  @Column({ type: 'varchar' })
  @Index('idx_launches_status')
  status!: string;

  @Column({ nullable: true, type: 'varchar' })
  tier!: string | null;

  @Column({ default: 0, type: 'int' })
  total!: number;

  @Column({ type: 'varchar' })
  uuid!: string;
}
