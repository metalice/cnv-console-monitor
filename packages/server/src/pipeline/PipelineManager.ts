import { v4 as uuidv4 } from 'uuid';
import { logger } from '../logger';
import { broadcast } from '../ws';
import { AppDataSource } from '../db/data-source';
import { PipelineRun } from '../db/entities/PipelineRun';
import { setSetting, getSetting } from '../db/store';
import { RateLimiter } from './RateLimiter';
import type {
  PipelineState, PipelineOptions, PhaseState, PhaseError,
  PipelinePhase, PhaseContext, PipelineLogEntry,
  DryRunReport, HealthReport, PhaseEstimate,
  createEmptyPhaseState, createEmptyPipelineState,
} from './types';

const log = logger.child({ module: 'Pipeline' });
const STATE_KEY = '_pipelineState';
const MAX_LOG_ENTRIES = 2000;

export class PipelineManager {
  private phases = new Map<string, PipelinePhase>();
  private phaseOrder: string[] = [];
  private state: PipelineState;
  private rateLimiters = new Map<string, RateLimiter>();
  private emitThrottleTimer: ReturnType<typeof setTimeout> | null = null;
  private lastEmitTime = 0;
  private static readonly EMIT_THROTTLE_MS = 500;

  constructor() {
    this.state = {
      runId: '',
      active: false,
      cancelled: false,
      startedAt: null,
      completedAt: null,
      durationMs: null,
      trigger: 'manual',
      phases: {},
      log: [],
    };
  }

  registerPhase(phase: PipelinePhase): void {
    this.phases.set(phase.name, phase);
    this.phaseOrder.push(phase.name);
    log.info({ phase: phase.name }, 'Phase registered');
  }

  getState(): PipelineState {
    return { ...this.state };
  }

  isActive(): boolean {
    return this.state.active;
  }

  async start(options: PipelineOptions): Promise<void> {
    if (this.state.active) throw new Error('Pipeline already running');

    const previousLog = this.buildPreviousRunSummary();

    this.state = {
      runId: uuidv4(),
      active: true,
      cancelled: false,
      startedAt: Date.now(),
      completedAt: null,
      durationMs: null,
      trigger: options.clearData ? 'backfill' : options.lookbackHours <= 24 ? 'scheduled' : 'manual',
      phases: {},
      log: previousLog,
    };

    for (const name of this.phaseOrder) {
      const phase = this.phases.get(name)!;
      const concurrency = this.getConfiguredConcurrency(name);
      this.state.phases[name] = {
        status: 'idle',
        total: 0,
        succeeded: 0,
        failed: 0,
        permanentFailures: 0,
        errors: [],
        startedAt: null,
        completedAt: null,
        currentConcurrency: concurrency,
        retryRound: 0,
      };
      this.rateLimiters.set(name, new RateLimiter(concurrency));
    }

    this.addLog('pipeline', 'info', `Pipeline started (${options.clearData ? 'full' : 'incremental'}, ${options.lookbackHours}h lookback)`);
    this.emit();
    await this.persist();

    try {
      const parallelPhases = new Set<string>();

      for (const name of this.phaseOrder) {
        if (this.state.cancelled) break;

        const phase = this.phases.get(name)!;

        if (phase.canSkip()) {
          this.state.phases[name].status = 'skipped';
          this.addLog(name, 'info', `Phase skipped`);
          this.emit();
          continue;
        }

        if (parallelPhases.has(name)) continue;

        const canParallel = phase.canRunParallel();
        if (canParallel.length > 0) {
          for (const parallelName of canParallel) {
            if (this.phases.has(parallelName) && !parallelPhases.has(parallelName)) {
              parallelPhases.add(parallelName);
            }
          }
        }

        await this.runPhase(name);

        for (const parallelName of parallelPhases) {
          if (!this.state.cancelled) {
            await this.runPhase(parallelName);
          }
        }
        parallelPhases.clear();
      }
    } catch (err) {
      this.addLog('pipeline', 'error', `Pipeline error: ${err instanceof Error ? err.message : 'Unknown'}`);
    }

    this.state.active = false;
    this.state.completedAt = Date.now();
    this.state.durationMs = this.state.completedAt - (this.state.startedAt ?? this.state.completedAt);
    this.addLog('pipeline', 'info', `Pipeline ${this.state.cancelled ? 'cancelled' : 'completed'} (${this.formatDuration(this.state.durationMs)})`);
    this.emit();
    await this.persist();
    await this.saveRun();
    await this.notifyOnFailure();
  }

