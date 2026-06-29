import React, { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react';

export type OrbState = 'idle' | 'listening' | 'thinking' | 'needsReview' | 'syncing' | 'complete';

interface OrbContextType {
  orbState: OrbState;
  setOrbState: (state: OrbState) => void;
  flashComplete: () => void;
}

const OrbContext = createContext<OrbContextType | null>(null);

export function OrbProvider({ children }: { children: React.ReactNode }) {
  const [orbState, setOrbState] = useState<OrbState>('idle');
  const resetTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const flashComplete = useCallback(() => {
    if (resetTimer.current) clearTimeout(resetTimer.current);
    setOrbState('complete');
    resetTimer.current = setTimeout(() => setOrbState('idle'), 1800);
  }, []);

  useEffect(() => () => { if (resetTimer.current) clearTimeout(resetTimer.current); }, []);

  return (
    <OrbContext.Provider value={{ orbState, setOrbState, flashComplete }}>
      {children}
    </OrbContext.Provider>
  );
}

export function useOrb(): OrbContextType {
  const ctx = useContext(OrbContext);
  if (!ctx) throw new Error('useOrb must be used inside <OrbProvider>');
  return ctx;
}
