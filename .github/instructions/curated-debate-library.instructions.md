---
description: "Spec for generating, storing, and displaying the curated starter debate library for free-tier users."
---

# Curated Starter Debate Library

**Status:** Blocked — requires blob storage (audio + images) to be implemented first. See [phase-1-issues-and-improvements.instructions.md](./phase-1-issues-and-improvements.instructions.md) item 8.

**Purpose:** Create a curated set of pre-generated debates that demonstrate the platform and appeal to free-tier users. These debates should feel entertaining, recognisable, and shareable. They form the starter library shown to new and free users.

---

## Prerequisites

Before generating any library debates:

- [ ] Supabase Storage buckets `debate-audio` and `debate-images` created and public
- [ ] Backend upload endpoint working (`/api/debates/:debateId/messages/:messageId/upload-assets`)
- [ ] Frontend auto-uploads audio + image per turn during generation
- [ ] `is_library` and `is_featured` columns added to the `debates` table
- [ ] `category` column added to the `debates` table (text: `tech` / `philosophy` / `world` / `fun`)

---

## Generation Process

For each debate below:

1. Generate the debate in **Pro mode** using the live debate engine
2. Confirm speech audio is generated for each turn
3. Confirm images are generated and displayed per turn
4. Confirm all assets are uploaded to Supabase Storage and URLs saved to `messages` table
5. After debate ends, generate the summary / verdict
6. In the Supabase `debates` table, set:
   ```sql
   is_library = true
   category = '<assigned category>'
   ```
7. For featured debates, also set:
   ```sql
   is_featured = true
   ```

---

## Curated Debate List

### Tech Titans (`library_category = 'tech'`)

| Title | Topic | Featured |
|---|---|---|
| Elon Musk vs Mark Zuckerberg | The Future of Artificial Intelligence | ✅ |
| Steve Jobs vs Bill Gates | What Drives Innovation | |
| Sam Altman vs Elon Musk | Should AI Be Regulated | |
| Tesla vs Edison | Who Really Invented the Future of Electricity | ✅ |

### Philosophical Showdowns (`library_category = 'philosophy'`)

| Title | Topic | Featured |
|---|---|---|
| Socrates vs Nietzsche | Is Morality Real | ✅ |
| Plato vs Aristotle | What Is Knowledge | |
| Kant vs Machiavelli | Should Leaders Be Moral | |

### Big Questions (`library_category = 'world'`)

| Title | Topic | Featured |
|---|---|---|
| AI vs Humanity | Who Should Control the Future | ✅ |
| Democracy vs Technocracy | Should Experts Run Society | |
| Capitalism vs Socialism | Which System Creates the Best Society | |

### Viral / Entertaining (`library_category = 'fun'`)

| Title | Topic | Featured |
|---|---|---|
| Shakespeare vs ChatGPT | Who Is the Better Writer | ✅ |
| Pirates vs Philosophers | Rum vs Reason | |
| Cats vs Dogs | Which Species Is Smarter | ✅ |
| Aliens vs Humans | Who Would Win Earth | |

---

## Featured Debates (homepage priority order)

These 6 debates appear first on the homepage library section:

1. Elon Musk vs Mark Zuckerberg
2. AI vs Humanity
3. Shakespeare vs ChatGPT
4. Cats vs Dogs
5. Tesla vs Edison
6. Socrates vs Nietzsche

---

## Database Schema Changes Required

Add to the `debates` table in Supabase:

```sql
ALTER TABLE debates ADD COLUMN IF NOT EXISTS is_library boolean DEFAULT false;
ALTER TABLE debates ADD COLUMN IF NOT EXISTS is_featured boolean DEFAULT false;
ALTER TABLE debates ADD COLUMN IF NOT EXISTS library_category text;
```

**Important:** Do NOT reuse the existing `category` column. That column already stores the debate **generation style** (values: `wild-card`, `comedy`, `science`, `philosophy`). Library grouping uses `library_category` (values: `tech`, `philosophy`, `world`, `fun`) to avoid a collision.

---

## Backend API Changes Required

### GET /api/library
Returns all debates where `is_library = true`, ordered by `is_featured DESC`, `created_at ASC`.

Response shape:
```json
[
  {
    "id": "uuid",
    "title": "Elon Musk vs Mark Zuckerberg",
    "topic": "The Future of Artificial Intelligence",
    "library_category": "tech",
    "is_featured": true,
    "name_a": "Elon Musk",
    "name_b": "Mark Zuckerberg",
    "summary": { "winner": "A", "confidence": 78, ... },
    "thumbnail_url": "<first image from messages, if available>"
  }
]
```

The `thumbnail_url` should be the `image_url` of the first message that has one.

---

## UI Changes Required

### Homepage library section

Add a **"Featured Debates"** section to the homepage (above or below the auth form) that:

- Fetches from `GET /api/library`
- Displays each debate as a card:
  - Thumbnail image (or placeholder if none)
  - `name_a vs name_b` title
  - Topic subtitle
  - Category badge
  - "Watch" / play button
- Clicking a card loads the **replay view** for that debate

### Replay view

A dedicated replay mode (separate from the live generation UI) that:

- Loads messages from the DB in `turn_index` order
- Plays `audio_url` for each message sequentially
- Shows `image_url` alongside the transcript as each turn plays
- Displays the verdict card at the end
- Has a "Create your own →" CTA linking to sign-up

### Free user routing

**Decision: Option B — Replay-only free tier.** *(Confirmed 14 March 2026)*

Free users cannot generate new debates. They can only watch library replays. Pro is required to generate.

Implementation changes required:
- **LandingPage.jsx** — update pricing copy: free tier no longer says "10 debates/day". Replace with "Watch curated debates free. Generate your own with Pro."
- **App.jsx** — in `start()` / "Begin Session" handler, block non-Pro users: show an upgrade prompt or redirect to the library instead of starting generation
- **GeminiSelfChatAudio.jsx** — "Begin Session" button should be gated: disabled + tooltip for free users, or replaced with "Upgrade to generate" CTA
- **server/index.js** — `DAILY_DEBATE_LIMIT` enforcement can be removed or set to 0 for free users once gating is in the frontend; keep server-side check as a safety fallback
- **Marketing copy** — the value proposition for free tier is now: experience the full product (audio + images) via curated replays, then upgrade to create your own

Do not implement until blob storage (item #9) and the replay engine (item #10) are working — free users need something to watch before generation is removed from their tier.

---

## Design Principles

- The starter library is the **product demo** — it should be the best possible showcase
- Debates should be entertaining and immediately recognisable to non-technical users
- Each debate card on the homepage is a conversion opportunity → Share → Sign Up → Pro
- Featured debates should span categories to show range (tech, philosophy, fun)
