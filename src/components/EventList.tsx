"use client";

import { useSearchParams } from "next/navigation";
import type { SystemEvent } from "@/lib/mockData";
import { useSelection } from "@/components/SelectionProvider";
import {
  buildFiltersQuery,
  parseFiltersFromSearchParams,
  type EventFilters,
} from "@/lib/filterEvents";

interface EventListProps {
  /** Events the server rendered for `serverFilters`. */
  serverEvents: SystemEvent[];
  /** The filter pair `serverEvents` was computed for. */
  serverFilters: EventFilters;
}

/**
 * Rows are rendered straight from the server payload, which already holds the
 * filtered result for the URL query: a filter change is one RSC navigation, so
 * refetching the same rows from /api/events would be a duplicate load.
 *
 * That also removes the ordering problem entirely. A payload is only ever shown
 * as the result for the query it was computed for — when the URL has moved ahead
 * of the payload (navigation in flight) the previous rows stay visible under the
 * loading line instead of being presented as the new query's result.
 */
export function EventList({ serverEvents, serverFilters }: EventListProps) {
  const searchParams = useSearchParams();
  const { selectedEvent, selectEvent } = useSelection();

  const urlQuery = buildFiltersQuery(parseFiltersFromSearchParams(searchParams));
  const serverQuery = buildFiltersQuery(serverFilters);
  const isLoading = serverQuery !== urlQuery;

  return (
    <div style={{ overflowY: "auto", flex: 1 }}>
      {isLoading && <div style={{ padding: "12px", color: "#94a3b8" }}>Loading events...</div>}
      {serverEvents.map((evt) => (
        <div
          key={evt.id}
          onClick={() => selectEvent(evt)}
          style={{
            padding: "12px 16px",
            borderBottom: "1px solid #1e293b",
            cursor: "pointer",
            background: selectedEvent?.id === evt.id ? "#1e293b" : "transparent",
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
          }}
        >
          <div>
            <div style={{ fontSize: "14px", fontWeight: 500 }}>{evt.title}</div>
            <div style={{ fontSize: "12px", color: "#64748b" }}>
              {evt.id} · {evt.timestamp}
            </div>
          </div>
          <span
            style={{
              fontSize: "11px",
              padding: "2px 8px",
              borderRadius: "999px",
              background:
                evt.severity === "critical" ? "#7f1d1d" : evt.severity === "warning" ? "#78350f" : "#1e3a8a",
              color: "#f8fafc",
            }}
          >
            {evt.severity}
          </span>
        </div>
      ))}
    </div>
  );
}