  async cancel(): Promise<void> {
    if (!this.state.active) return;
    this.state.cancelled = true;
    this.addLog('pipeline', 'warn', 'Pipeline cancellation requested');
    this.emit();

    for (const [, phaseState] of Object.entries(this.state.phases)) {
      if (phaseState.status === 'running' || phaseState.status === 'retrying') {
        phaseState.status = 'cancelled';
      }
    }
    this.emit();
  }

  async resumePhase(phaseName: string): Promise<void> {
    if (this.state.active) throw new Error('Pipeline already running');

    const phase = this.phases.get(phaseName);
    const phaseState = this.state.phases[phaseName];
    if (!phase) throw new Error(`Unknown phase: ${phaseName}`);
    if (!phaseState) throw new Error(`No state for phase: ${phaseName}`);
    if (phaseState.status === 'running' || phaseState.status === 'retrying') {
      throw new Error(`Phase ${phaseName} is ${phaseState.status}, cannot resume`);
    }

    this.state.active = true;
    this.state.cancelled = false;
    this.state.completedAt = null;
    this.state.durationMs = null;

    phaseState.status = 'idle';
    phaseState.succeeded = 0;
    phaseState.failed = 0;
    phaseState.permanentFailures = 0;
    phaseState.errors = [];
    phaseState.startedAt = null;
    phaseState.completedAt = null;
    phaseState.retryRound = 0;

    const concurrency = this.getConfiguredConcurrency(phaseName);
    phaseState.currentConcurrency = concurrency;
    this.rateLimiters.set(phaseName, new RateLimiter(concurrency));

    this.addLog('pipeline', 'info', `Resuming phase: ${phase.displayName}`);
    this.emit();

    try {
      await this.runPhase(phaseName);
    } catch (err) {
      this.addLog(phaseName, 'error', `Resume error: ${err instanceof Error ? err.message : 'Unknown'}`);
    }

    this.state.active = false;
    this.state.completedAt = Date.now();
    this.addLog('pipeline', 'info', `Phase resume ${this.state.cancelled ? 'cancelled' : 'completed'}`);
    this.emit();
    await this.persist();
  }

  async healthCheck(): Promise<HealthReport> {
    const services: HealthReport['services'] = [];

    for (const [, phase] of this.phases) {
      try {
        const estimate = await phase.estimate();
        for (const conn of estimate.connectivity) {
          services.push({ name: conn.service, status: conn.status, latencyMs: 0, message: conn.message });
        }
      } catch (err) {
        services.push({ name: phase.displayName, status: 'error', latencyMs: 0, message: err instanceof Error ? err.message : 'Unknown' });
      }
    }

    return { services, allOk: services.every(s => s.status === 'ok') };
  }

  async dryRun(): Promise<DryRunReport> {
    const phases: Record<string, PhaseEstimate> = {};
    let totalEstimatedMs = 0;
    const health: DryRunReport['health'] = [];

    for (const [name, phase] of this.phases) {
      if (phase.canSkip()) continue;
      const estimate = await phase.estimate();
      phases[name] = estimate;
      totalEstimatedMs += estimate.estimatedDurationMs;
      health.push(...estimate.connectivity);
    }

    return { phases, totalEstimatedMs, health };
  }

  async getHistory(limit = 10): Promise<PipelineRun[]> {
    return AppDataSource.getRepository(PipelineRun).find({
      order: { started_at: 'DESC' },
      take: limit,
    });
  }

  onPhaseComplete?: (phaseName: string, phase: PipelinePhase) => void;

