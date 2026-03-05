import { describe, it, expect } from 'vitest';
import { config } from '../config';

describe('config', () => {
  it('has default reportportal project', () => {
    expect(config.reportportal.project).toBe('CNV');
  });

  it('has default dashboard port', () => {
    expect(config.dashboard.port).toBe(8080);
  });

  it('has default schedule values', () => {
    expect(config.schedule.pollIntervalMinutes).toBeGreaterThan(0);
    expect(config.schedule.initialLookbackDays).toBeGreaterThan(0);
    expect(config.schedule.ackReminderHour).toBeGreaterThanOrEqual(0);
    expect(config.schedule.timezone).toBeTruthy();
  });

  it('has default jira config', () => {
    expect(config.jira.projectKey).toBe('CNV');
    expect(config.jira.issueType).toBe('Bug');
  });

  it('email from falls back correctly', () => {
    expect(config.email.from).toBeTruthy();
  });

  it('email recipients is an array', () => {
    expect(Array.isArray(config.email.recipients)).toBe(true);
  });

  it('launch filter has a default', () => {
    expect(config.dashboard.launchFilter).toBe('test-kubevirt-console');
  });
});
