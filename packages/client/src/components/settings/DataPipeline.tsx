import React from 'react';
import {
  Button, Flex, FlexItem, Label,
  Progress, ProgressSize, ProgressMeasureLocation,
  Tooltip,
} from '@patternfly/react-core';
import { SyncAltIcon, TimesIcon, ExclamationTriangleIcon, CheckCircleIcon } from '@patternfly/react-icons';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { fetchPollStatus, triggerJenkinsEnrichment, cancelPoll, retryFailedItems } from '../../api/poll';
import { usePollProgress, useJenkinsProgress } from '../../hooks/useWebSocket';
import { useToast } from '../../context/ToastContext';
import { useAuth } from '../../context/AuthContext';

export const DataPipeline: React.FC = () => {
  const { isAdmin } = useAuth();
  const { addToast } = useToast();
  const queryClient = useQueryClient();
  const [cancelling, setCancelling] = React.useState(false);

  const { data: pollStatus } = useQuery({ queryKey: ['pollStatus'], queryFn: fetchPollStatus, refetchInterval: 10_000 });
  const wsPoll = usePollProgress();
  const wsJenkins = useJenkinsProgress();
  const enrichMutation = useMutation({
    mutationFn: triggerJenkinsEnrichment,
    onSuccess: () => { addToast('success', 'Jenkins enrichment started'); queryClient.invalidateQueries({ queryKey: ['pollStatus'] }); },
    onError: () => addToast('danger', 'Failed to start enrichment'),
  });
  const retryItemsMutation = useMutation({
    mutationFn: retryFailedItems,
    onSuccess: (result) => { addToast('success', `Retried ${result.retried}: ${result.succeeded} succeeded, ${result.stillFailed} still failing`); queryClient.invalidateQueries({ queryKey: ['pollStatus'] }); },
    onError: () => addToast('danger', 'Retry failed'),
  });

  const enrichment = pollStatus?.enrichment;
  const totalLaunches = enrichment?.total ?? 0;
  const enrichedCount = (enrichment?.success ?? 0) + (enrichment?.mapped ?? 0);
  const noUrl = enrichment?.noUrl ?? 0;
  const authReq = enrichment?.authRequired ?? 0;
  const deleted = enrichment?.notFound ?? 0;
  const failedEnrich = enrichment?.failed ?? 0;
  const pendingCount = enrichment?.pending ?? 0;
  const retryableCount = failedEnrich + pendingCount;
  const completedTotal = enrichedCount + noUrl + authReq + deleted + failedEnrich;
  const jenkinsDone = totalLaunches > 0 && retryableCount === 0;
  const jenkinsDbPercent = totalLaunches > 0 ? Math.round((completedTotal / totalLaunches) * 100) : 0;

  const phase = wsPoll?.phase || pollStatus?.phase || '';
  const current = wsPoll?.current ?? pollStatus?.current ?? 0;
  const total = wsPoll?.total ?? pollStatus?.total ?? 0;
  const launchesActive = phase === 'fetching' || phase === 'starting';
  const itemsActive = phase === 'items';
  const anyPollActive = launchesActive || itemsActive;
  const jenkinsActive = !!(wsJenkins && (wsJenkins.phase === 'enriching' || wsJenkins.phase === 'mapping'));

  const pct = (c: number, t: number) => t > 0 ? Math.round((c / t) * 100) : 0;

  const message = wsPoll?.message || '';
  const hasErrors = message.includes('error') || message.includes('retries');
  const errorPart = hasErrors ? message.match(/\(([^)]+)\)/)?.[1] : null;

  const smoothedEtaRef = React.useRef<{ rp: number | null; items: number | null; jenkins: number | null }>({ rp: null, items: null, jenkins: null });

  const computeEta = (c: number, t: number, startedAt: number | null | undefined, key: 'rp' | 'items' | 'jenkins'): string => {
    if (!startedAt || t === 0) return '';
    if (c === 0 || c < t * 0.01) return 'Estimating...';
    const elapsed = Date.now() - startedAt;
    const rawRemaining = (elapsed / c) * (t - c);
    const prev = smoothedEtaRef.current[key];
    const smoothed = prev !== null ? Math.min(prev, prev * 0.7 + rawRemaining * 0.3) : rawRemaining;
    smoothedEtaRef.current[key] = smoothed;
    if (smoothed < 60_000) return `~${Math.max(1, Math.round(smoothed / 1000))}s remaining`;
    return `~${Math.round(smoothed / 60_000)}m remaining`;
  };

  const startedAt = wsPoll?.startedAt ?? pollStatus?.startedAt;
  const rpEta = launchesActive ? computeEta(current, total, startedAt, 'rp') : '';
  const itemsEta = itemsActive ? computeEta(current, total, startedAt, 'items') : '';
  const jenkinsEta = jenkinsActive && wsJenkins ? computeEta(wsJenkins.current, wsJenkins.total, wsJenkins.startedAt, 'jenkins') : '';

  if (!launchesActive) smoothedEtaRef.current.rp = null;
  if (!itemsActive) smoothedEtaRef.current.items = null;
  if (!jenkinsActive) smoothedEtaRef.current.jenkins = null;

  const missingItemCount = pollStatus?.missingItemCount ?? 0;
  const dataCoverage = pollStatus?.dataCoverageDays ?? 0;
  const configuredLookback = pollStatus?.configuredLookbackDays ?? 0;
  const pollWasCancelled = phase === 'cancelled';
  const coverageMismatch = pollWasCancelled && dataCoverage > 0 && configuredLookback > 0 && dataCoverage < configuredLookback * 0.8;

  if (!totalLaunches && !anyPollActive && !jenkinsActive && missingItemCount === 0) return null;

  const formatDays = (days: number): string => {
    if (days >= 30) return `${Math.round(days / 30)}mo`;
    return `${days}d`;
  };

  const cancelBtn = (
    <Button variant="plain" size="sm" aria-label="Cancel" isDisabled={cancelling}
      onClick={async () => { setCancelling(true); try { await cancelPoll(); } catch {} setCancelling(false); }}>
      <TimesIcon />
    </Button>
  );

  // Jenkins: parse live WebSocket message for error details
  const jenkinsMsg = wsJenkins?.message || '';
  // Extract just the non-enriched parts from the parenthesized section
  const jenkinsParenMatch = jenkinsMsg.match(/\((.+)\)\s*$/);
  const jenkinsLiveDetail = jenkinsParenMatch
    ? jenkinsParenMatch[1].split(', ').filter(p => !p.includes('enriched')).join(', ')
    : '';

  // Jenkins idle error summary from DB
  const jenkinsIdleErrors: string[] = [];
  if (!jenkinsActive) {
    if (failedEnrich > 0) jenkinsIdleErrors.push(`${failedEnrich} failed`);
    if (authReq > 0) jenkinsIdleErrors.push(`${authReq} auth required`);
    if (deleted > 0) jenkinsIdleErrors.push(`${deleted} deleted`);
  }

  return (
    <div className="app-enrichment-card">
      {/* Phase 1: Fetch Launches */}
      <div className="app-pipeline-phase">
        <Flex justifyContent={{ default: 'justifyContentSpaceBetween' }} alignItems={{ default: 'alignItemsCenter' }}>
          <FlexItem>
            <Flex alignItems={{ default: 'alignItemsCenter' }} spaceItems={{ default: 'spaceItemsSm' }}>
              <FlexItem><span className="app-font-13 app-font-bold">Launches</span></FlexItem>
              {launchesActive ? (
                <FlexItem><Label color="blue" isCompact>Fetching</Label></FlexItem>
              ) : totalLaunches > 0 ? (
                <>
                  <FlexItem><Label color="green" isCompact icon={<CheckCircleIcon />}>{totalLaunches.toLocaleString()}</Label></FlexItem>
                  {dataCoverage > 0 && (
                    <FlexItem>
                      <Tooltip content={coverageMismatch
                        ? `Data covers ${formatDays(dataCoverage)} but configured for ${formatDays(configuredLookback)}. Run "Clear All Data" and let it finish.`
                        : `Data covers ${formatDays(dataCoverage)}`}>
                        <Label color={coverageMismatch ? 'orange' : 'grey'} isCompact icon={coverageMismatch ? <ExclamationTriangleIcon /> : undefined}>
                          {formatDays(dataCoverage)}{coverageMismatch ? ` / ${formatDays(configuredLookback)}` : ''}
                        </Label>
                      </Tooltip>
                    </FlexItem>
                  )}
                </>
              ) : null}
            </Flex>
          </FlexItem>
          {launchesActive && (
            <FlexItem>
              <Flex alignItems={{ default: 'alignItemsCenter' }} spaceItems={{ default: 'spaceItemsSm' }}>
                <FlexItem>
                  <span className="app-text-xs app-text-muted">
                    {current.toLocaleString()} / {total.toLocaleString()}
                    {rpEta && <span className="app-opacity-dim"> &middot; {rpEta}</span>}
                  </span>
                </FlexItem>
                <FlexItem>{cancelBtn}</FlexItem>
              </Flex>
            </FlexItem>
          )}
        </Flex>
        {launchesActive && (
          <Progress value={pct(current, total)} size={ProgressSize.sm} measureLocation={ProgressMeasureLocation.outside} aria-label="Launch fetch progress" className="app-mt-xs" />
        )}
      </div>

      {/* Phase 2: Fetch Test Items */}
      {(itemsActive || totalLaunches > 0) && (
        <div className="app-pipeline-phase">
          <Flex justifyContent={{ default: 'justifyContentSpaceBetween' }} alignItems={{ default: 'alignItemsCenter' }}>
            <FlexItem>
              <Flex alignItems={{ default: 'alignItemsCenter' }} spaceItems={{ default: 'spaceItemsSm' }}>
                <FlexItem><span className="app-font-13 app-font-bold">Failed Test Items</span></FlexItem>
                {itemsActive ? (
                  <>
                    <FlexItem><Label color="blue" isCompact>Fetching</Label></FlexItem>
                    {missingItemCount > 0 && (
                      <FlexItem><Label color="red" isCompact icon={<ExclamationTriangleIcon />}>{missingItemCount.toLocaleString()} failed</Label></FlexItem>
                    )}
                  </>
                ) : missingItemCount > 0 ? (
                  <FlexItem><Label color="red" isCompact icon={<ExclamationTriangleIcon />}>{missingItemCount.toLocaleString()} missing</Label></FlexItem>
                ) : !anyPollActive && totalLaunches > 0 ? (
                  <FlexItem><Label color="green" isCompact icon={<CheckCircleIcon />}>
                    {pollStatus?.lastPollSummary?.testItems && pollStatus.lastPollSummary.testItems.total > 0
                      ? `${pollStatus.lastPollSummary.testItems.succeeded} / ${pollStatus.lastPollSummary.testItems.total} launches`
                      : 'Done'}
                  </Label></FlexItem>
                ) : null}
              </Flex>
            </FlexItem>
            {itemsActive && (
              <FlexItem>
                <Flex alignItems={{ default: 'alignItemsCenter' }} spaceItems={{ default: 'spaceItemsSm' }}>
                  <FlexItem>
                    <span className="app-text-xs app-text-muted">
                      {current.toLocaleString()} / {total.toLocaleString()} launches
                      {itemsEta && <span className="app-opacity-dim"> &middot; {itemsEta}</span>}
                    </span>
                  </FlexItem>
                  <FlexItem>{cancelBtn}</FlexItem>
                </Flex>
              </FlexItem>
            )}
          </Flex>
          {itemsActive && (
            <Progress value={pct(current, total)} size={ProgressSize.sm} measureLocation={ProgressMeasureLocation.outside} aria-label="Test items progress" className="app-mt-xs" />
          )}
          {!anyPollActive && missingItemCount > 0 && isAdmin && (
            <Button variant="link" size="sm" icon={<SyncAltIcon />} onClick={() => retryItemsMutation.mutate()} isLoading={retryItemsMutation.isPending} className="app-mt-xs">
              Fetch {missingItemCount.toLocaleString()} missing
            </Button>
          )}
        </div>
      )}

      {/* Phase 3: Jenkins Enrichment */}
      {totalLaunches > 0 && (
        <div className="app-pipeline-phase">
          <Flex justifyContent={{ default: 'justifyContentSpaceBetween' }} alignItems={{ default: 'alignItemsCenter' }}>
            <FlexItem>
              <Flex alignItems={{ default: 'alignItemsCenter' }} spaceItems={{ default: 'spaceItemsSm' }}>
                <FlexItem><span className="app-font-13 app-font-bold">Jenkins</span></FlexItem>
                {jenkinsActive ? (
                  <FlexItem><Label color="blue" isCompact>Enriching</Label></FlexItem>
                ) : jenkinsDone ? (
                  <FlexItem><Label color="green" isCompact icon={<CheckCircleIcon />}>Complete</Label></FlexItem>
                ) : retryableCount > 0 ? (
                  <FlexItem><Label color="orange" isCompact>{retryableCount.toLocaleString()} remaining</Label></FlexItem>
                ) : null}
                {jenkinsActive && jenkinsLiveDetail && (
                  <FlexItem><Label color="orange" isCompact icon={<ExclamationTriangleIcon />}>{jenkinsLiveDetail}</Label></FlexItem>
                )}
                {!jenkinsActive && jenkinsIdleErrors.length > 0 && (
                  <FlexItem>
                    <Tooltip content={jenkinsIdleErrors.join(', ')}>
                      <Label color="orange" isCompact icon={<ExclamationTriangleIcon />}>{jenkinsIdleErrors.join(', ')}</Label>
                    </Tooltip>
                  </FlexItem>
                )}
              </Flex>
            </FlexItem>
            <FlexItem>
              <Flex alignItems={{ default: 'alignItemsCenter' }} spaceItems={{ default: 'spaceItemsSm' }}>
                <FlexItem>
                  <span className="app-text-xs app-text-muted">
                    {jenkinsActive && wsJenkins
                      ? `${wsJenkins.current.toLocaleString()} / ${wsJenkins.total.toLocaleString()}`
                      : `${enrichedCount.toLocaleString()} enriched`}
                    {jenkinsEta && <span className="app-opacity-dim"> &middot; {jenkinsEta}</span>}
                  </span>
                </FlexItem>
                {jenkinsActive && <FlexItem>{cancelBtn}</FlexItem>}
              </Flex>
            </FlexItem>
          </Flex>
          {jenkinsActive && (
            <Progress
              value={wsJenkins ? pct(wsJenkins.current, wsJenkins.total) : 0}
              size={ProgressSize.sm}
              measureLocation={ProgressMeasureLocation.outside}
              aria-label="Jenkins enrichment progress"
              className="app-mt-xs"
            />
          )}
          {isAdmin && retryableCount > 0 && !jenkinsActive && !anyPollActive && (
            <Button variant="link" size="sm" icon={<SyncAltIcon />} onClick={() => enrichMutation.mutate()} isLoading={enrichMutation.isPending} className="app-mt-xs">
              Retry failed &amp; enrich remaining ({retryableCount.toLocaleString()})
            </Button>
          )}
        </div>
      )}
    </div>
  );
};
