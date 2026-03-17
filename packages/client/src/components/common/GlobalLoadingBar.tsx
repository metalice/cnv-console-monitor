import React from 'react';
import { useIsFetching } from '@tanstack/react-query';

export const GlobalLoadingBar: React.FC = () => {
  const fetching = useIsFetching();
  if (fetching === 0) return null;
  return <div className="app-global-loading-bar" />;
};
