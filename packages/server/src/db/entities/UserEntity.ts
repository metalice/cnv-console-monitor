import { Column, CreateDateColumn, Entity, PrimaryColumn } from 'typeorm';

@Entity('users')
export class UserEntity {
  @CreateDateColumn()
  created_at!: Date;

  @PrimaryColumn({ type: 'varchar' })
  email!: string;

  @Column({ nullable: true, type: 'timestamp' })
  last_login!: Date | null;

  @Column({ type: 'varchar' })
  name!: string;

  @Column({ default: 'user', type: 'varchar' })
  role!: string;
}
