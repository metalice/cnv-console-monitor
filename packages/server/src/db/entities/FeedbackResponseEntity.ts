import { Column, CreateDateColumn, Entity, Index, PrimaryGeneratedColumn } from 'typeorm';

@Entity('feedback_responses')
export class FeedbackResponseEntity {
  @Column({ type: 'varchar' })
  author_email!: string;

  @Column({ type: 'varchar' })
  author_name!: string;

  @CreateDateColumn()
  created_at!: Date;

  @Column({ type: 'int' })
  @Index('idx_feedback_responses_feedback_id')
  feedback_id!: number;

  @PrimaryGeneratedColumn()
  id!: number;

  @Column({ type: 'text' })
  message!: string;
}
