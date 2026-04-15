import { createGitProvider } from '../clients/git-provider';
import { validateToken } from '../clients/token-validator';
import { config } from '../config';
import {
  addQuarantineLog,
  createQuarantine as dbCreateQuarantine,
  getOverdueQuarantines,
  getSetting,
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

const resolveGitToken = async (
  userEmail: string,
  provider: 'github' | 'gitlab',
): Promise<string | null> => {
  const personal = await getDecryptedToken(userEmail, provider);
  if (personal) return personal;
  return getSetting(`${provider}.token`);
};

type PreflightResult = {
  errors: string[];
  gitProvider: 'github' | 'gitlab';
  gitRepo: Awaited<ReturnType<typeof getRepositoryById>>;
  gitToken: string | null;
  jiraToken: string | null;
};

const runPreflight = async (input: QuarantineInput): Promise<PreflightResult> => {
  const result: PreflightResult = {
    errors: [],
    gitProvider: 'github',
    gitRepo: null,
    gitToken: null,
    jiraToken: null,
  };

  if (input.createJira && config.jira.enabled) {
    result.jiraToken = await getDecryptedToken(input.userEmail, 'jira');
    if (!result.jiraToken) {
      result.errors.push(
        'Jira: no personal token configured. Add one in Settings > Personal Tokens.',
      );
    } else {
      try {
        await validateToken('jira', result.jiraToken);
      } catch {
        result.errors.push(
          'Jira: token is invalid or expired. Update it in Settings > Personal Tokens.',
        );
        result.jiraToken = null;
      }
    }
  }

  if (input.createSkipPr && input.repoId && input.testFilePath) {
    result.gitRepo = await getRepositoryById(input.repoId);
    if (!result.gitRepo) {
      result.errors.push('Git: repository not found.');
      return result;
    }
    result.gitProvider = result.gitRepo.provider as 'github' | 'gitlab';
    result.gitToken = await resolveGitToken(input.userEmail, result.gitProvider);
    if (!result.gitToken) {
      result.errors.push(
        `Git: no ${result.gitProvider} token found. Add one in Settings > Personal Tokens or configure ${result.gitProvider}.token in Integrations.`,
      );
      return result;
    }
    try {
      await validateToken(result.gitProvider, result.gitToken, result.gitRepo.api_base_url);
    } catch {
      result.errors.push(
        `Git: ${result.gitProvider} token is invalid or expired. Update it in Settings.`,
      );
      result.gitToken = null;
    }
  }

  return result;
};

export const quarantineTest = async (input: QuarantineInput): Promise<Record<string, unknown>> => {
  const slaDays = input.slaDays || 14;
  const slaDeadline = new Date();
  slaDeadline.setDate(slaDeadline.getDate() + slaDays);

  const preflight = await runPreflight(input);
  if (preflight.errors.length > 0) {
    return { errors: preflight.errors, status: 'validation_failed' };
  }

  const { gitProvider, gitRepo, gitToken, jiraToken } = preflight;

  // --- All tokens validated, proceed ---
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

  if (input.createJira && jiraToken) {
    try {
      const { createIssueWithToken } = await import('../clients/jira');
      const issue = await createIssueWithToken(jiraToken, {
        description: `Test quarantined by ${input.userEmail}.\n\nReason: ${input.reason}\n\nComponent: ${input.component || 'Unknown'}\nSLA: ${slaDays} days (deadline: ${slaDeadline.toISOString().split('T')[0]})`,
        labels: ['quarantine', 'cnv-monitor'],
        summary: `[Quarantine] ${input.testName}`,
      });
      await updateQuarantineStatus(quarantine.id, 'active', { jira_key: issue.key });
      await addQuarantineLog(quarantine.id, 'jira_created', input.userEmail, {
        jiraKey: issue.key,
      });
      result.jiraKey = issue.key;
    } catch (err) {
      log.error({ err, quarantineId: quarantine.id }, 'Jira ticket creation failed');
      await addQuarantineLog(quarantine.id, 'jira_failed', input.userEmail, {
        error: err instanceof Error ? err.message : 'Unknown',
      });
      result.jiraFailed = true;
    }
  }

  const testFilePath = input.testFilePath ?? '';
  if (input.createSkipPr && gitToken && gitRepo && testFilePath) {
    try {
      const git = await createGitProvider(
        gitProvider,
        gitRepo.api_base_url,
        gitRepo.project_id,
        gitToken,
      );
      const branchName = `quarantine/${input.testName.replace(/[^a-z0-9-]/gi, '-').slice(0, 50)}`;
      const defaultBranch = (gitRepo.branches as unknown as string[])[0] || 'main';

      await git.createBranch(branchName, defaultBranch);

      const fileContent = await git.fetchFileContent(testFilePath, defaultBranch);
      const jiraRef = typeof result.jiraKey === 'string' ? result.jiraKey : 'pending';
      const skipLine = `test.skip('Quarantined: ${jiraRef} - ${input.reason.slice(0, 100)}');`;
      const updatedContent = `${skipLine}\n${fileContent.content}`;

      await git.commitFile(
        branchName,
        testFilePath,
        updatedContent,
        `[quarantine] Skip ${input.testName}`,
      );

      const pr = await git.createPR({
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
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'Unknown error';
      log.error({ err, quarantineId: quarantine.id }, 'Skip PR creation failed');
      await addQuarantineLog(quarantine.id, 'skip_pr_failed', input.userEmail, {
        error: errorMsg,
      });
      result.skipPrFailed = true;
      result.skipPrError = errorMsg;
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
