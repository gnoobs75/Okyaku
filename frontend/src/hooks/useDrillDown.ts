import { useContext } from 'react';
import { DrillDownContext } from '@/context/DrillDownContext';
import type { DrillDownContextType } from '@/types/drilldown';

export function useDrillDown(): DrillDownContextType {
  const context = useContext(DrillDownContext);
  if (!context) {
    throw new Error('useDrillDown must be used within a DrillDownProvider');
  }
  return context;
}
