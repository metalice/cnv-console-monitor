import { useMemo } from 'react';

import type { LaunchGroup } from '@cnv-monitor/shared';

import { EmptyState, EmptyStateBody, Tooltip } from '@patternfly/react-core';

import { useNavigateToGroup } from '../../hooks/useNavigateToGroup';

type LaunchStatusMatrixProps = {
  groups: LaunchGroup[];
};

const healthClass = (health: string) => {
  if (health === 'green') {
    return 'app-matrix-cell-success';
  }
  if (health === 'red') {
    return 'app-matrix-cell-danger';
  }
  return 'app-matrix-cell-warning';
};

export const LaunchStatusMatrix = ({ groups }: LaunchStatusMatrixProps) => {
  const navigateToGroup = useNavigateToGroup();

  const { tiers, versions } = useMemo(() => {
    const versionSet = new Set<string>();
    const tierSet = new Set<string>();
    for (const group of groups) {
      versionSet.add(group.cnvVersion);
      tierSet.add(group.tier);
    }
    const sortedVersions = [...versionSet].sort((versionA, versionB) =>
      versionA.localeCompare(versionB, undefined, { numeric: true }),
    );
    const sortedTiers = [...tierSet].sort((tierA, tierB) =>
      tierA.localeCompare(tierB, undefined, { numeric: true }),
    );
    return { tiers: sortedTiers, versions: sortedVersions };
  }, [groups]);

  const groupMap = useMemo(() => {
    const map = new Map<string, LaunchGroup>();
    for (const group of groups) {
      map.set(`${group.cnvVersion}|${group.tier}`, group);
    }
    return map;
  }, [groups]);

  if (versions.length === 0 || tiers.length === 0) {
    return (
      <EmptyState variant="sm">
        <EmptyStateBody>No launches match the selected filters.</EmptyStateBody>
      </EmptyState>
    );
  }

  return (
    <div className="app-matrix-scroll">
      <table aria-label="Launch status matrix" className="app-status-matrix">
        <thead>
          <tr>
            <th className="app-matrix-header" />
            {tiers.map(tier => (
              <th className="app-matrix-header" key={tier}>
                {tier}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {versions.map(version => (
            <tr key={version}>
              <td className="app-matrix-row-label">
                <strong>{version}</strong>
              </td>
              {tiers.map(tier => {
                const group = groupMap.get(`${version}|${tier}`);
                if (!group) {
                  return <td className="app-matrix-cell app-matrix-cell-empty" key={tier} />;
                }
                return (
                  <td key={tier}>
                    <Tooltip
                      content={`${group.cnvVersion} ${group.tier}: ${group.passRate}% (${group.passedTests}/${group.totalTests - group.skippedTests} active${group.skippedTests > 0 ? `, ${group.skippedTests} skipped` : ''})`}
                    >
                      <button
                        aria-label={`${group.cnvVersion} ${group.tier}: ${group.passRate}% pass rate`}
                        className={`app-matrix-cell ${healthClass(group.health)}`}
                        type="button"
                        onClick={() => navigateToGroup(group)}
                      >
                        {Math.round(group.passRate)}%
                      </button>
                    </Tooltip>
                  </td>
                );
              })}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};
