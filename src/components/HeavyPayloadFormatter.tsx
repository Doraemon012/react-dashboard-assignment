"use client";

import { RawPayloadView } from "@/components/RawPayloadView";
import { SummaryOutput } from "@/components/SummaryOutput";

/**
 * Layout shell for the two formatter halves, so the markup and styles are the
 * ones the starter shipped.
 *
 * The work is split by update frequency: `SummaryOutput` changes on every
 * streamed token, `RawPayloadView` is memoised and only re-formats when the
 * selected event changes. This wrapper itself is cheap — it exists to keep the
 * gap/stacking style in one place.
 */
export function HeavyPayloadFormatter({ rawPayload, summaryText }: { rawPayload: string; summaryText: string }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
      <SummaryOutput summaryText={summaryText} />
      <RawPayloadView rawPayload={rawPayload} />
    </div>
  );
}
