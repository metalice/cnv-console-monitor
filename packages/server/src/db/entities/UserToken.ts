import { Entity, PrimaryGeneratedColumn, Column, Index, CreateDateColumn, UpdateDateColumn, Unique } from 'typeorm';

@Entity('user_tokens')
@Unique('uq_user_tokens_email_provider', ['user_email', 'provider'])
export class UserToken {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ type: 'varchar' })
  @Index('idx_user_tokens_user_email')
  user_email!: string;

  @Column({ type: 'varchar' })
  @Index('idx_user_tokens_provider')
  provider!: string;

  @Column({ type: 'text' })
  encrypted_token!: string;

  @Column({ type: 'varchar', nullable: true })
  provider_username!: string | null;

  @Column({ type: 'varchar', nullable: true })
  provider_email!: string | null;

  @Column({ type: 'timestamp', nullable: true })
  validated_at!: Date | null;

  @Column({ type: 'boolean', default: true })
  is_valid!: boolean;

  @CreateDateColumn()
  created_at!: Date;

  @UpdateDateColumn()
  updated_at!: Date;
}
