import React from 'react';

import {
  Button,
  EmptyState,
  EmptyStateActions,
  EmptyStateBody,
  EmptyStateFooter,
  PageSection,
} from '@patternfly/react-core';
import { ExclamationCircleIcon } from '@patternfly/react-icons';

type Props = {
  children: React.ReactNode;
};

type State = {
  hasError: boolean;
  error?: Error;
};

export class ErrorBoundary extends React.Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error): State {
    return { error, hasError: true };
  }

  componentDidCatch(error: Error, info: React.ErrorInfo): void {
    // eslint-disable-next-line no-console -- error boundaries need console output for debugging
    console.error('ErrorBoundary caught:', error, info.componentStack);
  }

  render(): React.ReactNode {
    if (this.state.hasError) {
      return (
        <PageSection>
          <EmptyState
            headingLevel="h2"
            icon={ExclamationCircleIcon}
            status="danger"
            titleText="Something went wrong"
          >
            <EmptyStateBody>
              {this.state.error?.message || 'An unexpected error occurred.'}
            </EmptyStateBody>
            <EmptyStateFooter>
              <EmptyStateActions>
                <Button
                  variant="primary"
                  onClick={() => this.setState({ error: undefined, hasError: false })}
                >
                  Try Again
                </Button>
                <Button variant="link" onClick={() => window.location.reload()}>
                  Reload Page
                </Button>
              </EmptyStateActions>
            </EmptyStateFooter>
          </EmptyState>
        </PageSection>
      );
    }

    return this.props.children;
  }
}
