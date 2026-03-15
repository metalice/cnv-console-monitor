import { Entity, PrimaryColumn, Column, CreateDateColumn } from 'typeorm';

@Entity('users')
export class UserEntity {
  @PrimaryColumn({ type: 'varchar' })
  email!: string;

  @Column({ type: 'varchar' })
  name!: string;

  @Column({ type: 'varchar', default: 'user' })
  role!: string;

  @Column({ type: 'timestamp', nullable: true })
  last_login!: Date | null;

  @CreateDateColumn()
  created_at!: Date;
}
