# AI Debate App Implementation Plan

Branch: feature/mobile-telemetry-user-api-key
Date: 2026-03-11

## Scan Summary

- Frontend is primarily in src/components/GeminiSelfChatAudio.jsx with large inline layout logic and direct fetch calls to http://localhost:3001.
- App shell is in src/App.jsx and currently uses fixed desktop-oriented container classes (`h-screen`, `overflow-hidden`, fixed paddings).
- Backend is server/index.js and uses `process.env.GEMINI_API_KEY` globally; no user API key override path exists.
- Quota alerts exist in UI, but no usage telemetry counters/cost estimates are tracked or displayed.
- Current split-pane UI and drag divider are desktop-first and not optimized for small screens.

## Scope Requested

1. Add mobile-first layout polish.
2. Add cost/usage telemetry.
3. Add user-supplied Gemini API key flow.

---

## Item 1: Mobile-First Layout Polish

### Goal
Make the app comfortably usable on phones/tablets with responsive hierarchy, no clipped panels, and touch-friendly controls.

### Implementation Plan

1. App shell responsiveness:
- Update App container to use mobile-safe viewport sizing (`min-h-dvh` fallback behavior).
- Reduce paddings/text density on small screens; scale up progressively on larger breakpoints.

2. Debate layout responsiveness:
- Convert desktop split area to responsive stack:
  - Mobile: transcript/control panel first, persona/image panel second (vertical).
  - Desktop: current side-by-side behavior remains.
- Keep drag divider desktop-only.

3. Width/height behavior:
- Disable percentage split sizing on mobile and force full-width panels.
- Prevent clipping by allowing right-side container overflow behavior suited to mobile card growth.

4. Responsive component sections:
- Avatar stage: stack cards on narrow screens; side-by-side on larger screens.
- Transcript/image panel heights: use natural vertical flow on mobile.
- Buttons/selects/input keep touch-friendly size.

5. Validation:
- Run file error checks.
- Verify no desktop regressions in split behavior.

### Acceptance Criteria
- No clipped right-side content on mobile widths.
- Controls remain reachable without horizontal scrolling.
- Transcript and persona cards readable at phone size.
- Desktop split-and-drag still works.

---

## Item 2: Cost/Usage Telemetry

### Goal
Expose practical session usage metrics and rough cost visibility so users understand API consumption.

### Implementation Plan

1. Telemetry model in frontend session state:
- Track endpoint call counts:
  - self-chat-turn
  - tts
  - image
  - classify-interrupt
  - generate-setup
  - debate-summary
- Track success/failure and quota-hit counters.

2. Hook fetch wrappers:
- Introduce centralized API helper(s) in GeminiSelfChatAudio.jsx for counting calls.
- Replace direct fetch calls with wrapped helpers.

3. Rough cost estimation:
- Add configurable per-call estimate table (documented as approximation).
- Compute rolling session estimate and display with clear disclaimer.

4. UI panel:
- Add compact telemetry section (counts + estimated cost) in left panel.
- Keep mobile-safe and collapsible if needed.

5. Validation:
- Confirm counts increment on each relevant action.
- Ensure errors/quota still handled as before.

### Acceptance Criteria
- Users can see per-endpoint usage counts.
- Users can see approximate session cost estimate.
- Existing debate flow remains stable.

---

## Item 3: User-Supplied Gemini API Key

### Goal
Allow users to paste their own Gemini key so they can run the app with personal API quota.

### Implementation Plan

1. Frontend key management:
- Add API key input UI (masked) with save/clear controls.
- Store in localStorage only on user action.
- Add helper link to AI Studio key page.

2. Request transport:
- Send key in custom header (e.g., `x-gemini-api-key`) for all backend API calls.
- Keep current environment key as fallback when user key not provided.

3. Backend key resolution:
- Add utility in server/index.js to resolve active key per request:
  - request header key if present
  - else process.env.GEMINI_API_KEY
- Update all model/fetch paths to use resolved key.
- Return clear error if no key available.

4. Security and UX notes:
- Keep key client-side and in request headers only.
- Do not log raw key in server logs.
- Show active-key status in UI (using personal key vs server default).

5. Validation:
- Test with user key set and unset.
- Confirm all endpoints behave with either key source.

### Acceptance Criteria
- User can provide personal Gemini key and run debate features.
- App works with fallback env key if no user key set.
- Missing-key state shows clear actionable message.

---

## Execution Order (One-by-One)

1. Implement Item 1 (mobile-first layout).
2. Validate and checkpoint.
3. Implement Item 2 (telemetry).
4. Validate and checkpoint.
5. Implement Item 3 (user API key).
6. Final validation and summary.
