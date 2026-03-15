import React from 'react';
import { Card, CardBody, Content, Label } from '@patternfly/react-core';
import { Table, Thead, Tr, Th, Tbody, Td } from '@patternfly/react-table';
import type { AIMatrix } from './trendUtils';

type AIAccuracyTableProps = {
  aiMatrix: AIMatrix;
};

export const AIAccuracyTable: React.FC<AIAccuracyTableProps> = ({ aiMatrix }) => (
  <Card>
    <CardBody>
      <Content component="h3" className="app-section-heading">AI Prediction Accuracy</Content>
      <Content component="small" className="app-section-subheading">How often RP's AI prediction matches the actual triage classification (last 90 days)</Content>
      <div className="app-table-scroll">
        <Table aria-label="AI accuracy" variant="compact">
          <Thead>
            <Tr>
              <Th className="app-cell-nowrap">AI Predicted</Th>
              <Th>Accuracy</Th>
              {aiMatrix.actuals.map(actual => <Th key={actual} className="app-cell-nowrap">{actual}</Th>)}
            </Tr>
          </Thead>
          <Tbody>
            {aiMatrix.predictions.map(prediction => {
              const accuracyEntry = aiMatrix.accuracies.find(entry => entry.prediction === prediction);
              const accColor = (accuracyEntry?.accuracy || 0) > 60 ? 'green' : (accuracyEntry?.accuracy || 0) > 30 ? 'orange' : 'red';
              return (
                <Tr key={prediction}>
                  <Td className="app-cell-nowrap"><strong>{prediction.replace('Predicted ', '')}</strong></Td>
                  <Td><Label color={accColor} isCompact>{accuracyEntry?.accuracy || 0}%</Label></Td>
                  {aiMatrix.actuals.map(actual => {
                    const cellValue = aiMatrix.matrix.get(prediction)?.get(actual) || 0;
                    return <Td key={actual}>{cellValue || '-'}</Td>;
                  })}
                </Tr>
              );
            })}
          </Tbody>
        </Table>
      </div>
    </CardBody>
  </Card>
);
