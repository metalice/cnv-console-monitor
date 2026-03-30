import { Button } from '@patternfly/react-core';

export const ImpersonationButton = () => {
  const currentImpersonation = new URLSearchParams(window.location.search).get('impersonate');

  if (currentImpersonation) {
    return (
      <Button
        size="sm"
        variant="link"
        onClick={() => {
          const url = new URL(window.location.href);
          url.searchParams.delete('impersonate');
          window.location.href = url.toString();
        }}
      >
        Stop impersonating {currentImpersonation}
      </Button>
    );
  }

  return (
    <Button
      size="sm"
      variant="secondary"
      onClick={() => {
        const url = new URL(window.location.href);
        url.searchParams.set('impersonate', 'testuser@redhat.com');
        window.location.href = url.toString();
      }}
    >
      Impersonate Test User
    </Button>
  );
};
