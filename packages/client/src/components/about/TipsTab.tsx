import {
  Card,
  CardBody,
  CardTitle,
  DescriptionList,
  DescriptionListDescription,
  DescriptionListGroup,
  DescriptionListTerm,
  Grid,
  GridItem,
  Label,
  List,
  ListItem,
} from '@patternfly/react-core';

export const TipsTab = () => (
  <div className="app-mt-lg">
    <Grid hasGutter>
      <GridItem md={6} span={12}>
        <Card>
          <CardTitle>Keyboard Shortcuts</CardTitle>
          <CardBody>
            <DescriptionList isHorizontal>
              <DescriptionListGroup>
                <DescriptionListTerm>
                  <Label isCompact>Cmd/Ctrl + S</Label>
                </DescriptionListTerm>
                <DescriptionListDescription>
                  Save settings when on the Settings page
                </DescriptionListDescription>
              </DescriptionListGroup>
            </DescriptionList>
          </CardBody>
        </Card>
      </GridItem>
      <GridItem md={6} span={12}>
        <Card>
          <CardTitle>URL Parameters</CardTitle>
          <CardBody>
            <DescriptionList isCompact isHorizontal>
              <DescriptionListGroup>
                <DescriptionListTerm>
                  <Label isCompact>?components=a,b</Label>
                </DescriptionListTerm>
                <DescriptionListDescription>Filter by components</DescriptionListDescription>
              </DescriptionListGroup>
              <DescriptionListGroup>
                <DescriptionListTerm>
                  <Label isCompact>?version=4.18</Label>
                </DescriptionListTerm>
                <DescriptionListDescription>
                  Filter dashboard by CNV version
                </DescriptionListDescription>
              </DescriptionListGroup>
              <DescriptionListGroup>
                <DescriptionListTerm>
                  <Label isCompact>?tiers=TIER-1,TIER-2</Label>
                </DescriptionListTerm>
                <DescriptionListDescription>Filter by test tiers</DescriptionListDescription>
              </DescriptionListGroup>
            </DescriptionList>
          </CardBody>
        </Card>
      </GridItem>
      <GridItem md={6} span={12}>
        <Card>
          <CardTitle>Pro Tips</CardTitle>
          <CardBody>
            <List>
              <ListItem>
                The <strong>global component filter</strong> in the masthead persists across all
                pages — set it once and every page filters accordingly.
              </ListItem>
              <ListItem>
                Use the <strong>date range selector</strong> in the masthead to control the lookback
                window. Custom date ranges are supported.
              </ListItem>
              <ListItem>
                Copy any page URL to share a <strong>filtered view</strong> with your team — filters
                are encoded in the URL.
              </ListItem>
              <ListItem>
                <strong>Bulk triage</strong> on the Failures page: select multiple items with
                checkboxes, then classify them all at once.
              </ListItem>
              <ListItem>
                Click a <strong>test name</strong> anywhere to open its Test Profile with full
                history and streak data.
              </ListItem>
              <ListItem>
                The <strong>Activity</strong> nav item shows a badge when there is new activity
                since your last visit.
              </ListItem>
            </List>
          </CardBody>
        </Card>
      </GridItem>
      <GridItem md={6} span={12}>
        <Card>
          <CardTitle>Data &amp; Sync</CardTitle>
          <CardBody>
            <List>
              <ListItem>
                Data is synced from ReportPortal on a schedule (default: every 15 minutes). You can
                trigger a manual sync from the masthead.
              </ListItem>
              <ListItem>
                A <strong>full backfill</strong> re-fetches all historical data (up to 180 days).
                Use this after first setup or when data seems stale.
              </ListItem>
              <ListItem>
                Jenkins enrichment adds component, team, and tier metadata from build parameters. It
                runs automatically after each sync.
              </ListItem>
              <ListItem>
                The <strong>pipeline activity log</strong> in Settings shows detailed progress and
                error messages for each sync run.
              </ListItem>
            </List>
          </CardBody>
        </Card>
      </GridItem>
    </Grid>
  </div>
);
