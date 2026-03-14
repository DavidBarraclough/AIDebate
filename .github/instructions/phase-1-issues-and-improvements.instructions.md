---
description: "Post-launch bug fixes, tablet/mobile polish, and product improvements identified after Phase 1 completion."
---

# AI Debate Studio – Bug Fixes & Product Improvements

**Date:** 14 March 2026
**Status:** Post Phase 1 launch — beta testing on iPad and Android
**Purpose:** Consolidated instructions covering current bugs, the replay system for the free plan, and product improvements.

---

## Agent Guardrails

- Restrict all work to D:/DEV only.
- Always work on a dedicated feature branch.
- Never run destructive git commands unless explicitly requested.
- Stop and ask before schema migrations, paid-service setup changes, or large dependency changes.
- Auto-approve file edits and safe local commands (read, lint, build, test).
- Require approval for package install/remove and git push.

---

# 1. Priority Bug Fixes

## 1.1 Stripe Upgrade → Pro Not Activating

**Issue**
Users complete payment but the app still shows "Upgrade to Pro". Subscription state is not updating after checkout.

**Likely cause**
Stripe webhook is not configured, not updating the database, or not triggering a session refresh.

**Implementation steps**

1. Confirm Stripe webhook endpoint exists on the backend.
2. Ensure webhook listens for:
   - `checkout.session.completed`
   - `invoice.paid`
3. Include `user_id` in Stripe checkout metadata at session creation time.
4. On webhook event:
   - Identify the user via `metadata.user_id`
   - Update Supabase: `subscription_status = "pro"`
5. After redirect from Stripe checkout:
   - Refresh user session (call Supabase `getSession()` or equivalent)
   - Refetch subscription status from DB

**Testing checklist**
- [ ] Test payment in Stripe test mode
- [ ] Confirm webhook fires (check Stripe dashboard > Webhooks > logs)
- [ ] Confirm `subscription_status` updates in Supabase
- [ ] Confirm UI reflects Pro status without requiring logout/login

**Known gap — subscription cancellation**
The `customer.subscription.deleted` webhook event is not yet handled. When a user cancels their subscription in Stripe, the DB is not updated and they remain on Pro until `current_period_end` expires. Additionally, the current fallback sets `current_period_end` to 30 days from now when Stripe does not return a value, which means cancelled test subscriptions may show Pro longer than expected.

To fix: add `customer.subscription.deleted` to the webhook handler in `server/index.js` and set `status = "cancelled"` in the subscriptions table when that event fires.

---

## 1.2 Image Generation Not Working

**Issue**
The "Generate Images" feature returns no images.

**Checks**

1. Verify `GEMINI_API_KEY` (or image-specific key) exists in environment variables on the hosted backend.
2. Confirm `imagen-4.0-fast-generate-001` endpoint is being called correctly.
3. Check network response in browser dev tools for 4xx/5xx errors.
4. Ensure the returned image data is correctly parsed and assigned to the UI component.

**Typical failure points**
- API key missing from Render environment variables
- Incorrect or deprecated model endpoint string
- Image response not parsed (e.g. base64 vs URL handling mismatch)
- Request timeout with no fallback

---

## 1.3 iPad Layout Cut Off (Bottom Section)

**Issue**
Bottom of the interface is clipped on iPad. "Session Estimated Cost" area is partially hidden.

**Fix**
Ensure the main container scrolls and has sufficient bottom padding.

Apply to root/main container:
```css
min-height: 100vh;          /* not height: 100vh */
padding-bottom: 80px;
overflow-y: auto;
padding-bottom: env(safe-area-inset-bottom, 80px);
```

Avoid `height: 100vh` — use `min-height: 100vh` to prevent clipping on tablets.

Also respect device safe-area insets for devices with home bars.

---

## 1.4 Text Scaling / Responsive Typography

**Issue**
Containers scale responsively but typography does not. Text appears too large on tablets.

**Fix**
Use `clamp()` for responsive type scaling.

```css
h1: clamp(22px, 4vw, 36px)
h2: clamp(18px, 3vw, 28px)
body text: clamp(14px, 2vw, 18px)
```

Breakpoints to target:
- Mobile: `< 600px`
- Tablet: `600px – 1024px`
- Desktop: `> 1024px`

Apply globally via Tailwind config or CSS custom properties — avoid one-off per-component fixes.

---

## 1.5 Debate Summary Missing When Pause Is Pressed

**Issue**
Pressing pause does not reliably trigger the debate summary. Current logic likely only generates a summary after a minimum turn count.

**Fix**
Trigger summary generation whenever pause is pressed, regardless of turn count.

Change logic from:
```
if turn_count >= 4 → generate_summary()
```

To:
```
if pause_clicked → generate_summary()
```

Summary must appear even for very short debates (1–2 turns).

---

# 2. Major Product Improvement – Replay System for Free Users

## Objective

Reduce AI API costs and latency by allowing free users to replay stored debates instead of triggering live generation.

---

## 2.1 Free Plan Behaviour

Free users:
- Watch replayed debates from the curated library
- Cannot generate new debates
- All generative interaction features disabled:
  - Challenge button
  - Custom topics
  - Image generation
  - Voice generation

