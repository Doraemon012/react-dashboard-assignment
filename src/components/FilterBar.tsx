"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import {
  buildFiltersHref,
  buildFiltersQuery,
  parseFiltersFromSearchParams,
  parseSeverityParam,
  type EventFilters,
  type SeverityFilter,
} from "@/lib/filterEvents";

const SEARCH_DEBOUNCE_MS = 300;

interface FilterBarProps {
  initialSearch: string;
  initialSeverity: SeverityFilter;
}

/**
 * The URL is the single source of truth for both filters: this component never
 * mirrors props back into state, it only publishes its draft to the URL.
 *
 * - `searchInput` is a draft so the field never lags behind typing; a search edit
 *   is debounced, while `severity` is a discrete choice and publishes at once.
 * - Publishing uses `router.push`, so each *settled* filter change is exactly one
 *   history entry: Back/Forward step between filter states instead of walking a
 *   query one letter at a time (the debounce is what keeps it from flooding).
 * - Back/Forward is the only way the URL changes from outside this component, and
 *   `popstate` is the browser's signal for exactly that, so it is the only place
 *   the draft is re-adopted from the URL.
 */
export function FilterBar({ initialSearch, initialSeverity }: FilterBarProps) {
  const router = useRouter();
  const [searchInput, setSearchInput] = useState(initialSearch);
  const [severity, setSeverity] = useState<SeverityFilter>(initialSeverity);

  // Last filter pair this component wrote to (or read from) the URL. Seeding it
  // from the server-rendered params means mounting never triggers a navigation.
  const appliedFilters = useRef<EventFilters>({ search: initialSearch, severity: initialSeverity });

  /** Write one filter pair to the URL and remember it as the published one. */
  const publish = useCallback(
    (next: EventFilters) => {
      appliedFilters.current = next;
      router.push(buildFiltersHref(next), { scroll: false });
    },
    [router]
  );

  const renderCount = useRef(0);
  renderCount.current += 1;

  // Render-count is a client-only diagnostic; rendering it during SSR would
  // mismatch the client's extra StrictMode pass during hydration.
  const [isMounted, setIsMounted] = useState(false);
  useEffect(() => {
    setIsMounted(true);
  }, []);

  useEffect(() => {
    const next: EventFilters = { search: searchInput, severity };
    const applied = appliedFilters.current;
    if (buildFiltersQuery(next) === buildFiltersQuery(applied)) return;

    // A severity change is one discrete choice: publish it now, together with
    // whatever search text is already in the box, instead of parking it behind
    // the search debounce. Only a search-only edit waits.
    if (next.severity !== applied.severity) {
      publish(next);
      return;
    }

    const timer = setTimeout(() => {
      // A Back/Forward (or any other publish) replaces `appliedFilters`, which
      // makes this draft stale: dropping it keeps the debounce from pushing a
      // URL the user has already navigated away from.
      if (appliedFilters.current !== applied) return;
      publish(next);
    }, SEARCH_DEBOUNCE_MS);
    return () => clearTimeout(timer);
  }, [searchInput, severity, publish]);

  useEffect(() => {
    function handlePopState() {
      const filters = parseFiltersFromSearchParams(new URLSearchParams(window.location.search));
      appliedFilters.current = filters;
      setSearchInput(filters.search);
      setSeverity(filters.severity);
    }

    window.addEventListener("popstate", handlePopState);
    return () => window.removeEventListener("popstate", handlePopState);
  }, []);

  return (
    <div
      style={{
        padding: "16px",
        borderBottom: "1px solid #1e293b",
        display: "flex",
        gap: "12px",
        alignItems: "center",
      }}
    >
      <input
        type="text"
        value={searchInput}
        onChange={(e) => setSearchInput(e.target.value)}
        placeholder="Filter by service, title, or ID..."
        style={{
          flex: 1,
          padding: "8px 12px",
          borderRadius: "6px",
          border: "1px solid #334155",
          background: "#1e293b",
          color: "#f8fafc",
        }}
      />
      <select
        value={severity}
        onChange={(e) => setSeverity(parseSeverityParam(e.target.value))}
        style={{
          padding: "8px 12px",
          borderRadius: "6px",
          border: "1px solid #334155",
          background: "#1e293b",
          color: "#f8fafc",
        }}
      >
        <option value="all">All Severities</option>
        <option value="info">Info</option>
        <option value="warning">Warning</option>
        <option value="critical">Critical</option>
      </select>
      <span style={{ fontSize: "12px", color: "#64748b" }}>
        Page renders: {isMounted ? renderCount.current : null}
      </span>
    </div>
  );
}
