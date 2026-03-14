---
description: "Phase 1 development instructions for foundational implementation work in this repository."
---

# AI Debate Arena - Phase 1 Instructions (7 Day MVP Launch)

## Builder Context
This phase is optimized for a solo senior engineer building in evenings and weekends.

Working style assumptions:
- Heavy AI-assisted coding and rapid iteration
- Limited weekly hours
- Preference for shipping momentum over deep platform engineering

## Phase Goal
Launch a public, working MVP in 7 days.

Primary priority is shipping a usable product quickly, not building final architecture.

## Product Scope for MVP
The MVP must allow users to:
- Start AI debates
- Listen to spoken debates
- View generated images
- Intervene as a moderator
- View a final debate summary
- Share debates with others

## Stack and Platform
- Frontend: React + Vite
- AI: Google Gemini APIs
- Backend and data: Supabase Auth, Database, Realtime (if needed for MVP interactions)
- Hosting: Vercel or Netlify

## Solo Execution Rules (Phase 1)
- Build thin vertical slices that can be demoed daily.
- Keep tasks to 60-90 minute chunks so they fit evening sessions.
- Prefer boring, known tools over novel architecture.
- Use AI tools for scaffolding and refactors, then manually verify key flows.
- If a feature risks the 7-day timeline, ship a simpler version now and defer polish.

## Agent Guardrails (High-Autonomy Runs)
Use these rules when running with broad or auto-approval permissions.

Scope rules:
- Restrict all work to D:/DEV only.
- Always work on a dedicated feature branch.
- Keep each autonomous run to one bounded objective.

Safety rules:
- Never run destructive git commands (for example: reset --hard, checkout --, clean -fd) unless explicitly requested.
- Do not modify files outside this repository.
- Stop and ask before schema migrations, paid-service setup changes, or large dependency changes.

Approval policy recommendation:
- Auto-approve file edits and safe local commands (read, lint, build, test).
- Require approval for package install/remove commands.
- Require approval for git push or remote operations.

Quality gate before completion:
- Run lint and build.
- Summarize changed files and key decisions.
- List known issues and explicit next steps.

## Day-by-Day Delivery Plan

### Day 1: Authentication
Implement account access using Supabase Auth.

Required capabilities:
- Sign up
- Sign in
- Log out

Data requirement:
- Persist and reference user_id for all user-owned records.

### Day 2: Debate Persistence
Implement debate storage in Supabase.

Minimum schema:
- users
- debates: id, user_id, topic, created_at
- messages: id, debate_id, speaker, text, image_url, audio_url, timestamp

Requirements:
- Every debate session must persist.
- Every turn/message must persist.
- Stored records must support replay and sharing.

### Day 3: Shareable Debate Pages
Implement public route:
- /debate/:debateId

Page must show:
- Transcript
- Generated images
- Replay action
- AI verdict

SEO and social requirement:
- Add OpenGraph tags for debate pages so shared links render rich previews.

### Day 4: PWA Support
Add installable PWA behavior using vite-plugin-pwa.

Requirements:
- Add manifest.json
- Add service worker
- Ensure Add to Home Screen works on supported devices

### Day 5: Usage Limits
Implement basic usage control.

Baseline policy:
- Free users: 10 debates per day

Requirements:
- Track usage in database
- Enforce limits in backend, not only frontend

Image cost optimization for MVP:
- Default to bookend image generation: one image at debate start and one image at debate end.
- Do not generate per-turn images by default in Phase 1.
- If per-turn image generation is offered, mark it clearly as a higher-cost option.

### Day 6: Optional Payments
Optional for launch week. If implemented, add Stripe Checkout.

Baseline plan:
- Pro: 8 GBP per month

Pro unlock examples:
- Human vs human debates
- Longer debates
- Additional debate styles

If not implemented during 7 days, keep a clean integration point for Phase 2.

### Day 7: Landing Page
Create launch-ready landing page.

Sections:
- Hero
- Example debate
- Features
- Start debate CTA

Recommended demo:
- Einstein vs Elon Musk
- Topic: Should humans colonize Mars?

## Deployment in Phase 1 (Required)
Phase 1 includes a real public deployment, not only local completion.

Deployment source of truth:
- .github/instructions/DEPLOYMENT.md

Minimum required outcome:
- Public frontend URL
- Public backend URL
- Correct CORS configuration
- Verified end-to-end hosted run

## Definition of Done (MVP)
By the end of Phase 1:
- Users can sign up and authenticate
- Users can run debates and replay debates
- Debates can be shared publicly
- PWA install works
- App is publicly accessible on Vercel or Netlify

## Delivery Rules for Phase 1
- Prioritize end-to-end flow over polish
- Keep implementation simple and direct
- Defer non-critical refactoring
- Preserve clear logs and error messages for rapid debugging
- Update docs for any new setup requirements

## What to Defer to Phase 2
- Advanced deployment hardening and observability
- Zero-downtime migration strategy
- Full cost dashboards and automated budget controls
- Deep abuse prevention systems

## Explicit Non-Goals in Phase 1
- Full event-driven engine architecture
- Advanced multiplayer synchronization
- Full production observability and cost optimization
- Complex moderation and abuse systems

## Release Checklist
- Core user journey passes manually from sign-up to shared debate link
- No blocking console or network errors in core flows
- Basic error handling in auth, debate generation, and replay
- Environment variables documented
- Hosted app smoke test completed after deployment

## Optional Phase 1.5 (High-Impact Upgrades if Phase 2 Never Happens)
These are selected Phase 2 features that significantly improve fun and usability without requiring full production architecture.

### Priority Order
1. Auto verdict cards + one-click share
2. Highlight extraction (best quote, strongest argument, funniest line)
3. Lightweight server-side abuse guard (basic rate limiting + content filter)
4. Small debate lifecycle state layer for stability
5. Read-only live spectator room links (optional)

### Scope and Effort

#### 1) Auto verdict cards + one-click share
Outcome:
- Every finished debate generates a visual result card suitable for social sharing.

Why this matters:
- Largest boost to virality and perceived polish.

Estimated effort:
- 4 to 8 hours

#### 2) Highlight extraction
Outcome:
- Store and show 3 to 5 memorable moments from each debate.

Why this matters:
- Makes sessions rewatchable and more emotionally engaging.

Estimated effort:
- 2 to 5 hours

#### 3) Lightweight abuse guard
Outcome:
- Add simple per-user and per-IP request limits plus baseline prompt/content checks.

Why this matters:
- Protects budget and keeps the app available under spikes.

Estimated effort:
- 2 to 4 hours

#### 4) Small debate lifecycle state layer
Outcome:
- Introduce explicit debate statuses to reduce pause/resume/interrupt edge case bugs.

Why this matters:
- Improves session reliability and confidence without full engine rewrite.

Estimated effort:
- 4 to 6 hours

#### 5) Read-only live spectator room links (optional)
Outcome:
- Share a temporary link so others can watch a debate live without editing controls.

Why this matters:
- Adds social fun without implementing full multiplayer complexity.

Estimated effort:
- 5 to 10 hours

### If only two items are implemented
Implement these first:
- Verdict cards
- Highlights

