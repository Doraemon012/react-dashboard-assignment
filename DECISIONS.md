# Frontend Architecture & Debugging Decisions

## 1. Root-Cause Diagnosis

**Stream cross-contamination.** `SummaryDrawer` started a `fetch` per selection and kept no handle
on it: no `AbortController`, no request id, no `catch`. Every reader loop ended with
`setSummaryText((prev) => prev + chunk)` with no idea which event the chunk belonged to, and the
next selection only reset the text — it did not stop the old reader. So two readers appended into
one state and the last writer won, which is how Event A's tail appeared under Event B.

The same loop caused the stuck spinner: `setIsStreaming(false)` ran only after the loop reached
`done`, so the `if (!res.body) return` branch skipped it, and a rejected `fetch` skipped it too
while also becoming an unhandled rejection.

**Duplicate fetches & broken history.** Two defects compounded. The filter inputs published to the
URL in an un-debounced effect and did it once on mount as well, so one typing burst produced one
navigation per character and history filled with letter-level entries. Separately, `EventList`
fetched `/api/events` on every query change with no cancellation, while the same navigation already
re-rendered the page server-side with the filtered rows: one edit cost two loads of the same data,
and because `/api/events` has 150–550ms of jitter, a slow response could land after a newer one and
overwrite it.

**Render cascade.** The streamed text was page state and `HeavyPayloadFormatter` received it as a
prop while doing ~12ms of busy-wait formatting work on *every* render. Each token therefore
re-rendered the page — all 500 rows with it — and re-ran the formatter, which is what made typing
and scrolling sluggish while a summary streamed.

## 2. Server vs. Client Component Boundaries

`src/app/page.tsx` is an `async` Server Component. It awaits `searchParams`, parses them with the
shared `parseFilters`, filters `ALL_EVENTS` in-process and renders the two-pane shell with its
inline styles. The initial row load, the query parsing and the layout therefore cost no client JS
and no client round trip, and the first paint is already the correct filtered list. `layout.tsx`
stays a plain server layout.

Client components are only the parts that need interactivity or browser state: `FilterBar` (input
drafts, debounce, router, `popstate`), `EventList` (`useSearchParams` for the ordering guard),
`SummaryDrawer` (streaming state), `SelectionProvider` (shared selection), and the leaves
`EventRow` / `SummaryOutput` / `RawPayloadView`. `EventList` sits in a `Suspense` boundary because
it reads `useSearchParams`.

What crosses the boundary is plain serializable data: `serverEvents: SystemEvent[]` and
`serverFilters: EventFilters` (page → `EventList`), `initialSearch` / `initialSeverity` (page →
`FilterBar`). `SystemEvent` is JSON-shaped (id, title, service, severity, timestamp, rawPayload).
Nothing functional crosses — `selectEvent` and the selected event stay inside the client tree via
context, which is also why the selection does not need to be lifted into the RSC.

## 3. Stream Cancellation & Race-Condition Strategy

One `AbortController` per stream, held in a ref. Starting a stream aborts the previous one, and the
effect cleanup aborts on unmount, so a new selection asks the old request to stop before it starts
its own. That is a request rather than a guarantee: an abort does not synchronously tear down the
previous reader, it just means nothing downstream will use whatever that reader still returns.

Aborting is not instantaneous — a reader already parked in `await reader.read()` can still resolve
afterwards. So cancellation is backed by a generation counter (`streamId`) that is bumped in the
cleanup *before* the abort, and every state write is gated on `isCurrent()` after the `await`
resolves. A late chunk from a superseded reader fails that check and is dropped instead of
appended. The accumulated text and error are also tagged with the event id they belong to, and the
drawer renders them only when that id matches the current selection: clearing state in the effect
happens one render too late, and without the tag the frame between "B selected" and "B's effect
ran" would paint A's partial text under B's header.