Free users experience the full product feel without incurring API costs. This is the primary conversion funnel into Pro.

---

## 2.2 Stored Debate Data Model

These tables already exist in Supabase from Phase 1. Confirm schema matches:

### Table: `debates`
| Field | Type |
|---|---|
| id | uuid |
| title | text |
| participants | text[] or jsonb |
| topic | text |
| created_at | timestamptz |
| user_id | uuid (nullable for seeded debates) |
| is_library | boolean (true = curated/public) |

### Table: `messages`
| Field | Type |
|---|---|
| id | uuid |
| debate_id | uuid |
| speaker | text |
| text | text |
| image_url | text |
| audio_url | text |
| timestamp | timestamptz |

Add `is_library` flag to debates table if not present — this marks debates as part of the public replay library.

---

## 2.3 Replay Engine

When a free user selects a debate, replay from stored data instead of generating:

```
fetch debate from DB
display messages sequentially
play stored audio_url
show stored image_url
```

No AI calls are made. This eliminates API cost entirely for free users.

Replay pacing: use stored timestamps or a fixed interval (e.g. 4–6 seconds per turn) to simulate natural debate flow.

---

## 2.4 Curated Debate Library

Seed the database with a small set of high-quality pre-generated debates.

Suggested initial library:
- Einstein vs Elon Musk — AI Safety
- Steve Jobs vs Bill Gates — Innovation
- Socrates vs Nietzsche — Morality
- Churchill vs Napoleon — Leadership
- Tesla vs Edison — Electricity
- Darwin vs Creationism
- AI vs Humanity — Future Ethics

The "Random Debate" button for free users selects from this curated pool.

**Seeding approach:** Generate these debates once in Pro mode, review them, mark `is_library = true`, and store permanently.

---

## 2.5 Pro-Generated Debates → Library Pipeline (Optional)

Allow high-quality Pro debates to feed the library over time:

1. Pro user generates debate
2. Debate stored in Supabase as normal
3. Manual moderation/review step (admin marks `is_library = true`)
4. Debate appears in the free library

This creates a self-growing content archive without additional generation cost.

---

# 3. Product Improvements

## 3.1 Hide "Session Estimated Cost" for Users

The cost indicator is developer-facing. Regular users may read it as "will I be charged?".

**Action:** Hide it from the standard UI. Options:
- Remove entirely
- Show only in a developer/debug mode toggle
- Restrict to authenticated Pro users in a settings panel

Default: hide it.

---

## 3.2 Improve Share Pages (`/debate/:id`)

Current share links work. Enhancements:

- Add an explanation header above the debate transcript:
  > *This debate was generated using AI Debate Studio. Create your own debates between historical figures, scientists, politicians, and philosophers.*
- Add a prominent link back to the homepage
- Add a "Try it yourself" CTA that links to sign-up

---

## 3.3 Shareable Verdict Cards

After a debate finishes, generate a shareable visual result card.

Example card content:
```
Socrates vs Nietzsche
Topic: Is Morality Objective?

Winner: Socrates
Judge Confidence: 82%
```

Use this for:
- OpenGraph image on share links
- One-click share CTA at end of debate
- Social preview on X / LinkedIn / Reddit

This was listed as the top Phase 1.5 priority — implement if capacity allows.

---

## 3.4 Homepage Demo Debate

Show a featured debate immediately on the landing page — before the user configures anything.

Example:
> *Watch Elon Musk debate Einstein about the future of AI.*

This demonstrates the product value before requiring signup.

Implementation: auto-play a replay of a curated debate on page load (muted by default, user activates audio).

---

## 3.5 Debate Library as Content Pages

Over time, each stored debate becomes a standalone SEO content page.

URL pattern: `/debate/einstein-vs-elon-musk-ai-safety`

Categories to build towards:
- History
- Philosophy
- Business
- Technology
- Politics

Each page: transcript, images, verdict, share CTA. This creates organic search traffic.

---

# 4. Implementation Priority Order

| Priority | Item | Effort |
|---|---|---|
| 1 | Fix Stripe Pro activation bug | 2–4h |
| 2 | Fix image generation | 1–3h |
| 3 | Fix iPad layout clip | 1h |
| 4 | Fix responsive typography | 1–2h |
| 5 | Fix pause → summary bug | 1h |
| 6 | Hide cost indicator | 30m |
| 7 | Improve share page (header + CTA) | 1–2h |
| 8 | Replay system for free users | 4–8h |
| 9 | Seed curated debate library | 2–4h |
| 10 | Shareable verdict cards | 4–6h |
| 11 | Homepage demo debate | 2–4h |
| 12 | Debate library SEO pages | 6–10h |

---

# 5. Definition of Done for This Phase

- [ ] Stripe Pro activation works end-to-end in test mode
- [ ] Images generate and display correctly on hosted app
- [ ] iPad layout does not clip — full page scrollable
- [ ] Text scales correctly across mobile / tablet / desktop
- [ ] Pause always triggers a summary regardless of turn count
- [ ] Cost indicator hidden from standard user view
- [ ] Share page has homepage link and signup CTA
- [ ] At least one replay debate playable for free users
