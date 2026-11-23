import { Suspense } from "react";
import { ALL_EVENTS } from "@/lib/mockData";
import { filterEvents, parseFilters } from "@/lib/filterEvents";
import { SelectionProvider } from "@/components/SelectionProvider";
import { FilterBar } from "@/components/FilterBar";
import { EventList } from "@/components/EventList";
import { SummaryDrawer } from "@/components/SummaryDrawer";

interface DashboardPageProps {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}

/**
 * Server Component shell: the initial event load, the filter parsing and the
 * two-pane layout all run on the server. Only the interactive pieces below are
 * client components.
 */
export default async function DashboardPage({ searchParams }: DashboardPageProps) {
  const params = await searchParams;
  const filters = parseFilters(params);
  const events = filterEvents(ALL_EVENTS, filters.search, filters.severity);

  return (
    <SelectionProvider>
      <div style={{ display: "grid", gridTemplateColumns: "1.2fr 1fr", height: "100vh", overflow: "hidden" }}>
        <div style={{ borderRight: "1px solid #1e293b", display: "flex", flexDirection: "column", overflow: "hidden" }}>
          <FilterBar initialSearch={filters.search} initialSeverity={filters.severity} />
          <Suspense fallback={<div style={{ padding: "12px", color: "#94a3b8" }}>Loading events...</div>}>
            <EventList serverEvents={events} serverFilters={filters} />
          </Suspense>
        </div>

        <SummaryDrawer />
      </div>
    </SelectionProvider>
  );
}