  private async runPhase(name: string): Promise<void> {
    const phase = this.phases.get(name);
    const phaseState = this.state.phases[name];
    if (!phase || !phaseState) return;

    phaseState.status = 'running';
    phaseState.startedAt = Date.now();
    this.addLog(name, 'info', `Phase started`);
    this.emit();

    const ctx = this.createContext(name, phaseState);

    try {
      await phase.run(ctx);
      if (this.onPhaseComplete) this.onPhaseComplete(name, phase);
    } catch (err) {
      this.addLog(name, 'error', `Phase error: ${err instanceof Error ? err.message : 'Unknown'}`);
    }

    if (this.state.cancelled) {
      phaseState.status = 'cancelled';
      phaseState.completedAt = Date.now();
      this.emit();
      await this.persist();
      return;
    }

    await this.autoRetry(name, phase, phaseState, ctx);

    phaseState.status = 'complete';
    phaseState.completedAt = Date.now();
    const dur = this.formatDuration(phaseState.completedAt - (phaseState.startedAt ?? phaseState.completedAt));
    this.addLog(name, 'info', `Phase complete: ${phaseState.succeeded} succeeded, ${phaseState.failed} failed, ${phaseState.permanentFailures} permanent (${dur})`);
    this.emit();
    await this.persist();
  }

  private async autoRetry(name: string, phase: PipelinePhase, phaseState: PhaseState, ctx: PhaseContext): Promise<void> {
    const rateLimiter = this.rateLimiters.get(name)!;

    while (true) {
      if (this.state.cancelled) break;

      const retryable = phaseState.errors.filter(e => !e.permanent);
      if (retryable.length === 0) break;

      phaseState.retryRound++;
      phaseState.status = 'retrying';
      this.addLog(name, 'info', `Auto-retry round ${phaseState.retryRound}: ${retryable.length} items`);
      this.emit();

      if (rateLimiter.shouldBackoff()) {
        const backoff = rateLimiter.getBackoffMs();
        this.addLog(name, 'warn', `Rate limit backoff: ${Math.round(backoff / 1000)}s`);
        await new Promise(r => setTimeout(r, backoff));
      }

      let retriedSuccessfully = 0;
      for (const error of retryable) {
        if (this.state.cancelled) break;

        try {
          const success = await phase.retryItem(error.itemId);
          if (success) {
            phaseState.succeeded++;
            phaseState.failed--;
            phaseState.errors = phaseState.errors.filter(e => e.itemId !== error.itemId);
            retriedSuccessfully++;
            rateLimiter.onSuccess();
          }
        } catch (err) {
          error.attempts++;
          error.lastAttemptAt = Date.now();
          const httpStatus = this.getHttpStatus(err);
          if (httpStatus) error.httpStatus = httpStatus;
          error.reason = this.getErrorReason(err);

          if (phase.isPermanentError(err)) {
            error.permanent = true;
            phaseState.permanentFailures++;
            this.addLog(name, 'warn', `Permanent failure: ${error.name} — ${error.reason}`);
          } else {
            this.addLog(name, 'error', `Retry failed: ${error.name} — ${error.reason} (attempt ${error.attempts})`);
          }

          if (httpStatus === 429) rateLimiter.onRateLimit();
        }
      }

      this.emit();
      await this.persist();

      if (retriedSuccessfully === 0 && retryable.every(e => e.permanent)) break;
      if (retriedSuccessfully === 0) {
        const wait = Math.min(30000, 2000 * phaseState.retryRound);
        const reasons = new Map<string, number>();
        for (const e of retryable) reasons.set(e.reason, (reasons.get(e.reason) ?? 0) + 1);
        const breakdown = [...reasons.entries()].map(([r, c]) => `${r} (${c})`).join(', ');
        this.addLog(name, 'info', `No progress in retry round ${phaseState.retryRound}, waiting ${Math.round(wait / 1000)}s — ${breakdown}`);
        await new Promise(r => setTimeout(r, wait));
      }
    }
  }

