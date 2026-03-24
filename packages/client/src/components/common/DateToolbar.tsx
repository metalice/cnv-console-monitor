import React, { useEffect, useRef } from 'react';

import { Button, Divider, Flex, FlexItem, ToolbarGroup, ToolbarItem } from '@patternfly/react-core';
import { AngleLeftIcon, AngleRightIcon } from '@patternfly/react-icons';

import { type LookbackMode, useDate } from '../../context/DateContext';
import { usePreferences } from '../../context/PreferencesContext';

const todayStr = (): string => new Date().toISOString().split('T')[0];

const shiftDate = (dateStr: string, days: number): string => {
  const dateObj = new Date(`${dateStr}T12:00:00`);
  dateObj.setDate(dateObj.getDate() + days);
  return dateObj.toISOString().split('T')[0];
};

const RANGE_BUTTONS: { mode: Exclude<LookbackMode, 'range'>; label: string }[] = [
  { label: '24h', mode: '24h' },
  { label: '48h', mode: '48h' },
  { label: '7d', mode: '7d' },
  { label: '1M', mode: '1m' },
  { label: '3M', mode: '3m' },
  { label: '6M', mode: '6m' },
];

export const DateToolbar: React.FC = () => {
  const { dateFrom, dateTo, lookbackMode, setCustomRange, setLookbackMode } = useDate();
  const { loaded: prefsLoaded, preferences, setPreference } = usePreferences();
  const fromRef = useRef<HTMLInputElement>(null);
  const toRef = useRef<HTMLInputElement>(null);
  const initializedRef = useRef(false);

  useEffect(() => {
    if (prefsLoaded && !initializedRef.current && preferences.dateRange) {
      initializedRef.current = true;
      const validModes: LookbackMode[] = ['24h', '48h', '7d', '1m', '3m', '6m'];
      if (validModes.includes(preferences.dateRange as LookbackMode)) {
        setLookbackMode(preferences.dateRange as LookbackMode);
      }
    }
  }, [prefsLoaded, preferences.dateRange, setLookbackMode]);

  const handleSetLookbackMode = (mode: LookbackMode) => {
    setLookbackMode(mode);
    setPreference('dateRange', mode);
  };

  useEffect(() => {
    if (fromRef.current && fromRef.current.value !== dateFrom) {
      fromRef.current.value = dateFrom;
    }
  }, [dateFrom]);

  useEffect(() => {
    if (toRef.current && toRef.current.value !== dateTo) {
      toRef.current.value = dateTo;
    }
  }, [dateTo]);

  const shiftRange = (days: number) => {
    const newFrom = shiftDate(dateFrom, days);
    const newTo = shiftDate(dateTo, days);
    const today = todayStr();
    setCustomRange(newFrom, newTo > today ? today : newTo);
  };

  return (
    <ToolbarGroup>
      {RANGE_BUTTONS.map(({ label, mode }) => (
        <ToolbarItem key={mode}>
          <Button
            size="sm"
            variant={lookbackMode === mode ? 'primary' : 'secondary'}
            onClick={() => handleSetLookbackMode(mode)}
          >
            {label}
          </Button>
        </ToolbarItem>
      ))}
      <ToolbarItem>
        <Divider className="app-divider-vertical" orientation={{ default: 'vertical' }} />
      </ToolbarItem>
      <ToolbarItem>
        <Flex alignItems={{ default: 'alignItemsCenter' }} spaceItems={{ default: 'spaceItemsXs' }}>
          <FlexItem>
            <Button
              aria-label="Shift range back"
              size="sm"
              variant="plain"
              onClick={() => shiftRange(-1)}
            >
              <AngleLeftIcon />
            </Button>
          </FlexItem>
          <FlexItem>
            <input
              className="app-date-input"
              defaultValue={dateFrom}
              max={dateTo}
              ref={fromRef}
              type="date"
              onChange={e => {
                const inputValue = e.target.value;
                if (inputValue && /^\d{4}-\d{2}-\d{2}$/.test(inputValue) && inputValue <= dateTo) {
                  setCustomRange(inputValue, dateTo);
                }
              }}
            />
          </FlexItem>
          <FlexItem className="app-date-sep">—</FlexItem>
          <FlexItem>
            <input
              className="app-date-input"
              defaultValue={dateTo}
              max={todayStr()}
              min={dateFrom}
              ref={toRef}
              type="date"
              onChange={e => {
                const inputValue = e.target.value;
                if (
                  inputValue &&
                  /^\d{4}-\d{2}-\d{2}$/.test(inputValue) &&
                  inputValue >= dateFrom
                ) {
                  setCustomRange(dateFrom, inputValue);
                }
              }}
            />
          </FlexItem>
          <FlexItem>
            <Button
              aria-label="Shift range forward"
              isDisabled={dateTo >= todayStr()}
              size="sm"
              variant="plain"
              onClick={() => shiftRange(1)}
            >
              <AngleRightIcon />
            </Button>
          </FlexItem>
        </Flex>
      </ToolbarItem>
    </ToolbarGroup>
  );
};
