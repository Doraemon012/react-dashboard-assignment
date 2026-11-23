"use client";

/**
 * The streaming leaf: the only component whose output changes per token.
 * Cheap on purpose — it renders a string into a styled box and nothing else.
 */
export function SummaryOutput({ summaryText }: { summaryText: string }) {
  return (
    <div
      style={{
        background: "#1e293b",
        padding: "14px",
        borderRadius: "8px",
        border: "1px solid #334155",
        whiteSpace: "pre-wrap",
        lineHeight: 1.55,
        minHeight: "180px",
      }}
    >
      {summaryText || "Select an event to generate an AI incident analysis..."}
    </div>
  );
}
