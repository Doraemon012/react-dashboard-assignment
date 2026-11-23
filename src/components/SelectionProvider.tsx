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
  /** Bumped on every `selectEvent` call, including a repeat of the same event. */
  selectionNonce: number;
  selectEvent: (event: SystemEvent) => void;
}

interface SelectionState {
  event: SystemEvent;
  nonce: number;
}

const SelectionContext = createContext<SelectionContextValue | null>(null);

export function SelectionProvider({ children }: { children: React.ReactNode }) {
  // Event and nonce travel together so they can never be observed out of sync.
  const [selection, setSelection] = useState<SelectionState | null>(null);

  const selectEvent = useCallback((event: SystemEvent) => {
    // Functional update: two clicks in one tick still each get their own nonce,
    // and re-selecting the same event is a new selection rather than a no-op
    // (React bails out of identical state, which used to swallow the re-click
    // and left a failed or finished summary with no way to retry it).
    setSelection((prev) => ({ event, nonce: (prev?.nonce ?? 0) + 1 }));
  }, []);

  const value = useMemo<SelectionContextValue>(
    () => ({ selectedEvent: selection?.event ?? null, selectionNonce: selection?.nonce ?? 0, selectEvent }),
    [selection, selectEvent]
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
