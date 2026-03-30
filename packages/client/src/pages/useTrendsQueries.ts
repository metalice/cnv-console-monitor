import { useMemo } from 'react';

import { useQuery } from '@tanstack/react-query';

import {
  fetchAIAccuracy,
  fetchClusterReliability,
  fetchDefectTypesTrend,
  fetchErrorPatterns,
  fetchFailuresByHour,
  fetchHeatmap,
  fetchTopFailures,
  fetchTrends,
  fetchTrendsByVersion,
} from '../api/launches';
import {
  buildAIMatrix,
  buildHeatmap,
  buildVersionGroups,
  computeSummaryStats,
  computeVersionHealth,
} from '../components/trends/trendUtils';
import { useComponentFilter } from '../context/ComponentFilterContext';

export const useTrendsQueries = () => {
  const { selectedComponent } = useComponentFilter();

  const { data: trends } = useQuery({
    queryFn: () => fetchTrends('', 30, selectedComponent),
    queryKey: ['trends', selectedComponent],
  });
  const { data: versionTrends, isLoading: versionLoading } = useQuery({
    queryFn: () => fetchTrendsByVersion(30, selectedComponent),
    queryKey: ['trendsByVersion', selectedComponent],
  });
  const { data: heatmapData, isLoading: heatmapLoading } = useQuery({
    queryFn: () => fetchHeatmap(14, 20, selectedComponent),
    queryKey: ['heatmap', selectedComponent],
  });
  const { data: topFailures, isLoading: topLoading } = useQuery({
    queryFn: () => fetchTopFailures(30, 15, selectedComponent),
    queryKey: ['topFailures', selectedComponent],
  });
  const { data: aiAccuracy } = useQuery({
    queryFn: () => fetchAIAccuracy(90, selectedComponent),
    queryKey: ['aiAccuracy', selectedComponent],
  });
  const { data: clusterData } = useQuery({
    queryFn: () => fetchClusterReliability(30, selectedComponent),
    queryKey: ['clusterReliability', selectedComponent],
  });
  const { data: errorPatterns } = useQuery({
    queryFn: () => fetchErrorPatterns(30, 10, selectedComponent),
    queryKey: ['errorPatterns', selectedComponent],
  });
  const { data: defectTrend } = useQuery({
    queryFn: () => fetchDefectTypesTrend(90, selectedComponent),
    queryKey: ['defectTypesTrend', selectedComponent],
  });
  const { data: hourlyData } = useQuery({
    queryFn: () => fetchFailuresByHour(30, selectedComponent),
    queryKey: ['failuresByHour', selectedComponent],
  });

  const summaryStats = useMemo(() => computeSummaryStats(trends), [trends]);
  const versionGroups = useMemo(() => buildVersionGroups(versionTrends), [versionTrends]);
  const heatmap = useMemo(() => buildHeatmap(heatmapData), [heatmapData]);
  const aiMatrix = useMemo(() => buildAIMatrix(aiAccuracy), [aiAccuracy]);
  const versionHealth = useMemo(() => computeVersionHealth(versionTrends), [versionTrends]);

  return {
    aiMatrix,
    clusterData,
    defectTrend,
    errorPatterns,
    heatmap,
    heatmapLoading,
    hourlyData,
    summaryStats,
    topFailures,
    topLoading,
    versionGroups,
    versionHealth,
    versionLoading,
  };
};
