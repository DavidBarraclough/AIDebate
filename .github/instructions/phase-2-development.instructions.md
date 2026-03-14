---
description: "Phase 2 development instructions for hardening, polish, and release readiness in this repository."
---

# AI Debate Arena - Phase 2 Instructions (Full Production Platform)

## Builder Context
Phase 2 should remain realistic for a solo builder.

Approach:
- Ship production readiness in increments
- Prefer one major subsystem at a time
- Avoid parallel rewrites across frontend, backend, and data in the same week

## Phase Goal
Evolve the shipped MVP into a scalable, reliable AI product platform.

Primary priority is architecture, reliability, growth features, and sustainable operating cost.

## Phase 1.5 Carryover Rule
Some capabilities may already be implemented in Optional Phase 1.5.

In Phase 2, treat these as verify-and-harden items, not automatic reimplementation:
- Verdict cards
- Highlights extraction
- Basic abuse/rate limiting
- Lightweight debate lifecycle state handling
- Read-only spectator sharing

For each carryover item:
- Confirm current behavior and quality
- Fill reliability/security gaps
- Add tests and monitoring
- Extend only where product value is clear

## Core Product Vision
AI Debate Arena is a platform where:
- AI personalities debate user topics
- Humans can participate directly
- Debates are spoken and illustrated
- Outcomes are replayable and shareable

Experience target:
- Dramatic
- Interactive
- Entertaining
- Shareable

## Architecture Requirements

### Central Debate Engine
Implement a dedicated Debate Engine service layer.

Rules:
- UI must not directly own debate orchestration logic
- Engine must own lifecycle, turn generation, and pipeline execution
- System should follow an event-driven flow for extensibility

Engine responsibilities:
- Debate state transitions
- Turn generation
- Speech generation
- Image generation
- Analysis and scoring
- Summary generation

### Debate State Machine
Use explicit states:
- INITIALISING
- GENERATING_PERSONALITIES
- TURN_ACTIVE
- GENERATING_RESPONSE
- GENERATING_SPEECH
- GENERATING_IMAGE
- PLAYING_AUDIO
- ANALYSING_DEBATE
- SUMMARISED
- ENDED

Requirements:
- State transitions are deterministic and observable
- Invalid transitions are rejected and logged
- Debate recovery strategy exists for failed intermediate steps

### Debate Turn Model
Each turn record must include:
- speaker
- text
- audio_url
- image_url
- timestamp

Model requirements:
- Stable structure across storage, replay, realtime sync, and export
- Backward compatibility strategy for schema evolution

## Realtime Multiplayer
Add debate rooms for at least two participants.

Supported stack:
- Supabase Realtime or Socket.io

Required flow:
- User speech input
- Speech-to-text
- Room event publish
- Transcript update for all participants
- Consistent ordering and delivery guarantees

## Analysis and Engagement Features
Add live analysis features:
- Emotional state indicators
- Debate momentum
- Strong argument detection
- Audience reaction indicators
- Highlight moment detection

Requirements:
- Store analysis artifacts with debate records
- Keep analysis explainable and user-facing

## Replay and Media Pipeline

### Replay System
Replay sequence must support:
- Image
- Audio
- Text

Replay source:
- Persisted transcript and generated assets only

### Video and Clip Generation
Generate highlight media from stored assets.

Tooling:
- FFmpeg

Outputs:
- Highlight clips (30 to 60 seconds)
- Optional full debate summary videos

## PWA and Mobile Experience
Production PWA must support:
- Installable app
- Offline caching strategy
- Mobile-first layout and performance

## Identity, Billing, and Entitlements

### Authentication
Use Supabase Auth or Clerk.

Account requirement for:
- Subscriptions
- Multiplayer debates
- Saved debates

### Payments
Use Stripe subscriptions.

Baseline plans:
- Free: limited debates
- Pro: unlimited debates, human debates, extra personalities

Entitlements must be enforced server-side.

## Usage and Cost Controls
Track and persist AI usage metrics:
- Tokens used
- Speech generation count and cost
- Image generation count and cost

Requirements:
- Per-user usage history
- Plan-aware limits
- Cost visibility for operations

## Database Requirements
Production schema must cover at minimum:
- users
- debates
- messages
- subscriptions
- usage

Guidelines:
- Use relational integrity for debate and message ownership
- Index critical query paths (user debates, debate messages, created_at)
- Plan migrations to avoid downtime

## Moderation and Abuse Protection
Implement layered protections:
- Rate limits
- Content filtering
- Abuse detection

Requirements:
- Protect model usage and cost exposure
- Add moderation checkpoints before expensive generation steps
- Log moderation decisions for review

If basic protections were delivered in Phase 1.5:
- Keep existing behavior stable
- Upgrade policies and enforcement depth incrementally

## Social Sharing and Verdict Cards

### Verdict Card Generation
Each completed debate should generate a visual verdict card automatically.

Card content:
- Debate topic
- Debater names
- Winner
- Short explanation
- Best quote
- Replay link

Recommended format:
- 1200 x 630 px

Design requirements:
- Debater avatars
- Theme styling
- Clear winner emphasis

If verdict cards already exist from Phase 1.5:
- Focus on quality, reliability, and share conversion improvements
- Avoid unnecessary redesign unless metrics justify it

### OpenGraph Integration
Debate pages must include:
- og:title
- og:description
- og:image
- og:url

Requirement:
- Shared links render rich previews consistently across social platforms.

## Highlights and Shareable Moments
Detect and store highlights such as:
- Strongest argument
- Funniest moment
- Most dramatic quote

Requirements:
- Highlights saved with debate record
- Highlights reusable in cards, clips, and feed surfaces

If highlights already exist from Phase 1.5:
- Improve extraction quality and consistency
- Add lightweight evaluation checks before broad rollout

## Definition of Done (Production)
Phase 2 is complete when:
- Debate engine architecture is separated from UI control flow
- Realtime, replay, and sharing are stable under real usage
- Billing and entitlements are enforced server-side
- Usage tracking and abuse controls are active
- Social cards and OpenGraph previews are generated and reliable
- Operational runbook and deployment docs are current

## Deployment in Phase 2 (Hardening)
Use .github/instructions/DEPLOYMENT.md as the baseline, then add production hardening:
- Monitoring and alerting for backend failures and quota spikes
- Environment separation for staging and production
- Secrets rotation process
- Backup and recovery process for critical data
- Performance tuning and cold-start mitigation strategy

## Delivery Rules for Phase 2
- Prioritize reliability and observability over feature count
- Prefer incremental rollout with migration safety
- Add automated tests for critical workflows and regressions
- Use feature flags for high-risk launches
- Keep implementation pace sustainable for evening/weekend development
