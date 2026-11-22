"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";

interface FilterBarProps {
  initialSearch: string;
  initialSeverity: string;
}

/**
 * NOTE: at this checkpoint the original filter behaviour is preserved verbatim —
 * local state pushed into the URL with an un-debounced effect, plus an extra
 * navigation on mount. Bug #2 (duplicate fetches / broken history) is fixed in a
 * later step; this file only relocates the markup out of the page component.
 */
export function FilterBar({ initialSearch, initialSeverity }: FilterBarProps) {
  const router = useRouter();
  const [search, setSearch] = useState(initialSearch);
  const [severity, setSeverity] = useState(initialSeverity);

  const renderCount = useRef(0);
  renderCount.current += 1;

  // Render-count is a client-only diagnostic; rendering it during SSR would
  // mismatch the client's extra StrictMode pass during hydration.
  const [isMounted, setIsMounted] = useState(false);
  useEffect(() => {
    setIsMounted(true);
  }, []);

  useEffect(() => {
    const params = new URLSearchParams();
    if (search) params.set("search", search);
    if (severity !== "all") params.set("severity", severity);
    router.push(`/?${params.toString()}`);
  }, [search, severity, router]);

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
        value={search}
        onChange={(e) => setSearch(e.target.value)}
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
        onChange={(e) => setSeverity(e.target.value)}
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