`AbortError` and aborted signals are swallowed explicitly (checked by `name`, since wrapping varies
between browsers), so nothing surfaces as an unhandled rejection or an error banner. `isStreaming`
is set in one place and cleared in a `finally` that only the current generation may run, so a
superseded stream cannot clear a newer one's indicator, and every failure path — non-2xx, missing
body, zero-byte body, mid-stream error, network error — reaches that `finally`. A stream that
closes without ever sending a byte is reported as incomplete rather than as an empty analysis.

**A → B → A quickly:** the second A is a new generation with its own controller. The first A's
reader fails `isCurrent()` on its next chunk and its `finally` is a no-op, so the old stream
contributes nothing and cannot touch the new stream's flag. `selectionNonce` makes re-selecting the
same event a deliberate restart (a retry after a failure or a finished report), while a re-render
that merely carries the same event does not restart anything.

**Filter changes are not part of this.** The selection is client state and the drawer's event only
changes on a click, so a filter navigation cannot make a running stream append to a different
event. What it does instead is leave the stream running for the event still shown on the right,
which is why the two panes can legitimately disagree (an event can be filtered out of the list
while its analysis continues and stays on screen). Aborting on every filter edit was rejected: it
would throw away the analysis a user is reading to make the list narrower.

## 4. State Synchronization & Render Performance

**Filters.** The URL is the single source of truth, and there is no URL → state mirroring effect,
which is what removes the feedback loop. The input keeps a local draft so typing never lags, and
one effect publishes it: a severity change publishes immediately, because a select change is one
discrete choice, while a search-only edit arms a 300ms timer. The last published pair lives in an
`appliedFilters` ref, seeded from the server-rendered params, and the effect bails when the draft
already matches it — so mounting navigates nothing and a value already in the URL is never
republished. A pending timer drops itself if `appliedFilters.current` is no longer the object it
captured; replacing that ref (a publish, or a Back/Forward adoption) is exactly the "this draft was
superseded" signal, so no extra request ids are needed.

`router.push` rather than `replace` is deliberate: `replace` creates no history entry, so Back left
the page instead of restoring a filter state. The debounce is what keeps history from flooding —
one entry per *settled* change, not one per keystroke. The trade-off is that repeated severity
toggles each cost a Back press. Back/Forward is adopted through `popstate`, the only case where the
URL changes from outside this component; in-app pushes fire no `popstate`, so the handler cannot
fight the component's own navigations.

**Rows.** `EventList` renders the server payload instead of refetching `/api/events`, which removes
the duplicate load and the out-of-order overwrite in one move. `isLoading = serverQuery !== urlQuery`
keeps the payload honest: if the URL has moved ahead of the payload, the previous rows stay under
the `Loading events...` line instead of being presented as the new query's results. Trade-off:
`/api/events` is now unused by this page. Keeping both it and the RSC payload is what produced the
duplicate, and the RSC one wins because it also renders the first paint.

**Render performance.** The summary text lives in `SummaryDrawer`, a sibling of `EventList`, so
token updates never reach the row list or the filter bar at all. `SummaryOutput` is the only
component whose output changes per token and it does nothing but render a string; `RawPayloadView`
is memoised on `rawPayload`, so the ~12ms of formatting runs once per selected event instead of once
per token; `EventRow` is memoised on a stable `selectEvent`, so a click re-renders the two rows whose
highlight changed rather than all 500.

The drawer and the `HeavyPayloadFormatter` wrapper do re-render per token — they own and forward the
state — which is deliberate: the wrapper is three style props and two children, and moving memo
boundaries around it would buy nothing. During a full streamed report the built-in `Page renders`
counter stayed at 4 and only moved when a filter navigation installed a new server payload. The
row-level isolation was likewise an observation rather than a proof: temporary render counters,
since removed from the shipped tree, logged 0 `EventRow` and 0 `RawPayloadView` renders against
roughly 120 `SummaryOutput` renders for that stream. Both numbers describe what was seen during
testing; neither is enforced by a test in the repo.
