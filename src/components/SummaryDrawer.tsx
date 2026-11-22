"use client";

import { useEffect, useState } from "react";
import type { SystemEvent } from "@/lib/mockData";
import { useSelection } from "@/components/SelectionProvider";
import { HeavyPayloadFormatter } from "@/components/HeavyPayloadFormatter";

/**
 * NOTE: the streaming loop is copied from the starter code. It still has no
 * AbortController and no request-id guard, so bug #1 (token bleed between
 * events) remains reproducible at this checkpoint. Owning `summaryText` here
 * is purely structural: it moves the per-token state out of the page.
 */
export function SummaryDrawer() {
  const { selectedEvent } = useSelection();
  const [summaryText, setSummaryText] = useState("");
  const [isStreaming, setIsStreaming] = useState(false);

  useEffect(() => {
    if (!selectedEvent) return;

    setSummaryText("");
    setIsStreaming(true);

    async function streamSummary(event: SystemEvent) {
      const res = await fetch(`/api/stream-summary?eventId=${event.id}`);
      if (!res.body) return;

      const reader = res.body.getReader();
      const decoder = new TextDecoder();

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        const chunk = decoder.decode(value, { stream: true });
        setSummaryText((prev) => prev + chunk);
      }

      setIsStreaming(false);
    }

    void streamSummary(selectedEvent);
  }, [selectedEvent]);

  return (
    <div style={{ padding: "20px", overflowY: "auto" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "16px" }}>
        <h2 style={{ margin: 0, fontSize: "18px" }}>
          {selectedEvent ? `Analysis: ${selectedEvent.id}` : "Incident Summary"}
        </h2>
        {isStreaming && <span style={{ fontSize: "12px", color: "#38bdf8" }}>Streaming tokens...</span>}
      </div>

      <HeavyPayloadFormatter rawPayload={selectedEvent?.rawPayload || "{}"} summaryText={summaryText} />
    </div>
  );
}
