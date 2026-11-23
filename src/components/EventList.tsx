"use client";

import { useSearchParams } from "next/navigation";
import type { SystemEvent } from "@/lib/mockData";
import { useSelection } from "@/components/SelectionProvider";
import { EventRow } from "@/components/EventRow";
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
        <EventRow key={evt.id} event={evt} isSelected={selectedEvent?.id === evt.id} onSelect={selectEvent} />
      ))}
    </div>
  );
}
