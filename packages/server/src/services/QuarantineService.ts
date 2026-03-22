import { logger } from '../logger';
import { config } from '../config';
import {
  createQuarantine as dbCreateQuarantine,
  resolveQuarantine as dbResolveQuarantine,
  addQuarantineLog,
  getOverdueQuarantines,
  updateQuarantineStatus,
  getQuarantineById,
  getActiveQuarantines,
} from '../db/store';
import { getRepositoryById, getDecryptedToken } from '../db/store';
import { createGitProvider } from '../clients/git-provider';
import { broadcast } from '../ws';

const log = logger.child({ module: 'Quarantine' });

interface QuarantineInput {
  testName: string;
  testFilePath?: string;
  repoId?: string;
  component?: string;
  reason: string;
  slaDays?: number;
  createJira?: boolean;
  updateRpDefect?: boolean;
  createSkipPr?: boolean;
  userEmail: string;
}

export const quarantineTest = async (input: QuarantineInput): Promise<Record<string, unknown>> => {
  const slaDays = input.slaDays || 14;
  const slaDeadline = new Date();
  slaDeadline.setDate(slaDeadline.getDate() + slaDays);

  const quarantine = await dbCreateQuarantine({
    test_name: input.testName,
    test_file_path: input.testFilePath || null,
    repo_id: input.repoId || null,
    component: input.component || null,
    reason: input.reason,
    quarantined_by: input.userEmail,
    sla_days: slaDays,
    sla_deadline: slaDeadline,
    status: 'active',
  });

  await addQuarantineLog(quarantine.id, 'created', input.userEmail, {
    reason: input.reason,
    slaDays,
    slaDeadline: slaDeadline.toISOString(),
  });

  const result: Record<string, unknown> = { quarantineId: quarantine.id, status: 'active' };

  if (input.createJira && config.jira.enabled) {
    try {
      const personalToken = await getDecryptedToken(input.userEmail, 'jira');
      if (personalToken) {
        const { createIssueWithToken } = await import('../clients/jira');
        const issue = await createIssueWithToken(personalToken, {
          summary: `[Quarantine] ${input.testName}`,
          description: `Test quarantined by ${input.userEmail}.\n\nReason: ${input.reason}\n\nComponent: ${input.component || 'Unknown'}\nSLA: ${slaDays} days (deadline: ${slaDeadline.toISOString().split('T')[0]})`,
          labels: ['quarantine', 'cnv-monitor'],
        });
        await updateQuarantineStatus(quarantine.id, 'active', { jira_key: issue.key });
        await addQuarantineLog(quarantine.id, 'jira_created', input.userEmail, { jiraKey: issue.key });
        result.jiraKey = issue.key;
      } else {
        await addQuarantineLog(quarantine.id, 'jira_skipped', input.userEmail, { reason: 'No personal Jira token configured' });
        result.jiraSkipped = true;
      }
    } catch (err) {
      log.error({ err, quarantineId: quarantine.id }, 'Failed to create Jira ticket for quarantine');
      await addQuarantineLog(quarantine.id, 'jira_failed', input.userEmail, { error: err instanceof Error ? err.message : 'Unknown' });
    }
  }

  if (input.createSkipPr && input.repoId && input.testFilePath) {
    try {
      const repo = await getRepositoryById(input.repoId);
      if (!repo) throw new Error('Repository not found');

      const provider = repo.provider as 'gitlab' | 'github';
      const personalToken = await getDecryptedToken(input.userEmail, provider);

      if (personalToken) {
        const gitProvider = createGitProvider(provider, repo.api_base_url, repo.project_id, personalToken);
        const branchName = `quarantine/${input.testName.replace(/[^a-zA-Z0-9-]/g, '-').slice(0, 50)}`;
        const defaultBranch = (repo.branches as unknown as string[])[0] || 'main';

        await gitProvider.createBranch(branchName, defaultBranch);

        const fileContent = await gitProvider.fetchFileContent(input.testFilePath, defaultBranch);
        const skipLine = `test.skip('Quarantined: ${result.jiraKey || 'pending'} - ${input.reason.slice(0, 100)}');`;
        const updatedContent = `${skipLine}\n${fileContent.content}`;

        await gitProvider.commitFile(branchName, input.testFilePath, updatedContent, `[quarantine] Skip ${input.testName}`);

        const pr = await gitProvider.createPR({
          sourceBranch: branchName,
          targetBranch: defaultBranch,
          title: `[quarantine] Skip ${input.testName}`,
          description: `Quarantined by ${input.userEmail}\n\nReason: ${input.reason}\nSLA: ${slaDays} days`,
        });

        await updateQuarantineStatus(quarantine.id, 'active', { skip_pr_url: pr.url, skip_pr_status: 'pending' });
        await addQuarantineLog(quarantine.id, 'skip_pr_created', input.userEmail, { prUrl: pr.url });
        result.skipPrUrl = pr.url;
      } else {
        await addQuarantineLog(quarantine.id, 'skip_pr_skipped', input.userEmail, { reason: `No personal ${provider} token configured` });
        result.skipPrSkipped = true;
      }
    } catch (err) {
      log.error({ err, quarantineId: quarantine.id }, 'Failed to create skip PR');
      await addQuarantineLog(quarantine.id, 'skip_pr_failed', input.userEmail, { error: err instanceof Error ? err.message : 'Unknown' });
    }
  }

  broadcast('data-updated');
  return result;
};

export const unquarantineTest = async (quarantineId: string, resolvedBy: string, details?: { fixDescription?: string; fixCommitUrl?: string }): Promise<Record<string, unknown>> => {
  const resolved = await dbResolveQuarantine(quarantineId, resolvedBy);
  if (!resolved) throw new Error('Quarantine not found');

  await addQuarantineLog(quarantineId, 'resolved', resolvedBy, details || {});
  broadcast('data-updated');
  return { quarantineId, status: 'resolved' };
};

export const checkQuarantineSLA = async (): Promise<{ transitioned: number }> => {
  const overdue = await getOverdueQuarantines();
  let transitioned = 0;

  for (const q of overdue) {
    await updateQuarantineStatus(q.id, 'overdue');
    await addQuarantineLog(q.id, 'sla_exceeded', 'system', {
      slaDays: q.sla_days,
      slaDeadline: q.sla_deadline?.toISOString(),
    });
    transitioned++;
    log.warn({ quarantineId: q.id, testName: q.test_name }, 'Quarantine SLA exceeded');
  }

  if (transitioned > 0) {
    broadcast('data-updated');
    log.info({ transitioned }, 'Quarantine SLA check complete');
  }

  return { transitioned };
};