  private createContext(phaseName: string, phaseState: PhaseState): PhaseContext {
    const rateLimiter = this.rateLimiters.get(phaseName)!;

    return {
      getConcurrency: () => rateLimiter.getConcurrency(),
      setConcurrency: (n: number) => { phaseState.currentConcurrency = n; },
      isCancelled: () => this.state.cancelled,
      addSuccess: (count = 1) => { phaseState.succeeded += count; this.emitThrottled(); },
      addError: (itemId: number, name: string, error: unknown) => {
        const httpStatus = this.getHttpStatus(error);
        const reason = this.getErrorReason(error);
        const permanent = this.phases.get(phaseName)?.isPermanentError(error) ?? false;

        phaseState.failed++;
        if (permanent) phaseState.permanentFailures++;
        phaseState.errors.push({ itemId, name, reason, httpStatus, attempts: 1, permanent, lastAttemptAt: Date.now() });

        if (httpStatus === 429) rateLimiter.onRateLimit();
        else rateLimiter.onSuccess();

        this.addLog(phaseName, permanent ? 'warn' : 'error', `${name}: ${reason}${permanent ? ' (permanent)' : ''}`);
      },
      markPermanent: (itemId: number) => {
        const err = phaseState.errors.find(e => e.itemId === itemId);
        if (err && !err.permanent) {
          err.permanent = true;
          phaseState.permanentFailures++;
        }
      },
      setTotal: (total: number) => { phaseState.total = total; this.emit(); },
      log: (level, message) => this.addLog(phaseName, level, message),
      getPhaseState: () => phaseState,
      emit: () => this.emit(),
    };
  }

  private addLog(phase: string, level: 'info' | 'warn' | 'error', message: string): void {
    const entry: PipelineLogEntry = { timestamp: Date.now(), phase, level, message };
    this.state.log.push(entry);
    if (this.state.log.length > MAX_LOG_ENTRIES) {
      this.state.log = this.state.log.slice(-MAX_LOG_ENTRIES);
    }
    log[level]({ phase }, message);
  }

  private emit(): void {
    broadcast('pipeline-state', this.state);
    this.lastEmitTime = Date.now();
    if (this.emitThrottleTimer) {
      clearTimeout(this.emitThrottleTimer);
      this.emitThrottleTimer = null;
    }
  }

  private emitThrottled(): void {
    const elapsed = Date.now() - this.lastEmitTime;
    if (elapsed >= PipelineManager.EMIT_THROTTLE_MS) {
      this.emit();
    } else if (!this.emitThrottleTimer) {
      this.emitThrottleTimer = setTimeout(() => {
        this.emitThrottleTimer = null;
        this.emit();
      }, PipelineManager.EMIT_THROTTLE_MS - elapsed);
    }
  }

  private async persist(): Promise<void> {
    try {
      await setSetting(STATE_KEY, JSON.stringify(this.state), 'system');
    } catch { /* non-critical */ }
  }

  private async saveRun(): Promise<void> {
    try {
      const repo = AppDataSource.getRepository(PipelineRun);
      await repo.save({
        run_id: this.state.runId,
        started_at: this.state.startedAt ? new Date(this.state.startedAt) : new Date(),
        completed_at: this.state.completedAt ? new Date(this.state.completedAt) : null,
        duration_ms: this.state.durationMs,
        cancelled: this.state.cancelled,
        trigger: this.state.trigger,
        phases: this.state.phases as Record<string, unknown>,
        summary: this.buildSummary(),
        log: this.state.log,
      });

      const count = await repo.count();
      if (count > 20) {
        const oldest = await repo.find({ order: { started_at: 'ASC' }, take: count - 20 });
        if (oldest.length > 0) await repo.remove(oldest);
      }
    } catch (err) {
      log.warn({ err }, 'Failed to save pipeline run');
    }
  }

  private async notifyOnFailure(): Promise<void> {
    const totalFailed = Object.values(this.state.phases).reduce((sum, p) => sum + p.failed, 0);
    if (totalFailed === 0 && !this.state.cancelled) return;

    try {
      const { getAllSubscriptions } = await import('../db/store');
      const { sendSlackReminder } = await import('../notifiers/slack');
      const subs = await getAllSubscriptions();

      const summary = this.buildSummary();
      const message = this.state.cancelled
        ? `:warning: *Pipeline cancelled* — ${summary}`
        : `:x: *Pipeline completed with ${totalFailed} failures* — ${summary}`;

      for (const sub of subs) {
        if (!sub.enabled || !sub.slackWebhook) continue;
        try {
          const axios = (await import('axios')).default;
          await axios.post(sub.slackWebhook, { text: message }, { timeout: 10000 });
        } catch { /* non-critical */ }
      }
    } catch (err) {
      log.warn({ err }, 'Failed to send pipeline failure notification');
    }
  }

