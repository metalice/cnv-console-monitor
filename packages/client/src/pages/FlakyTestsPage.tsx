import React from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  PageSection,
  Content,
  Card,
  CardBody,
  EmptyState,
  EmptyStateBody,
} from '@patternfly/react-core';
import { Table, Thead, Tr, Th, Tbody, Td } from '@patternfly/react-table';
import { CheckCircleIcon } from '@patternfly/react-icons';
import { fetchFlakyTests } from '../api/flaky';

export const FlakyTestsPage: React.FC = () => {
  const { data: tests, isLoading } = useQuery({
    queryKey: ['flakyTests'],
    queryFn: () => fetchFlakyTests(14, 30),
  });

  return (
    <>
      <PageSection>
        <Content component="h1">Flaky Tests</Content>
        <Content component="small">Tests that flip between pass and fail (last 14 days)</Content>
      </PageSection>

      <PageSection>
        <Card>
          <CardBody>
            {isLoading ? (
              <Content>Loading...</Content>
            ) : !tests?.length ? (
              <EmptyState icon={CheckCircleIcon} headingLevel="h4" titleText="No flaky tests!">
                <EmptyStateBody>No flaky tests detected. Nice!</EmptyStateBody>
              </EmptyState>
            ) : (
              <Table aria-label="Flaky tests">
                <Thead>
                  <Tr>
                    <Th>Test Name</Th>
                    <Th sort={{ columnIndex: 1, sortBy: { index: 1, direction: 'desc' } }}>Flips</Th>
                    <Th>Total Runs</Th>
                    <Th>Flip Rate</Th>
                  </Tr>
                </Thead>
                <Tbody>
                  {tests.map((t) => {
                    const shortName = t.name.split('.').pop() || t.name;
                    const flipRate = Math.round((t.flip_count / t.total_runs) * 100);
                    return (
                      <Tr key={t.unique_id}>
                        <Td dataLabel="Test Name">{shortName}</Td>
                        <Td dataLabel="Flips"><strong>{t.flip_count}</strong></Td>
                        <Td dataLabel="Total Runs">{t.total_runs}</Td>
                        <Td dataLabel="Flip Rate">{flipRate}%</Td>
                      </Tr>
                    );
                  })}
                </Tbody>
              </Table>
            )}
          </CardBody>
        </Card>
      </PageSection>
    </>
  );
};
