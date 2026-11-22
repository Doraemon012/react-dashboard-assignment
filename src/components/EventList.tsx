"use client";

import { useEffect, useRef, useState } from "react";
import { useSearchParams } from "next/navigation";
import type { SystemEvent } from "@/lib/mockData";
import { useSelection } from "@/components/SelectionProvider";

interface EventListProps {
  initialEvents: SystemEvent[];
  initialSearch: string;
  initialSeverity: string;
}

function buildQuery(search: string, severity: string): string {
  const params = new URLSearchParams();
  if (search) params.set("search", search);
  if (severity !== "all") params.set("severity", severity);
  return params.toString();
}

/**
 * NOTE: at this checkpoint the refetch is copied from the starter code — no
 * debounce, no AbortController and no response-order guard, so the race in
 * bug #2 is still live. Only the initial paint comes from the server now.
 */
export function EventList({ initialEvents, initialSearch, initialSeverity }: EventListProps) {
  const searchParams = useSearchParams();
  const { selectedEvent, selectEvent } = useSelection();

  const [events, setEvents] = useState<SystemEvent[]>(initialEvents);
  const [loadingEvents, setLoadingEvents] = useState(false);

  const search = searchParams.get("search") || "";
  const severity = searchParams.get("severity") || "all";
  const activeQuery = buildQuery(search, severity);

  // Seeded from the server-rendered query so the first client paint does not
  // fetch the same rows again.
  const lastFetchedQuery = useRef(buildQuery(initialSearch, initialSeverity));

  useEffect(() => {
    if (activeQuery === lastFetchedQuery.current) return;
    lastFetchedQuery.current = activeQuery;

    setLoadingEvents(true);
    fetch(`/api/events?${activeQuery}`)
      .then((res) => res.json())
      .then((data) => {
        setEvents(data.events || []);
        setLoadingEvents(false);
      });
  }, [activeQuery]);

  return (
    <div style={{ overflowY: "auto", flex: 1 }}>
      {loadingEvents && <div style={{ padding: "12px", color: "#94a3b8" }}>Loading events...</div>}
      {events.map((evt) => (
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
