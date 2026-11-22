import type { Severity, SystemEvent } from "@/lib/mockData";

export const ALL_SEVERITIES = "all";

export type SeverityFilter = Severity | typeof ALL_SEVERITIES;

/**
 * Pure filter shared by the RSC initial load and (later) the client refetch path.
 * Mirrors the matching rules implemented in /api/events so both entry points
 * always agree on which events a given query should return.
 */
export function filterEvents(events: SystemEvent[], search: string, severity: string): SystemEvent[] {
  const normalizedSearch = search.toLowerCase().trim();
  const activeSeverity = severity || ALL_SEVERITIES;

  return events.filter((evt) => {
    const matchesSeverity = activeSeverity === ALL_SEVERITIES || evt.severity === activeSeverity;
    const matchesSearch =
      !normalizedSearch ||
      evt.title.toLowerCase().includes(normalizedSearch) ||
      evt.service.toLowerCase().includes(normalizedSearch) ||
      evt.id.toLowerCase().includes(normalizedSearch);

    return matchesSeverity && matchesSearch;
  });
}

export function parseSearchParam(value: string | string[] | undefined): string {
  return typeof value === "string" ? value : "";
}

export function parseSeverityParam(value: string | string[] | undefined): SeverityFilter {
  const candidate = typeof value === "string" ? value : "";
  return candidate === "info" || candidate === "warning" || candidate === "critical" ? candidate : ALL_SEVERITIES;
}
