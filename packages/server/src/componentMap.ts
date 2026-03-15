const TEAM_TO_COMPONENT: Record<string, string> = {
  'CNV User Interface': 'CNV User Interface',
  'CNV Network': 'CNV Networking',
  'Storage Platform': 'CNV Storage',
  'Storage Ecosystem': 'CNV Storage',
  'CNV Install, Upgrade and Operators': 'CNV Upgrade',
  'CNV Infrastructure': 'CNV Infrastructure',
  'CNV Virtualization': 'CNV Virtualization',
  'CNV Virt-Cluster': 'CNV Virtualization',
  'CNV QE DevOps': 'CNV QE DevOps',
};

const NAME_PATTERNS: Array<[RegExp, string]> = [
  [/console|ui/i, 'CNV User Interface'],
  [/network|ovn|sriov/i, 'CNV Networking'],
  [/storage|ocs|cdi|ceph|volume|velero/i, 'CNV Storage'],
  [/migration/i, 'CNV Live Migration'],
  [/upgrade|update/i, 'CNV Upgrade'],
  [/operator|hco/i, 'CNV Upgrade'],
  [/performance|scale/i, 'CNV Performance'],
];

export function mapTeamToComponent(team: string): string | null {
  if (!team) return null;
  const direct = TEAM_TO_COMPONENT[team];
  if (direct) return direct;

  const normalised = team.toLowerCase();
  for (const [canonical, component] of Object.entries(TEAM_TO_COMPONENT)) {
    if (normalised === canonical.toLowerCase()) return component;
  }
  return null;
}

export function mapLaunchNameToComponent(name: string): string | null {
  if (!name) return null;
  for (const [pattern, component] of NAME_PATTERNS) {
    if (pattern.test(name)) return component;
  }
  return null;
}

export function resolveComponent(team: string | null | undefined, launchName: string): string | null {
  if (team) {
    const fromTeam = mapTeamToComponent(team);
    if (fromTeam) return fromTeam;
  }
  return mapLaunchNameToComponent(launchName);
}

export interface JenkinsTeamInfo {
  team: string | null;
  testPath: string | null;
  marker: string | null;
}

export function parseJenkinsParams(params: Record<string, string>): JenkinsTeamInfo {
  let team: string | null = null;

  const jobMetaStr = params.JOB_METADATA;
  if (jobMetaStr) {
    try {
      const meta = JSON.parse(jobMetaStr);
      if (meta.team) team = meta.team;
    } catch {
      // malformed JSON
    }
  }

  if (!team) {
    team = params.DATA_TEAM_NAME || params.CNV_TEAM_NAME || null;
  }

  return {
    team,
    testPath: params.PYTEST_TEST_PATH || null,
    marker: params.PYTEST_MARKER || null,
  };
}
