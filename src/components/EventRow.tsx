"use client";

import { memo } from "react";
import type { SystemEvent } from "@/lib/mockData";

interface EventRowProps {
  event: SystemEvent;
  isSelected: boolean;
  /** Stable across renders (it is the context's `useCallback`), so memo holds. */
  onSelect: (event: SystemEvent) => void;
}

/**
 * One row, memoised on identity + selection flag. Selecting an event changes the
 * `isSelected` of exactly two rows, so without the memo all 500 rows re-render on
 * every click; with it, only the row that gained and the row that lost the
 * highlight do. Streaming never reaches this component at all.
 */
export const EventRow = memo(function EventRow({ event, isSelected, onSelect }: EventRowProps) {
  return (
    <div
      onClick={() => onSelect(event)}
      style={{
        padding: "12px 16px",
        borderBottom: "1px solid #1e293b",
        cursor: "pointer",
        background: isSelected ? "#1e293b" : "transparent",
        display: "flex",
        justifyContent: "space-between",
        alignItems: "center",
      }}
    >
      <div>
        <div style={{ fontSize: "14px", fontWeight: 500 }}>{event.title}</div>
        <div style={{ fontSize: "12px", color: "#64748b" }}>
          {event.id} · {event.timestamp}
        </div>
      </div>
      <span
        style={{
          fontSize: "11px",
          padding: "2px 8px",
          borderRadius: "999px",
          background:
            event.severity === "critical" ? "#7f1d1d" : event.severity === "warning" ? "#78350f" : "#1e3a8a",
          color: "#f8fafc",
        }}
      >
        {event.severity}
      </span>
    </div>
  );
});
