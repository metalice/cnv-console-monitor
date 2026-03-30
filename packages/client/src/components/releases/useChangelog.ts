import { useCallback, useEffect, useRef, useState } from 'react';

import { useQuery } from '@tanstack/react-query';

import {
  type ChangelogCorrection,
  type ChangelogResult,
  type ChangelogStatus,
  fetchChangelogStatus,
  saveChangelogEdits,
  startChangelogJob,
} from '../../api/ai';
import { fetchSubVersions } from '../../api/releases';

const POLL_INTERVAL_MS = 2000;
const POLL_START_DELAY_MS = 1000;
const STALE_TIME_MS = 5 * 60 * 1000;

export const useChangelog = (version: string) => {
  const [result, setResult] = useState<ChangelogResult | null>(null);
  const [targetVer, setTargetVer] = useState('');
  const [compareFrom, setCompareFrom] = useState('');
  const [compareEnabled, setCompareEnabled] = useState(false);
  const [editMode, setEditMode] = useState(false);
  const [pendingEdits, setPendingEdits] = useState<ChangelogCorrection[]>([]);
  const [savingEdits, setSavingEdits] = useState(false);
  const [jobStatus, setJobStatus] = useState<ChangelogStatus | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const pollRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const compareFromValue = compareEnabled && compareFrom ? compareFrom : undefined;

  const { data: subVersions } = useQuery({
    queryFn: () => fetchSubVersions(version),
    queryKey: ['subVersions', version],
    staleTime: STALE_TIME_MS,
  });

  useEffect(() => {
    if (subVersions?.length && !targetVer) {
      const latest = subVersions[subVersions.length - 1];
      setTargetVer(latest.name);
    }
  }, [subVersions, targetVer, setTargetVer]);

  const pollForResult = useCallback(() => {
    if (!targetVer) {
      return;
    }
    fetchChangelogStatus(targetVer, compareFromValue)
      .then(status => {
        setJobStatus(status);
        if (status.status === 'done' && status.changelog) {
          setResult({
            changelog: status.changelog,
            meta: status.meta ?? undefined,
          } as ChangelogResult);
          setIsGenerating(false);
        } else if (status.status === 'running') {
          setIsGenerating(true);
          pollRef.current = setTimeout(pollForResult, POLL_INTERVAL_MS);
        } else if (status.status === 'error') {
          setIsGenerating(false);
        }
        return undefined;
      })
      .catch(() => {
        /* no-op */
      });
  }, [targetVer, compareFromValue, setResult, setIsGenerating, setJobStatus]);

  useEffect(() => {
    if (!targetVer) {
      return;
    }
    pollForResult();
    return () => {
      if (pollRef.current) {
        clearTimeout(pollRef.current);
      }
    };
  }, [targetVer, compareFrom, pollForResult]);

  const startGeneration = async () => {
    setIsGenerating(true);
    setResult(null);
    setJobStatus({ progress: 'Starting...', status: 'running', step: 'starting' });
    try {
      await startChangelogJob(version, targetVer, compareFromValue);
      pollRef.current = setTimeout(pollForResult, POLL_START_DELAY_MS);
    } catch (err) {
      setJobStatus({
        error: err instanceof Error ? err.message : 'Failed to start',
        status: 'error',
      });
      setIsGenerating(false);
    }
  };

  const addEdit = (correction: ChangelogCorrection) => {
    setPendingEdits(prev => {
      const existing = prev.findIndex(
        e => e.key === correction.key && e.field === correction.field,
      );
      if (existing >= 0) {
        const next = [...prev];
        next[existing] = correction;
        return next;
      }
      return [...prev, correction];
    });
  };

  const handleSaveEdits = async () => {
    if (pendingEdits.length === 0) {
      return;
    }
    setSavingEdits(true);
    try {
      await saveChangelogEdits(version, pendingEdits, targetVer, compareFromValue);
      setPendingEdits([]);
      setEditMode(false);
      const status = await fetchChangelogStatus(targetVer, compareFromValue);
      if (status.status === 'done' && status.changelog) {
        setResult({
          changelog: status.changelog,
          meta: status.meta ?? undefined,
        } as ChangelogResult);
      }
    } catch {
      /* Save failed */
    }
    setSavingEdits(false);
  };

  const resetCompare = () => {
    setCompareFrom('');
    setResult(null);
  };

  return {
    addEdit,
    compareEnabled,
    compareFrom,
    editMode,
    handleSaveEdits,
    isGenerating,
    jobStatus,
    pendingEdits,
    resetCompare,
    result,
    savingEdits,
    setCompareEnabled,
    setCompareFrom,
    setEditMode,
    setPendingEdits,
    setResult,
    setTargetVer,
    startGeneration,
    subVersions,
    targetVer,
  };
};
