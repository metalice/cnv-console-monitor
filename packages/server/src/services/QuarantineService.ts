import { createGitProvider } from '../clients/git-provider';
import { config } from '../config';
import {
  addQuarantineLog,
  createQuarantine as dbCreateQuarantine,
  getOverdueQuarantines,
  resolveQuarantine as dbResolveQuarantine,
  updateQuarantineStatus,
} from '../db/store';
import { getDecryptedToken, getRepositoryById } from '../db/store';
import { logger } from '../logger';
import { broadcast } from '../ws';

const log = logger.child({ module: 'Quarantine' });

type QuarantineInput = {
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
};

export const quarantineTest = async (input: QuarantineInput): Promise<Record<string, unknown>> => {
  const slaDays = input.slaDays || 14;
  const slaDeadline = new Date();
  slaDeadline.setDate(slaDeadline.getDate() + slaDays);

  const quarantine = await dbCreateQuarantine({
    component: input.component || null,
    quarantined_by: input.userEmail,
    reason: input.reason,
    repo_id: input.repoId || null,
    sla_days: slaDays,
    sla_deadline: slaDeadline,
    status: 'active',
    test_file_path: input.testFilePath || null,
    test_name: input.testName,
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
          description: `Test quarantined by ${input.userEmail}.\n\nReason: ${input.reason}\n\nComponent: ${input.component || 'Unknown'}\nSLA: ${slaDays} days (deadline: ${slaDeadline.toISOString().split('T')[0]})`,
          labels: ['quarantine', 'cnv-monitor'],
          summary: `[Quarantine] ${input.testName}`,
        });
        await updateQuarantineStatus(quarantine.id, 'active', { jira_key: issue.key });
        await addQuarantineLog(quarantine.id, 'jira_created', input.userEmail, {
          jiraKey: issue.key,
        });
        result.jiraKey = issue.key;
      } else {
        await addQuarantineLog(quarantine.id, 'jira_skipped', input.userEmail, {
          reason: 'No personal Jira token configured',
        });
        result.jiraSkipped = true;
      }
    } catch (err) {
      log.error(
        { err, quarantineId: quarantine.id },
        'Failed to create Jira ticket for quarantine',
      );
      await addQuarantineLog(quarantine.id, 'jira_failed', input.userEmail, {
        error: err instanceof Error ? err.message : 'Unknown',
      });
    }
  }

  if (input.createSkipPr && input.repoId && input.testFilePath) {
    try {
      const repo = await getRepositoryById(input.repoId);
      if (!repo) {
        throw new Error('Repository not found');
      }

      const provider = repo.provider as 'gitlab' | 'github';
      const personalToken = await getDecryptedToken(input.userEmail, provider);

      if (personalToken) {
        const gitProvider = await createGitProvider(
          provider,
          repo.api_base_url,
          repo.project_id,
          personalToken,
        );
        const branchName = `quarantine/${input.testName.replace(/[^a-z0-9-]/gi, '-').slice(0, 50)}`;
        const defaultBranch = (repo.branches as unknown as string[])[0] || 'main';

        await gitProvider.createBranch(branchName, defaultBranch);

        const fileContent = await gitProvider.fetchFileContent(input.testFilePath, defaultBranch);
        // eslint-disable-next-line @typescript-eslint/no-base-to-string
        const jiraRef = String(result.jiraKey ?? 'pending');
        const skipLine = `test.skip('Quarantined: ${jiraRef} - ${input.reason.slice(0, 100)}');`;
        const updatedContent = `${skipLine}\n${fileContent.content}`;

        await gitProvider.commitFile(
          branchName,
          input.testFilePath,
          updatedContent,
          `[quarantine] Skip ${input.testName}`,
        );

        const pr = await gitProvider.createPR({
          description: `Quarantined by ${input.userEmail}\n\nReason: ${input.reason}\nSLA: ${slaDays} days`,
          sourceBranch: branchName,
          targetBranch: defaultBranch,
          title: `[quarantine] Skip ${input.testName}`,
        });

        await updateQuarantineStatus(quarantine.id, 'active', {
          skip_pr_status: 'pending',
          skip_pr_url: pr.url,
        });
        await addQuarantineLog(quarantine.id, 'skip_pr_created', input.userEmail, {
          prUrl: pr.url,
        });
        result.skipPrUrl = pr.url;
      } else {
        await addQuarantineLog(quarantine.id, 'skip_pr_skipped', input.userEmail, {
          reason: `No personal ${provider} token configured`,
        });
        result.skipPrSkipped = true;
      }
    } catch (err) {
      log.error({ err, quarantineId: quarantine.id }, 'Failed to create skip PR');
      await addQuarantineLog(quarantine.id, 'skip_pr_failed', input.userEmail, {
        error: err instanceof Error ? err.message : 'Unknown',
      });
    }
  }

  broadcast('data-updated');
  return result;
};

export const unquarantineTest = async (
  quarantineId: string,
  resolvedBy: string,
  details?: { fixDescription?: string; fixCommitUrl?: string },
): Promise<Record<string, unknown>> => {
  const resolved = await dbResolveQuarantine(quarantineId, resolvedBy);
  if (!resolved) {
    throw new Error('Quarantine not found');
  }

  await addQuarantineLog(quarantineId, 'resolved', resolvedBy, details ?? {});
  broadcast('data-updated');
  return { quarantineId, status: 'resolved' };
};

export const checkQuarantineSLA = async (): Promise<{ transitioned: number }> => {
  const overdue = await getOverdueQuarantines();
  let transitioned = 0;

  for (const q of overdue) {
    // eslint-disable-next-line no-await-in-loop -- sequential: ordered operations
    await updateQuarantineStatus(q.id, 'overdue');
    // eslint-disable-next-line no-await-in-loop -- sequential: ordered operations
    await addQuarantineLog(q.id, 'sla_exceeded', 'system', {
      slaDays: q.sla_days,
      slaDeadline: q.sla_deadline.toISOString(),
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
