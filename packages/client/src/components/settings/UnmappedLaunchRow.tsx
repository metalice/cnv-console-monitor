import { useState } from 'react';

import { Badge, Button, Flex, FlexItem } from '@patternfly/react-core';
import { AngleDownIcon, AngleRightIcon } from '@patternfly/react-icons';
import { Td, Tr } from '@patternfly/react-table';

import type { UnmappedEntry } from '../../api/componentMappings';
import { fetchLaunchDetails, type LaunchDetails } from '../../api/componentMappings';

import { UnmappedLaunchDetails } from './UnmappedLaunchDetails';

type UnmappedLaunchRowProps = {
  entry: UnmappedEntry;
  isAdmin: boolean;
  onMap: (name: string) => void;
};

export const UnmappedLaunchRow = ({ entry, isAdmin, onMap }: UnmappedLaunchRowProps) => {
  const [expanded, setExpanded] = useState(false);
  const [details, setDetails] = useState<LaunchDetails | null>(null);
  const [loading, setLoading] = useState(false);

  const handleToggle = async () => {
    if (!expanded && !details) {
      setLoading(true);
      try {
        setDetails(await fetchLaunchDetails(entry.name));
      } catch {
        /* Ignore */
      }
      setLoading(false);
    }
    setExpanded(!expanded);
  };

  return (
    <>
      <Tr isClickable onClick={handleToggle}>
        <Td>
          <Flex
            alignItems={{ default: 'alignItemsCenter' }}
            spaceItems={{ default: 'spaceItemsSm' }}
          >
            <FlexItem>{expanded ? <AngleDownIcon /> : <AngleRightIcon />}</FlexItem>
            <FlexItem>
              <code className="app-text-xs">{entry.name}</code>
            </FlexItem>
          </Flex>
        </Td>
        <Td>
          <Badge isRead>{entry.count}</Badge>
        </Td>
        {isAdmin && (
          <Td>
            <Button
              size="sm"
              variant="link"
              onClick={event => {
                event.stopPropagation();
                onMap(entry.name);
              }}
            >
              Map
            </Button>
          </Td>
        )}
      </Tr>
      {expanded && (
        <Tr>
          <Td className="app-expanded-row" colSpan={isAdmin ? 3 : 2}>
            <UnmappedLaunchDetails details={details} loading={loading} />
          </Td>
        </Tr>
      )}
    </>
  );
};
