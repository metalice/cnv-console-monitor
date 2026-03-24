import { describe, expect, it } from 'vitest';

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
    expect(config.schedule.timezone).toBeTruthy();
  });

  it('has default jira config', () => {
    expect(config.jira.projectKey).toBe('CNV');
    expect(config.jira.issueType).toBe('Bug');
  });

  it('email from falls back correctly', () => {
    expect(config.email.from).toBeTruthy();
  });

  it('email from has a default', () => {
    expect(config.email.from).toBeTruthy();
  });

  it('dashboard url has a default', () => {
    expect(typeof config.dashboard.url).toBe('string');
  });
});
