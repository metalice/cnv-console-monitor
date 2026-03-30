import { type PublicConfig } from '@cnv-monitor/shared';

import { Grid, GridItem } from '@patternfly/react-core';

import { type TestProfile } from '../../api/testProfile';

import { FailureStreakCard } from './FailureStreakCard';
import { TestIdentityCard } from './TestIdentityCard';
import { TestProfileTables } from './TestProfileTables';

type TestProfileDetailsProps = {
  profile: TestProfile;
  config?: PublicConfig;
  latestFailedRpId: number | null;
  onClassify: (ids: number[]) => void;
  onCreateBug: (info: { rpId: number; name: string; polarionId?: string }) => void;
  onLinkJira: (rpId: number) => void;
};

export const TestProfileDetails = ({
  config,
  latestFailedRpId,
  onClassify,
  onCreateBug,
  onLinkJira,
  profile,
}: TestProfileDetailsProps) => (
  <Grid hasGutter>
    <GridItem md={4} span={12}>
      <TestIdentityCard
        config={config}
        identity={profile.identity}
        latestFailedRpId={latestFailedRpId}
        onClassify={onClassify}
        onCreateBug={onCreateBug}
        onLinkJira={onLinkJira}
      />
    </GridItem>
    <GridItem md={8} span={12}>
      <FailureStreakCard streak={profile.streak} />
    </GridItem>
    <TestProfileTables
      affectedLaunches={profile.affectedLaunches}
      history={profile.history}
      triageHistory={profile.triageHistory}
    />
  </Grid>
);
