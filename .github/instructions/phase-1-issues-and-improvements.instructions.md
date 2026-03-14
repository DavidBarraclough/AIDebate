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

Reduce AI API costs and latency by allowing free users to replay stored debates instead of triggering live generation. Replays must include the full experience: spoken audio and generated images — not just text.

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

Free users experience the full product feel (audio + images) without incurring API costs. This is the primary conversion funnel into Pro.

---

## 2.2 Blob Storage for Audio and Images

This is a **prerequisite** for the replay system. Without persisted audio and image files, replays cannot play back the full experience.

### Storage provider
Use **Supabase Storage** (already in stack). Create two buckets:
- `debate-audio` — TTS audio per message turn (public read)
- `debate-images` — Imagen-generated images per message turn (public read)

### When to upload (during live debate generation)
After each turn completes:
1. **Audio**: the TTS response returns a base64 PCM blob → convert to WAV/MP3 → upload to `debate-audio/{debate_id}/{message_id}.mp3`
2. **Image**: the Imagen response returns base64 PNG → upload to `debate-images/{debate_id}/{message_id}.png`
3. Store the resulting **public Supabase Storage URLs** in the `messages` row (`audio_url`, `image_url`)

### Current gap
Currently audio is played directly from in-memory base64 blobs (never persisted) and images are stored as base64 strings in React state only. Neither survives page refresh or can be replayed later.

### Backend endpoint needed
Add `POST /api/debates/:debateId/messages/:messageId/upload-assets` (or handle inline in the existing turn endpoint) to:
- Accept audio blob + image base64 from the frontend
- Upload both to Supabase Storage
- Return the public URLs
- Update the `messages` row with both URLs

### Frontend changes needed
After each turn's audio plays:
- Upload audio blob to backend
- Upload image (if generated) to backend
- Store returned URLs locally so the debate record is complete

---

## 2.3 Stored Debate Data Model

These tables already exist in Supabase from Phase 1. Confirm schema matches and add missing fields:

### Table: `debates`
| Field | Type | Notes |
|---|---|---|
| id | uuid | |
| title | text | |
| participants | text[] or jsonb | |
| topic | text | |
| created_at | timestamptz | |
| user_id | uuid | nullable for seeded/library debates |
| is_library | boolean | true = curated public replay |
| summary | jsonb | optional — store verdict/winner/args |

Add `is_library` and `summary` columns if not present.

### Table: `messages`
| Field | Type | Notes |
|---|---|---|
| id | uuid | |
| debate_id | uuid | |
| speaker | text | persona key e.g. "A", "B", "host" |
| text | text | debate turn content |
| image_url | text | Supabase Storage public URL |
| audio_url | text | Supabase Storage public URL |
| turn_index | integer | ordering within debate |
| timestamp | timestamptz | |

Add `turn_index` if not present — required for ordered replay.

---

## 2.4 Replay Engine

When a free user selects a debate, replay from stored data:

```
fetch debate + ordered messages from DB
for each message (in turn_index order):
  display message text
  show image_url (if present)
  play audio_url (if present)
  wait for audio to finish (or fixed 5s interval if no audio)
```

No AI calls are made. This eliminates API cost entirely for free users.

The replay engine is a separate mode — not the live debate component. It reads from DB, not from Gemini.

---

## 2.5 Curated Debate Library

Seed the database with a small set of high-quality pre-generated debates (with audio + images stored).

Suggested initial library:
- Einstein vs Elon Musk — AI Safety
- Steve Jobs vs Bill Gates — Innovation
- Socrates vs Nietzsche — Morality
- Churchill vs Napoleon — Leadership
- Tesla vs Edison — Electricity
- Darwin vs Creationism
- AI vs Humanity — Future Ethics

**Seeding approach:**
1. Generate each debate in Pro mode (live generation, audio + images on)
2. Ensure all assets upload to Supabase Storage during generation
3. Review the debate
4. Mark `is_library = true` in the `debates` table
5. Debate is now available to free users

---

## 2.6 Pro-Generated Debates → Library Pipeline (Optional)

Allow high-quality Pro debates to feed the library over time:

1. Pro user generates debate (assets auto-uploaded to Storage)
2. Manual moderation/review step (admin marks `is_library = true`)
3. Debate appears in the free library

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

| Priority | Item | Status | Effort | Spec |
|---|---|---|---|---|
| 1 | Fix Stripe Pro activation bug | ✅ Done | — | |
| 2 | Fix image generation | ✅ Done | — | |
| 3 | Fix iPad layout clip | ✅ Done (UI redesign) | — | |
| 4 | Fix responsive typography | ✅ Done (Sora + clamp) | — | |
| 5 | Fix pause → summary bug | ✅ Done (manual only) | — | |
| 6 | Hide cost indicator | ✅ Done (behind toggle) | — | |
| 7 | Improve share page (header + CTA) | ✅ Done | — | |
| 8 | Shareable verdict cards | ✅ Done (share button) | — | |
| 9 | Blob storage — audio + images (prereq for replay) | 🔄 Next | 4–6h | section 2.2 above |
| 10 | Replay engine for free users | ⬜ Blocked by 9 | 4–6h | section 2.3–2.4 above |
| 11 | Seed curated debate library | ⬜ Blocked by 9 | 2–4h | [curated-debate-library.instructions.md](./curated-debate-library.instructions.md) |
| 12 | Homepage library section + replay UI | ⬜ Blocked by 10 | 4–6h | [curated-debate-library.instructions.md](./curated-debate-library.instructions.md) |
| 13 | OG image generation for share links | ⬜ Blocked by 9 | 2–3h | |
| 14 | Homepage demo / featured debate | ⬜ Blocked by 10 | 2–4h | [curated-debate-library.instructions.md](./curated-debate-library.instructions.md) |
| 15 | Debate library SEO pages | ⬜ Blocked by 11 | 6–10h | |

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
