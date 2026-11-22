# Worklog

## 2026-11-22 — Step 1: Server / client component split

### Goal
Turn the single `'use client'` page into a Server Component shell that loads the
initial event data, and move the interactive parts into small client components.
No bug fixes in this step, no API-route changes, no new dependencies.

### Files added
| File | Kind | Responsibility |
|---|---|---|
| `src/lib/filterEvents.ts` | shared lib | Pure `filterEvents()` plus `parseSearchParam` / `parseSeverityParam`. Mirrors `/api/events` matching so the RSC load and the client refetch agree. |
| `src/components/SelectionProvider.tsx` | client | Context holding `selectedEvent` + `selectEvent`, so the two sibling panes can share the selection without lifting state into the page. |
| `src/components/FilterBar.tsx` | client | The filter inputs and the `Page renders` counter. Behaviour copied from the starter code. |
| `src/components/EventList.tsx` | client | Renders rows from `initialEvents`, refetches `/api/events` when the URL query changes. |
| `src/components/SummaryDrawer.tsx` | client | Owns `summaryText` / `isStreaming` and the streaming fetch loop. |

### Files changed
- `src/app/page.tsx` — now an `async` Server Component. Awaits `searchParams`,
  filters `ALL_EVENTS` in-process, renders the same two-pane grid with the same
  inline styles. No `'use client'`, no hooks.
- `src/components/HeavyPayloadFormatter.tsx` — removed the `data-checksum`
  attribute from the rendered `div`. It was a time-dependent value derived from
  the busy-wait loop, so it produced a hydration mismatch between the server HTML
  and the client. The 12ms simulation itself is untouched.

### Files deliberately untouched
- `src/app/api/events/route.ts` (including the 150–550ms jitter)
- `src/app/api/stream-summary/route.ts`
- `src/lib/mockData.ts`
- `src/app/layout.tsx`, `next.config.mjs`, `package.json`
- `DECISIONS.md` (filled in at the end)

### How the pieces fit
`page.tsx` (server) computes `events` from the URL and renders
`<SelectionProvider>` around the layout. `FilterBar` writes the filter values into
the URL; `EventList` reacts to the URL and refetches; both panes read the current
selection from `SelectionProvider`. `SummaryDrawer` starts a stream whenever the
selected event changes.

`EventList` seeds its "last fetched query" ref from the server-rendered params, so
the first client paint does not duplicate the load the server already did.

### Verification
- `npx tsc --noEmit` — clean.
- `npm run build` — clean. Route table shows `/` as `ƒ` (dynamic), as expected
  because the page reads `searchParams`. `next build` added `target: ES2017` to
  `tsconfig.json` on its own.
- Browser pass at `localhost:3000`:
  - both panes render with the original styling;
  - clicking `evt_0001` streamed a full analysis and the header switched to
    `Analysis: evt_0001`;
  - typing `webhook` narrowed the list to `webhook-worker` rows;
  - the `Page renders` counter stayed at 8 through an entire streamed response,
    confirming tokens no longer re-render the filter bar or the row list;
  - no console errors other than the browser's `/favicon.ico` 404.

### Bug status after this step
- **Bug #1 (stream bleed): still live.** `SummaryDrawer` has no `AbortController`
  and no request-id guard. Its loop is a straight copy of the original.
- **Bug #2 (duplicate fetches, broken history): still live.** `FilterBar` still
  calls `router.push` on every keystroke with no debounce, and still pushes on
  mount. `EventList` refetches without cancelling the previous request, so a slow
  response can still overwrite a newer one.
- **Bug #3 (render cascade): partially addressed by construction.** `summaryText`
  now lives in `SummaryDrawer`, so tokens cannot reach the row list. The remaining
  work is memoizing the row and separating the formatter's static payload from the
  streaming text.

### Next step
Step 2 in `TASKS.md`: make the URL the single source of truth for filters —
debounce the input, `router.replace`, drop the state-mirroring effect, and guard
the `/api/events` request against out-of-order responses.
