import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  PrimaryGeneratedColumn,
  Unique,
  UpdateDateColumn,
} from 'typeorm';

@Entity('user_tokens')
@Unique('uq_user_tokens_email_provider', ['user_email', 'provider'])
export class UserToken {
  @CreateDateColumn()
  created_at!: Date;

  @Column({ type: 'text' })
  encrypted_token!: string;

  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ default: true, type: 'boolean' })
  is_valid!: boolean;

  @Column({ type: 'varchar' })
  @Index('idx_user_tokens_provider')
  provider!: string;

  @Column({ nullable: true, type: 'varchar' })
  provider_email!: string | null;

  @Column({ nullable: true, type: 'varchar' })
  provider_username!: string | null;

  @UpdateDateColumn()
  updated_at!: Date;

  @Column({ type: 'varchar' })
  @Index('idx_user_tokens_user_email')
  user_email!: string;

  @Column({ nullable: true, type: 'timestamp' })
  validated_at!: Date | null;
}
