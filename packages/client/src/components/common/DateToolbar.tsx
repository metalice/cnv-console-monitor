import React, { useEffect, useRef } from 'react';
import { Button, Divider, Flex, FlexItem, ToolbarGroup, ToolbarItem } from '@patternfly/react-core';
import { AngleLeftIcon, AngleRightIcon } from '@patternfly/react-icons';
import { useDate, type LookbackMode } from '../../context/DateContext';
import { usePreferences } from '../../context/PreferencesContext';

const todayStr = (): string =>
  new Date().toISOString().split('T')[0];

const shiftDate = (dateStr: string, days: number): string => {
  const dateObj = new Date(dateStr + 'T12:00:00');
  dateObj.setDate(dateObj.getDate() + days);
  return dateObj.toISOString().split('T')[0];
};

const RANGE_BUTTONS: { mode: Exclude<LookbackMode, 'range'>; label: string }[] = [
  { mode: '24h', label: '24h' },
  { mode: '48h', label: '48h' },
  { mode: '7d', label: '7d' },
  { mode: '1m', label: '1M' },
  { mode: '3m', label: '3M' },
  { mode: '6m', label: '6M' },
];


export const DateToolbar: React.FC = () => {
  const { dateFrom, dateTo, lookbackMode, setCustomRange, setLookbackMode } = useDate();
  const { preferences, loaded: prefsLoaded, setPreference } = usePreferences();
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
    setCustomRange(
      newFrom,
      newTo > today ? today : newTo,
    );
  };

  return (
    <ToolbarGroup>
      {RANGE_BUTTONS.map(({ mode, label }) => (
        <ToolbarItem key={mode}>
          <Button variant={lookbackMode === mode ? 'primary' : 'secondary'} size="sm" onClick={() => handleSetLookbackMode(mode)}>{label}</Button>
        </ToolbarItem>
      ))}
      <ToolbarItem>
        <Divider orientation={{ default: 'vertical' }} className="app-divider-vertical" />
      </ToolbarItem>
      <ToolbarItem>
        <Flex alignItems={{ default: 'alignItemsCenter' }} spaceItems={{ default: 'spaceItemsXs' }}>
          <FlexItem>
            <Button variant="plain" aria-label="Shift range back" size="sm" onClick={() => shiftRange(-1)}>
              <AngleLeftIcon />
            </Button>
          </FlexItem>
          <FlexItem>
            <input
              ref={fromRef}
              type="date"
              defaultValue={dateFrom}
              max={dateTo}
              onChange={(e) => {
                const inputValue = e.target.value;
                if (inputValue && /^\d{4}-\d{2}-\d{2}$/.test(inputValue) && inputValue <= dateTo) {
                  setCustomRange(inputValue, dateTo);
                }
              }}
              className="app-date-input"
            />
          </FlexItem>
          <FlexItem className="app-date-sep">—</FlexItem>
          <FlexItem>
            <input
              ref={toRef}
              type="date"
              defaultValue={dateTo}
              min={dateFrom}
              max={todayStr()}
              onChange={(e) => {
                const inputValue = e.target.value;
                if (inputValue && /^\d{4}-\d{2}-\d{2}$/.test(inputValue) && inputValue >= dateFrom) {
                  setCustomRange(dateFrom, inputValue);
                }
              }}
              className="app-date-input"
            />
          </FlexItem>
          <FlexItem>
            <Button variant="plain" aria-label="Shift range forward" size="sm" onClick={() => shiftRange(1)} isDisabled={dateTo >= todayStr()}>
              <AngleRightIcon />
            </Button>
          </FlexItem>
        </Flex>
      </ToolbarItem>
    </ToolbarGroup>
  );
};
