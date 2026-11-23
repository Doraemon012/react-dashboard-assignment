"use client";

import { useEffect, useRef, useState } from "react";
import { useSelection } from "@/components/SelectionProvider";
import { HeavyPayloadFormatter } from "@/components/HeavyPayloadFormatter";

/**
 * `AbortError` arrives as a DOMException from `fetch`, but check by name so a
 * non-DOM abort (or a wrapped error) is recognised too.
 */
function isAbortError(error: unknown): boolean {
  return typeof error === "object" && error !== null && (error as { name?: unknown }).name === "AbortError";
}

/**
 * Exactly one stream at a time, always for the event that is currently selected.
 *
 * - `abortController` holds the in-flight request. A new selection aborts it
 *   before the next one starts, and the effect cleanup aborts on unmount, so at
 *   most one response body is ever being read.
 * - `streamId` is the ordering guard. Aborting is not instantaneous, so a reader
 *   already parked in `read()` can still resolve afterwards; every write checks
 *   that its own generation is still the current one, which is what stops a late
 *   chunk from the previous event landing in the new event's summary.
 * - The effect is keyed on the event *id* plus `selectionNonce`, so selecting the
 *   same event again is a deliberate re-run (retry) rather than a silent no-op,
 *   while a new server payload carrying the same event does not restart a stream
 *   that is already correct.
 * - `isStreaming` is set in one place and cleared in a `finally` that only runs
 *   for the current generation, so a superseded stream cannot clear a newer
 *   one's indicator and the flag cannot get stuck.
 * - `stream` carries the id it belongs to. Clearing state inside the effect is
 *   one render too late: selecting B re-renders once with B's header and payload
 *   before the effect for B runs, which would paint A's partial text under it.
 *   The render below reads text/error only when their id matches the selection,
 *   so a stale summary is never shown for another event, not even for one frame.
 */
interface SummaryStreamState {
  /** Event the accumulated text and error belong to. */
  eventId: string | null;
  text: string;
  error: string | null;
}

export function SummaryDrawer() {
  const { selectedEvent, selectionNonce } = useSelection();
  const eventId = selectedEvent?.id ?? null;

  const [stream, setStream] = useState<SummaryStreamState>({ eventId: null, text: "", error: null });
  const [isStreaming, setIsStreaming] = useState(false);

  const abortController = useRef<AbortController | null>(null);
  const streamId = useRef(0);

  useEffect(() => {
    // New generation first: anything still parked in the previous stream's
    // `await` is already stale before this stream writes anything.
    const currentId = ++streamId.current;
    const isCurrent = () => streamId.current === currentId;

    abortController.current?.abort();
    abortController.current = null;

    setStream({ eventId, text: "", error: null });

    if (!eventId) {
      setIsStreaming(false);
      return;
    }

    const controller = new AbortController();
    abortController.current = controller;
    setIsStreaming(true);

    async function streamSummary(id: string) {
      let received = 0;
      // Both writes are keyed to this stream's event: if state has already moved
      // on to another event, the write is dropped instead of landing under it.
      const append = (chunk: string) =>
        setStream((prev) => (prev.eventId === id ? { ...prev, text: prev.text + chunk } : prev));
      const fail = (message: string) =>
        setStream((prev) => (prev.eventId === id ? { ...prev, error: message } : prev));

      try {
        const res = await fetch(`/api/stream-summary?eventId=${encodeURIComponent(id)}`, {
          signal: controller.signal,
        });
        if (!isCurrent()) return;

        if (!res.ok) {
          fail(`Summary request failed (HTTP ${res.status}).`);
          return;
        }
        if (!res.body) {
          fail("The summary response was empty.");
          return;
        }

        const reader = res.body.getReader();
        const decoder = new TextDecoder();

        for (;;) {
          const { done, value } = await reader.read();
          // Superseded mid-flight: drop the chunk and let the new stream own the
          // text and the indicator. The abort from the next effect run has
          // already cancelled this body.
          if (!isCurrent()) return;
          if (done) break;

          const chunk = decoder.decode(value, { stream: true });
          if (!chunk) continue;
          received += chunk.length;
          append(chunk);
        }

        // Flush a trailing partial code point if the stream ended mid-character.
        const tail = decoder.decode();
        if (tail) {
          received += tail.length;
          append(tail);
        }

        // A stream that closes without ever sending a token is a failure, not an
        // empty analysis.
        if (received === 0) {
          fail("The stream ended without any content.");
        }
      } catch (err) {
        // A superseded generation is expected and silent: the newer stream owns
        // the UI. An abort is the user's own action (new selection, unmount) and
        // must never surface as an error.
        if (!isCurrent() || controller.signal.aborted || isAbortError(err)) return;
        fail(
          received > 0
            ? "Stream interrupted — the analysis may be incomplete."
            : "Could not load the summary for this event."
        );
      } finally {
        // Only the current generation owns the flag; a stale stream must not
        // clear the indicator of the one that replaced it.
        if (isCurrent()) setIsStreaming(false);
      }
    }

    void streamSummary(eventId);

    return () => {
      // Invalidate this generation before cancelling it: a reader already parked
      // in `read()` then resolves against a stale id and drops its chunk instead
      // of writing to state after unmount.
      streamId.current += 1;
      controller.abort();
    };
  }, [eventId, selectionNonce]);

  // Only the current event's own text/error is ever shown. A summary belonging
  // to a previous selection reads as empty until its own stream fills it in.
  const summaryText = stream.eventId === eventId ? stream.text : "";
  const error = stream.eventId === eventId ? stream.error : null;

  return (
    <div style={{ padding: "20px", overflowY: "auto" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "16px" }}>
        <h2 style={{ margin: 0, fontSize: "18px" }}>
          {selectedEvent ? `Analysis: ${selectedEvent.id}` : "Incident Summary"}
        </h2>
        <div style={{ display: "flex", gap: "8px", alignItems: "center" }}>
          {isStreaming && <span style={{ fontSize: "12px", color: "#38bdf8" }}>Streaming tokens...</span>}
          {error && <span style={{ fontSize: "12px", color: "#f87171" }}>{error}</span>}
        </div>
      </div>

      <HeavyPayloadFormatter rawPayload={selectedEvent?.rawPayload || "{}"} summaryText={summaryText} />
    </div>
  );
}
