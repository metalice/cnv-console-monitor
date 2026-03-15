import React, { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import {
  PageSection,
  Content,
  Card,
  CardBody,
  Label,
  Flex,
  FlexItem,
  Spinner,
  EmptyState,
  EmptyStateBody,
  Bullseye,
  Tooltip,
} from '@patternfly/react-core';
import { TrendUpIcon, TrendDownIcon, EqualsIcon, CubesIcon } from '@patternfly/react-icons';
import { fetchComponentHealth, type ComponentHealthSummary } from '../api/componentHealth';
import { useDate } from '../context/DateContext';

function passRateColor(rate: number): string {
  if (rate >= 95) return 'var(--pf-t--global--color--status--success--default)';
  if (rate >= 80) return 'var(--pf-t--global--color--status--warning--default)';
  return 'var(--pf-t--global--color--status--danger--default)';
}

function passRateLabelColor(rate: number): 'green' | 'gold' | 'red' {
  if (rate >= 95) return 'green';
  if (rate >= 80) return 'gold';
  return 'red';
}

function Stat({ value, label, color, help }: { value: number; label: string; color?: string; help: string }) {
  return (
    <Tooltip content={help}>
      <div style={{ textAlign: 'center', minWidth: 70, cursor: 'help' }}>
        <div style={{ fontSize: 22, fontWeight: 700, color: color ?? 'inherit' }}>{value}</div>
        <div className="app-text-muted" style={{ fontSize: 11, whiteSpace: 'nowrap' }}>{label}</div>
      </div>
    </Tooltip>
  );
}

export const ComponentHealthPage: React.FC = () => {
  const navigate = useNavigate();
  const { since, until, displayLabel } = useDate();

  useEffect(() => {
    document.title = 'Component Health | CNV Console Monitor';
  }, []);

  const { data: components, isLoading } = useQuery({
    queryKey: ['componentHealth', since, until],
    queryFn: () => fetchComponentHealth(since, until),
  });

  if (isLoading) {
    return (
      <PageSection>
        <Bullseye style={{ minHeight: 300 }}>
          <Spinner aria-label="Loading component health" />
        </Bullseye>
      </PageSection>
    );
  }

  if (!components?.length) {
    return (
      <PageSection>
        <EmptyState icon={CubesIcon} headingLevel="h4" titleText="No components found">
          <EmptyStateBody>No component data available yet. Components are assigned during polling.</EmptyStateBody>
        </EmptyState>
      </PageSection>
    );
  }

  return (
    <>
      <PageSection>
        <Content component="h1">Component Health</Content>
        <Content component="small">Health overview per component ({displayLabel}). Trend compares to the previous equivalent period.</Content>
      </PageSection>

      <PageSection>
        {components.map((c) => {
          const barColor = passRateColor(c.passRate);
          const labelColor = passRateLabelColor(c.passRate);
          return (
            <Card
              key={c.component}
              isClickable
              isSelectable
              onClick={() => navigate(`/failures?component=${encodeURIComponent(c.component)}`)}
              style={{ cursor: 'pointer', marginBottom: 'var(--pf-t--global--spacer--md)' }}
            >
              <CardBody>
                <Flex alignItems={{ default: 'alignItemsCenter' }} flexWrap={{ default: 'nowrap' }}>
                  {/* Component name + trend */}
                  <FlexItem style={{ minWidth: 220 }}>
                    <div style={{ fontSize: 16, fontWeight: 600 }}>{c.component}</div>
                    <div style={{ marginTop: 4 }}>
                      <Tooltip content={`Trend compares the pass rate in the selected period (${c.passRate}%) against the previous equivalent period. Improving = current is 3%+ higher, Worsening = current is 3%+ lower.`}>
                        <span>
                          {c.trend === 'improving' && <Label color="green" isCompact icon={<TrendUpIcon />}>Improving</Label>}
                          {c.trend === 'worsening' && <Label color="red" isCompact icon={<TrendDownIcon />}>Worsening</Label>}
                          {c.trend === 'stable' && <Label color="grey" isCompact icon={<EqualsIcon />}>Stable</Label>}
                        </span>
                      </Tooltip>
                    </div>
                  </FlexItem>

                  {/* Pass rate with bar */}
                  <FlexItem style={{ minWidth: 180 }}>
                    <Tooltip content={`Pass rate = number of launches with PASSED status / total launches for this component in the selected period. ${c.totalLaunches - c.failedLaunches} passed out of ${c.totalLaunches} total.`}>
                      <Flex alignItems={{ default: 'alignItemsCenter' }} spaceItems={{ default: 'spaceItemsMd' }} style={{ cursor: 'help' }}>
                        <FlexItem>
                          <Label color={labelColor} style={{ fontSize: 22, padding: '4px 14px', fontWeight: 700 }}>{c.passRate}%</Label>
                        </FlexItem>
                        <FlexItem style={{ flex: 1, maxWidth: 120 }}>
                          <div className="app-progress-track" style={{ height: 8 }}>
                            <div style={{ width: `${c.passRate}%`, height: '100%', background: barColor, borderRadius: 'var(--pf-t--global--border--radius--small)', transition: 'width 0.3s' }} />
                          </div>
                        </FlexItem>
                      </Flex>
                    </Tooltip>
                  </FlexItem>

                  {/* Stats */}
                  <Flex flex={{ default: 'flex_1' }} justifyContent={{ default: 'justifyContentSpaceEvenly' }} alignItems={{ default: 'alignItemsCenter' }}>
                    <FlexItem>
                      <Stat value={c.totalLaunches} label="Launches" help="Total number of test launches (runs) for this component in the selected time period." />
                    </FlexItem>
                    <FlexItem>
                      <Stat value={c.failedLaunches} label="Failed" color={c.failedLaunches > 0 ? 'var(--pf-t--global--color--status--danger--default)' : undefined}
                        help="Number of launches with FAILED status. A launch is failed if any test in it failed." />
                    </FlexItem>
                    <FlexItem>
                      <Stat value={c.untriagedCount} label="Untriaged" color={c.untriagedCount > 0 ? 'var(--pf-t--global--color--status--warning--default)' : undefined}
                        help="Number of unique failing tests that have not been classified yet (no defect type assigned). Each test is counted once regardless of how many launches it failed in." />
                    </FlexItem>
                    <FlexItem>
                      <Stat value={c.flakyCount} label="Flaky" color={c.flakyCount > 0 ? 'var(--pf-t--global--color--status--warning--default)' : undefined}
                        help="Number of unique tests that flipped between PASSED and FAILED across launches in the selected period. Flaky tests are unreliable and need investigation." />
                    </FlexItem>
                    <FlexItem>
                      <Stat value={c.worseningCount} label="Worsening" color={c.worseningCount > 0 ? 'var(--pf-t--global--color--status--danger--default)' : undefined}
                        help="Number of failing tests whose failure rate increased in the second half of the period compared to the first half. These tests are getting worse over time." />
                    </FlexItem>
                  </Flex>
                </Flex>
              </CardBody>
            </Card>
          );
        })}
      </PageSection>
    </>
  );
};
