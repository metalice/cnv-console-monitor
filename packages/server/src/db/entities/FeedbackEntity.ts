import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';

@Entity('feedback')
export class FeedbackEntity {
  @Column({ nullable: true, type: 'text' })
  admin_note!: string | null;

  @Column({ length: 20, type: 'varchar' })
  @Index('idx_feedback_category')
  category!: string;

  @Column({ length: 500, nullable: true, type: 'varchar' })
  component_filter!: string | null;

  @Column({ nullable: true, type: 'text' })
  console_errors!: string | null;

  @CreateDateColumn()
  @Index('idx_feedback_created_at')
  created_at!: Date;

  @Column({ type: 'text' })
  description!: string;

  @PrimaryGeneratedColumn()
  id!: number;

  @Column({ length: 500, type: 'varchar' })
  page_url!: string;

  @Column({ length: 20, nullable: true, type: 'varchar' })
  @Index('idx_feedback_priority')
  priority!: string | null;

  @Column({ nullable: true, type: 'boolean' })
  satisfaction!: boolean | null;

  @Column({ nullable: true, type: 'text' })
  screenshot!: string | null;

  @Column({ default: 'new', length: 20, type: 'varchar' })
  @Index('idx_feedback_status')
  status!: string;

  @Column({ type: 'varchar' })
  @Index('idx_feedback_submitted_by')
  submitted_by!: string;

  @Column({ default: '[]', type: 'jsonb' })
  tags!: string[];

  @UpdateDateColumn()
  updated_at!: Date;

  @Column({ nullable: true, type: 'varchar' })
  user_agent!: string | null;
}
