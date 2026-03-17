import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn } from 'typeorm';

@Entity('notification_subscriptions')
export class NotificationSubscription {
  @PrimaryGeneratedColumn()
  id!: number;

  @Column({ type: 'varchar' })
  name!: string;

  @Column({ type: 'text', default: '[]' })
  components!: string;

  @Column({ type: 'varchar', nullable: true })
  slack_webhook!: string | null;

  @Column({ type: 'varchar', nullable: true })
  jira_webhook!: string | null;

  @Column({ type: 'text', nullable: true })
  email_recipients!: string | null;

  @Column({ type: 'varchar', default: '0 7 * * *' })
  schedule!: string;

  @Column({ type: 'varchar', default: 'Asia/Jerusalem' })
  timezone!: string;

  @Column({ type: 'boolean', default: true })
  enabled!: boolean;

  @Column({ type: 'boolean', default: false })
  reminder_enabled!: boolean;

  @Column({ type: 'varchar', default: '10:00' })
  reminder_time!: string;

  @Column({ type: 'varchar', default: '1,2,3,4,5' })
  reminder_days!: string;

  @Column({ type: 'varchar', nullable: true })
  created_by!: string | null;

  @CreateDateColumn()
  created_at!: Date;

  @UpdateDateColumn()
  updated_at!: Date;
}
