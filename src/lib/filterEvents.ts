import type { Severity, SystemEvent } from "@/lib/mockData";

export const ALL_SEVERITIES = "all";

export type SeverityFilter = Severity | typeof ALL_SEVERITIES;

export interface EventFilters {
  search: string;
  severity: SeverityFilter;
}

/**
 * Pure filter shared by the server render and any client-side caller. Mirrors the
 * matching rules implemented in /api/events so both entry points always agree on
 * which events a given query should return.
 */
export function filterEvents(events: SystemEvent[], search: string, severity: SeverityFilter): SystemEvent[] {
  const normalizedSearch = search.toLowerCase().trim();

  return events.filter((evt) => {
    const matchesSeverity = severity === ALL_SEVERITIES || evt.severity === severity;
    const matchesSearch =
      !normalizedSearch ||
      evt.title.toLowerCase().includes(normalizedSearch) ||
      evt.service.toLowerCase().includes(normalizedSearch) ||
      evt.id.toLowerCase().includes(normalizedSearch);

    return matchesSeverity && matchesSearch;
  });
}

type QueryParam = string | string[] | null | undefined;

function firstValue(value: QueryParam): string {
  if (Array.isArray(value)) return value[0] ?? "";
  return value ?? "";
}

function parseSearchParam(value: QueryParam): string {
  return firstValue(value);
}

export function parseSeverityParam(value: QueryParam): SeverityFilter {
  const candidate = firstValue(value);
  return candidate === "info" || candidate === "warning" || candidate === "critical" ? candidate : ALL_SEVERITIES;
}

/**
 * The one way to read filters out of the URL. Everything that consumes the query
 * (server render, filter inputs) goes through here, so an unknown or oddly cased
 * `severity` can never mean two different things in two places.
 */
export function parseFilters(params: { [key: string]: QueryParam }): EventFilters {
  return {
    search: parseSearchParam(params.search),
    severity: parseSeverityParam(params.severity),
  };
}

export function parseFiltersFromSearchParams(params: URLSearchParams): EventFilters {
  return parseFilters({ search: params.get("search"), severity: params.get("severity") });
}

/** Canonical query string for a filter pair, used for both `/` and `/api/events`. */
export function buildFiltersQuery(filters: EventFilters): string {
  const params = new URLSearchParams();
  if (filters.search) params.set("search", filters.search);
  if (filters.severity !== ALL_SEVERITIES) params.set("severity", filters.severity);
  return params.toString();
}

export function buildFiltersHref(filters: EventFilters): string {
  const query = buildFiltersQuery(filters);
  return query ? `/?${query}` : "/";
}