  private buildSummary(): string {
    const parts: string[] = [];
    for (const [name, phase] of Object.entries(this.state.phases)) {
      if (phase.status === 'skipped') continue;
      const display = this.phases.get(name)?.displayName ?? name;
      parts.push(`${display}: ${phase.succeeded}/${phase.total} (${phase.failed} failed, ${phase.permanentFailures} permanent)`);
    }
    return parts.join(' | ');
  }

  private formatDuration(ms: number): string {
    const s = Math.round(ms / 1000);
    if (s < 60) return `${s}s`;
    const m = Math.floor(s / 60);
    return s % 60 > 0 ? `${m}m ${s % 60}s` : `${m}m`;
  }

  private getHttpStatus(error: unknown): number | undefined {
    if (error && typeof error === 'object') {
      const resp = (error as Record<string, unknown>).response as Record<string, unknown> | undefined;
      return resp?.status as number | undefined;
    }
    return undefined;
  }

  private getErrorReason(error: unknown): string {
    if (error && typeof error === 'object') {
      const err = error as Record<string, unknown>;
      const status = this.getHttpStatus(error);
      if (status) return `HTTP ${status}`;
      const code = err.code as string | undefined;
      if (code) return code;
    }
    return error instanceof Error ? error.message : 'Unknown error';
  }

  private buildPreviousRunSummary(): PipelineLogEntry[] {
    if (!this.state.completedAt && !this.state.cancelled) return [];

    const hadFailures = Object.values(this.state.phases).some(p => p.failed > 0 || p.status === 'cancelled');
    if (!hadFailures) return [];

    const now = Date.now();
    const separator: PipelineLogEntry = {
      timestamp: now,
      phase: 'pipeline',
      level: 'info',
      message: `── Previous run (${this.state.completedAt ? new Date(this.state.completedAt).toLocaleString() : 'unknown'}) ──`,
    };

    const kept = this.state.log.filter(e => e.level === 'error' || e.level === 'warn');
    if (kept.length === 0) return [];

    const summary: PipelineLogEntry = {
      timestamp: now,
      phase: 'pipeline',
      level: 'warn',
      message: `Previous run ${this.state.cancelled ? 'was cancelled' : 'had failures'}: ${this.buildSummary()}`,
    };

    return [separator, summary, ...kept];
  }

  private getConfiguredConcurrency(phaseName: string): number {
    try {
      const { config } = require('../config');
      if (phaseName === 'jenkins') return config.schedule.jenkinsConcurrency ?? 20;
      return config.schedule.rpConcurrency ?? 20;
    } catch { return 20; }
  }

  static async loadState(): Promise<PipelineManager> {
    const manager = new PipelineManager();
    try {
      const raw = await getSetting(STATE_KEY);
      if (raw) {
        const saved = JSON.parse(raw) as PipelineState;
        if (saved.active) {
          saved.active = false;
          saved.cancelled = true;
          saved.completedAt = Date.now();
          for (const phase of Object.values(saved.phases)) {
            if (phase.status === 'running' || phase.status === 'retrying') {
              phase.status = 'cancelled';
            }
          }
          saved.log.push({ timestamp: Date.now(), phase: 'pipeline', level: 'warn', message: 'Pipeline interrupted by server restart' });
        }
        manager.state = saved;
      }
    } catch { /* fresh state */ }
    return manager;
  }
}

let instance: PipelineManager | null = null;

export const getPipelineManager = (): PipelineManager => {
  if (!instance) instance = new PipelineManager();
  return instance;
};

export const initPipelineManager = async (): Promise<PipelineManager> => {
  instance = await PipelineManager.loadState();
  return instance;
};
