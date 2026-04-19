import { Column, CreateDateColumn, Entity, Index, PrimaryGeneratedColumn, Unique } from 'typeorm';

@Entity('feedback_votes')
@Unique('uq_feedback_vote', ['feedback_id', 'user_email'])
export class FeedbackVoteEntity {
  @CreateDateColumn()
  created_at!: Date;

  @Column({ type: 'int' })
  @Index('idx_feedback_votes_feedback_id')
  feedback_id!: number;

  @PrimaryGeneratedColumn()
  id!: number;

  @Column({ type: 'varchar' })
  user_email!: string;
}
