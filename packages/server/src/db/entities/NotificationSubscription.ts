import {
  Column,
  CreateDateColumn,
  Entity,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';

@Entity('notification_subscriptions')
export class NotificationSubscription {
  @Column({ default: '[]', type: 'text' })
  components!: string;

  @CreateDateColumn()
  created_at!: Date;

  @Column({ nullable: true, type: 'varchar' })
  created_by!: string | null;

  @Column({ nullable: true, type: 'text' })
  email_recipients!: string | null;

  @Column({ default: true, type: 'boolean' })
  enabled!: boolean;

  @PrimaryGeneratedColumn()
  id!: number;

  @Column({ nullable: true, type: 'varchar' })
  jira_webhook!: string | null;

  @Column({ type: 'varchar' })
  name!: string;

  @Column({ default: '1,2,3,4,5', type: 'varchar' })
  reminder_days!: string;

  @Column({ default: false, type: 'boolean' })
  reminder_enabled!: boolean;

  @Column({ default: '10:00', type: 'varchar' })
  reminder_time!: string;

  @Column({ default: '0 7 * * *', type: 'varchar' })
  schedule!: string;

  @Column({ nullable: true, type: 'varchar' })
  slack_webhook!: string | null;

  @Column({ default: 'Asia/Jerusalem', type: 'varchar' })
  timezone!: string;

  @UpdateDateColumn()
  updated_at!: Date;
}
