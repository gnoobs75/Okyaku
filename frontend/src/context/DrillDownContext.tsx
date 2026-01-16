import { createContext, useCallback, useState, useEffect, ReactNode } from 'react';
import type { DrillDownItem, DrillDownContextType } from '@/types/drilldown';

export const DrillDownContext = createContext<DrillDownContextType | null>(null);

interface DrillDownProviderProps {
  children: ReactNode;
}

export function DrillDownProvider({ children }: DrillDownProviderProps) {
  const [stack, setStack] = useState<DrillDownItem[]>([]);

  const push = useCallback((item: Omit<DrillDownItem, 'id' | 'parentId'>) => {
    setStack(prev => {
      const id = crypto.randomUUID();
      const parentId = prev.length > 0 ? prev[prev.length - 1].id : undefined;
      return [...prev, { ...item, id, parentId } as DrillDownItem];
    });
  }, []);

  const pop = useCallback(() => {
    setStack(prev => prev.slice(0, -1));
  }, []);

  const popTo = useCallback((id: string) => {
    setStack(prev => {
      const index = prev.findIndex(item => item.id === id);
      return index >= 0 ? prev.slice(0, index + 1) : prev;
    });
  }, []);

  const clear = useCallback(() => {
    setStack([]);
  }, []);

  // Handle escape key - closes topmost modal
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && stack.length > 0) {
        e.preventDefault();
        pop();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [stack.length, pop]);

  // Prevent body scroll when modals are open
  useEffect(() => {
    if (stack.length > 0) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [stack.length]);

  return (
    <DrillDownContext.Provider
      value={{
        stack,
        push,
        pop,
        popTo,
        clear,
        isOpen: stack.length > 0,
      }}
    >
      {children}
    </DrillDownContext.Provider>
  );
}
