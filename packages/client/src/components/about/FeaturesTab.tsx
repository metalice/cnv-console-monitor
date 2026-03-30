import { Content, Grid, GridItem } from '@patternfly/react-core';

import { FeatureGroup } from './FeatureCard';
import { FEATURE_GROUPS } from './featureData';

export const FeaturesTab = () => (
  <div className="app-mt-lg">
    <Content className="app-text-muted app-mb-md" component="p">
      Expand each section to see detailed capabilities. Click &quot;Open&quot; to navigate directly
      to a feature.
    </Content>
    <Grid hasGutter>
      {FEATURE_GROUPS.map(group => (
        <GridItem key={group.title} md={6} span={12}>
          <FeatureGroup {...group} />
        </GridItem>
      ))}
    </Grid>
  </div>
);
