"use client";

import { createContext, useCallback, useContext, useMemo, useState } from "react";
import type { SystemEvent } from "@/lib/mockData";

/**
 * Selection lives here because the left pane (EventList) and the right pane
 * (SummaryDrawer) are siblings rendered by the Server Component shell.
 * A client context keeps that shared state out of the RSC and lets each pane
 * subscribe to only what it needs.
 */
interface SelectionContextValue {
  selectedEvent: SystemEvent | null;
  selectEvent: (event: SystemEvent) => void;
}

const SelectionContext = createContext<SelectionContextValue | null>(null);

export function SelectionProvider({ children }: { children: React.ReactNode }) {
  const [selectedEvent, setSelectedEvent] = useState<SystemEvent | null>(null);

  const selectEvent = useCallback((event: SystemEvent) => {
    setSelectedEvent(event);
  }, []);

  const value = useMemo<SelectionContextValue>(
    () => ({ selectedEvent, selectEvent }),
    [selectedEvent, selectEvent]
  );

  return <SelectionContext.Provider value={value}>{children}</SelectionContext.Provider>;
}

export function useSelection(): SelectionContextValue {
  const context = useContext(SelectionContext);
  if (!context) {
    throw new Error("useSelection must be used inside a SelectionProvider");
  }
  return context;
}
