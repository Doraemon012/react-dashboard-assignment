"use client";

import { memo } from "react";

/**
 * The static half of the formatter: expensive synchronous "markdown /
 * highlighting" work over the raw telemetry payload.
 *
 * Memoised on `rawPayload` because that string only changes when a different
 * event is selected. Without the memo this work re-ran on every streamed token
 * (summary text used to be a prop of the same component), which is what made
 * streaming feel sluggish.
 */
export const RawPayloadView = memo(function RawPayloadView({ rawPayload }: { rawPayload: string }) {
  // Simulate ~12ms of synchronous formatting work, now once per payload.
  const start = performance.now();
  while (performance.now() - start < 12) {
    // busy-wait: stands in for markdown parsing / syntax highlighting
  }

  return (
    <details open>
      <summary style={{ cursor: "pointer", color: "#94a3b8", fontSize: "13px" }}>Raw Telemetry Payload</summary>
      <pre
        style={{
          background: "#020617",
          padding: "12px",
          borderRadius: "6px",
          fontSize: "12px",
          overflowX: "auto",
        }}
      >
        {rawPayload}
      </pre>
    </details>
  );
});
