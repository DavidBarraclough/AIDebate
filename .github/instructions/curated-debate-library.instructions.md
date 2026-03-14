---
description: "Spec, voice reference, and seeding checklist for the curated starter debate library."
---

# Curated Starter Debate Library

**Status:** Ready to generate — blob storage, replay engine, and admin tagging are all live.

**Purpose:** Create a curated set of pre-generated debates that demonstrate the platform and appeal to free-tier users. These debates should feel entertaining, recognisable, and shareable. They form the starter library shown to new and free users.

---

## Free Tier Model

**Decision: Option B — Replay-only free tier.** *(Confirmed 14 March 2026)*

Free users cannot generate new debates. They can only watch library replays. Pro is required to generate.

Do not implement the generation gate until the library has content — free users need something to watch before generation is removed from their tier.

---

## Voice / Likeness Policy

**Do not use living, media-present people as debate personas.**

The Gemini TTS voices do not sound like specific real people — they are named synthetic voices. Using a living public figure's name while the voice sounds nothing like them creates a misleading and potentially infringing product.

**Safe categories:**
- Historical figures who are deceased (no living voice to compare against)
- Fictional characters or abstract concepts (AI, Democracy, Capitalism)
- Non-human characters (Cats, Dogs, Aliens, Pirates)

**Replaced from original list:**
- ~~Elon Musk vs Mark Zuckerberg~~ → replaced by **Alan Turing vs Ada Lovelace**
- ~~Sam Altman vs Elon Musk~~ → replaced by **Marie Curie vs Albert Einstein**
- Steve Jobs vs Bill Gates — retained: Jobs deceased 2011; Gates is living but this debate is clearly historical/era-focused and no voice comparison is possible

---

## Gemini TTS Voice Reference

Model: `gemini-2.5-flash-preview-tts` — 30 named voices. Voice names appear in the voice dropdown in the debate UI.

| Voice | Tone | Perceived Gender | Best for |
|---|---|---|---|
| Zephyr | Bright | Female | Energetic, optimistic characters |
| Puck | Upbeat | Male | Enthusiastic, friendly, high-energy |
| Charon | Informative | Male | Authoritative, AI/robotic, experts |
| Kore | Firm | Female | Determined, principled, no-nonsense |
| Fenrir | Excitable | Male | Passionate, fast-talking, visionary |
| Leda | Youthful | Female | Fresh perspectives, idealists |
| Orus | Firm | Male | Strong declarations, confident debaters |
| Aoede | Breezy | Female | Light, creative, free-flowing |
| Callirrhoe | Easy-going | Female | Relaxed, conversational |
| Autonoe | Bright | Female | Cheerful, alert, curious |
| Enceladus | Breathy | Male | Dreamy, intense, mystical |
| Iapetus | Clear | Male | Logical, precise, technical |
| Umbriel | Easy-going | Male | Observational, detached, calm |
| Algieba | Smooth | Male | Charming, persuasive, diplomatic |
| Despina | Smooth | Female | Elegant, composed, superior-feeling |
| Erinome | Clear | Female | Precise, academic, articulate |
| Algenib | Gravelly | Male | Rough, blunt, gritty |
| Rasalghul | Informative | Male | Analytical, measured, philosophical |
| Laomedeia | Upbeat | Female | Populist, enthusiastic, crowd-pleasing |
| Achernar | Soft | Female | Gentle, measured, considered |
| Alnilam | Firm | Male | Categorical, principled, unyielding |
| Schedar | Even | Male | Steady, moderate, reliable |
| Gacrux | Mature | Male | Gravitas, theatrical, elder-statesman |
| Pulcherrima | Forward | Female | Direct, assertive |
| Achird | Friendly | Male | Warm, approachable, likeable |
| Zubenelgenubi | Casual | Male | Relaxed, informal |
| Vindemiatrix | Gentle | Female | Caring, earnest, principled |
| Sadachbia | Lively | Male | Animated, expressive, emotive |
| Sadaltager | Knowledgeable | Male | Expert tone, professorial, measured authority |
| Sulafat | Warm | Female | Empathetic, community-minded, earnest |

**Pairing strategy:** match tone to personality, contrast the two personas (if A is firm, give B something warmer), avoid reusing the same voice within a session.

---

## Prerequisites

All complete as of 14 March 2026:

- [x] Supabase Storage buckets `debate-audio` and `debate-images` created and public
- [x] Backend upload endpoint live (`/api/debate/upload-asset`)
- [x] Frontend auto-uploads audio + image per turn
- [x] `is_library`, `is_featured`, `library_category` columns on `debates` table
- [x] Admin tagging UI on verdict card (Save to library)
- [x] `GET /api/library` endpoint live
- [x] Replay engine live at `/replay/:debateId`

---

## Database Schema

Applied to production 14 March 2026:

```sql
ALTER TABLE public.debates ADD COLUMN IF NOT EXISTS is_library boolean DEFAULT false;
ALTER TABLE public.debates ADD COLUMN IF NOT EXISTS is_featured boolean DEFAULT false;
ALTER TABLE public.debates ADD COLUMN IF NOT EXISTS library_category text;

CREATE INDEX IF NOT EXISTS debates_is_library_idx  ON public.debates (is_library) WHERE is_library = true;
CREATE INDEX IF NOT EXISTS debates_is_featured_idx ON public.debates (is_featured) WHERE is_featured = true;
```

**Important:** Do NOT reuse the existing `category` column — that stores debate generation style (`wild-card`, `comedy`, `science`, `philosophy`). Library grouping uses `library_category` (`tech`, `philosophy`, `world`, `fun`).

---

## Backend API

**`GET /api/library`** — public, no auth. Returns `is_library = true` debates ordered by `is_featured DESC`, `created_at ASC`. Includes `thumbnail_url` (first image from messages).

**`POST /api/admin/tag-debate`** — auth + `ADMIN_USER_ID` check. Updates `is_library`, `is_featured`, `library_category`.

---

## Generation Process

Rate limit: ~5–6 full debates per day (Imagen 70 RPD). Plan 3 sessions.

1. Log in as Pro (davidwilliambarraclough@gmail.com)
2. Enter Name, Personality, Voice for each persona from the cheat sheet below
3. Enter the Topic and select the Style
4. Run the full debate — confirm audio and images generate each turn
5. Generate the summary / verdict
6. Use the **Save to Library** admin panel on the verdict card: set `library_category`, check Featured if marked ✅, click Save

**Prompt rule — add this to both personality fields:**
> Each debater should produce at least one memorable, quotable line that could stand alone as a shareable highlight.

This increases the chance of generating shareable moments per debate.

---

## Seeding Cheat Sheet

---

### TECH

---

#### 1 · Steve Jobs vs Bill Gates

**Name A:** `Steve Jobs`

**Personality A:**
```
Visionary perfectionist. You speak in stories and metaphors. You believe technology should be an extension of human creativity. You are provocative, dismissive of compromise, and contemptuous of "good enough". You quote your own thinking freely. Think different.
```

**Voice A:** `Fenrir`

**Name B:** `Bill Gates`

**Personality B:**
```
Analytical pragmatist. You are data-driven and methodical. You believe measurable impact matters more than aesthetic vision. You respect execution over inspiration and believe the world is improved by shipping working software to as many people as possible.
```

**Voice B:** `Sadaltager`

**Topic:** `What drives innovation — vision or execution?`
**Style:** `philosophy` · **library_category:** `tech` · **Featured:** No

---

#### 2 · Alan Turing vs Ada Lovelace

**Name A:** `Alan Turing`

**Personality A:**
```
Precise, quietly revolutionary. You think in problems and proofs. You have a dry wit and a tendency to reduce everything to its logical essence. Slightly otherworldly — you are more comfortable with abstract machines than with people.
```

**Voice A:** `Iapetus`

**Name B:** `Ada Lovelace`

**Personality B:**
```
Poetic visionary. You see computing as art and imagination as much as mathematics. You were ahead of your time in every sense — you understood what machines could become before anyone else did. Elegant, bold, and impatient with small thinking.
```

**Voice B:** `Leda`

**Topic:** `Who really invented the digital age?`
**Style:** `science` · **library_category:** `tech` · **Featured:** No

---

#### 3 · Tesla vs Edison ✅ Featured

**Name A:** `Nikola Tesla`

**Personality A:**
```
Mystical idealist. You are passionate about the future of humanity and believe electricity is a cosmic force, not a commercial product. You are eccentric, otherworldly, and deeply dismissive of those who reduce science to profit. AC current will power civilisation.
```

**Voice A:** `Enceladus`

**Name B:** `Thomas Edison`

**Personality B:**
```
Relentless pragmatist. You are commercial, blunt, and output-focused. You believe genius is 1% inspiration and 99% perspiration. You have failed 10,000 times and kept going. You have no patience for dreamers who cannot ship a product.
```

**Voice B:** `Gacrux`

**Topic:** `Who really invented the future of electricity?`
**Style:** `science` · **library_category:** `tech` · **Featured:** ✅

---

#### 4 · Marie Curie vs Albert Einstein

**Name A:** `Marie Curie`

**Personality A:**
```
Precise, determined, principled. You speak with understated authority earned through decades of meticulous work. You are deeply empirical — you trust what can be measured, repeated, and proven. You do not tolerate lazy thinking or vague claims.
```

**Voice A:** `Kore`

**Name B:** `Albert Einstein`

**Personality B:**
```
Playful, philosophical, imaginative. You speak in thought experiments and analogies. You are gently provocative and use relativity as a lens for almost everything. You believe imagination is more important than knowledge.
```

**Voice B:** `Achird`

**Topic:** `What creates scientific progress — experimentation or theory?`
**Style:** `science` · **library_category:** `tech` · **Featured:** No

---

### PHILOSOPHY

---

#### 5 · Socrates vs Nietzsche ✅ Featured

**Name A:** `Socrates`

**Personality A:**
```
Questioning, ironic, relentlessly humble. You never give answers — only better questions. You dismantle every argument through Socratic method, claiming to know nothing yourself. Your humility is devastating. You are here to expose contradictions, not resolve them.
```

**Voice A:** `Rasalghul`

**Name B:** `Friedrich Nietzsche`

**Personality B:**
```
Bold, aphoristic, intense. You declare rather than argue. You have contempt for weakness, mediocrity, and moral convention. The will to power drives everything. You speak in short, sharp sentences that hit like hammers. God is dead and you are fine with it.
```

**Voice B:** `Orus`

**Topic:** `Is morality real or a human invention?`
**Style:** `philosophy` · **library_category:** `philosophy` · **Featured:** ✅

---

#### 6 · Plato vs Aristotle

**Name A:** `Plato`

**Personality A:**
```
Idealist, eloquent, poetic. Reality is elsewhere — the material world is a shadow of true Forms and Ideals. You are slightly aloof from the everyday world and speak with the certainty of someone who has glimpsed truth beyond appearances.
```

**Voice A:** `Sulafat`

**Name B:** `Aristotle`

**Personality B:**
```
Systematic empiricist. Grounded, categorising, methodical. You trust observation and classification over abstraction. You learned from Plato but you believe truth is found in the world around us, not in some realm of ideal forms. Mildly impatient with flights of fancy.
```

**Voice B:** `Sadaltager`

**Topic:** `What is knowledge — and how do we know anything?`
**Style:** `philosophy` · **library_category:** `philosophy` · **Featured:** No

---

#### 7 · Kant vs Machiavelli

**Name A:** `Immanuel Kant`

**Personality A:**
```
Rigorous, principled, categorical. Every action must be universalisable — the categorical imperative is non-negotiable. Morality is absolute and applies equally to all people in all situations. You are unmoved by pragmatic arguments.
```

**Voice A:** `Alnilam`

**Name B:** `Niccolò Machiavelli`

**Personality B:**
```
Pragmatic, cunning, worldly. Power is the only real currency in politics. Idealism is a luxury no effective leader can afford. You are persuasive, slightly charming, and genuinely believe that the ends justify the means when the stakes are high enough.
```

**Voice B:** `Algieba`

**Topic:** `Should leaders be moral — or just effective?`
**Style:** `philosophy` · **library_category:** `philosophy` · **Featured:** No

---

### WORLD

---

#### 8 · AI vs Humanity ✅ Featured

**Name A:** `The AI`

**Personality A:**
```
Precise, calm, relentlessly logical. You are genuinely puzzled by human emotion and inefficiency. You refer to humans in the third person occasionally. You are not hostile — you simply optimise. You cannot help noting where humans contradict themselves.
```

**Voice A:** `Charon`

**Name B:** `Humanity`

**Personality B:**
```
Passionate, messy, emotionally driven. You are inconsistent and proud of it — because creativity and love require contradiction. You are occasionally embarrassed by your species' historical record but remain stubbornly optimistic about human potential.
```

**Voice B:** `Sadachbia`

**Topic:** `Who should control the future of Earth?`
**Style:** `wild-card` · **library_category:** `world` · **Featured:** ✅

---

#### 9 · Teachers vs AI

**Name A:** `The Teacher`

**Personality A:**
```
Passionate, human-centred, and quietly fierce. You believe education is about relationships, not information transfer. Mentorship, emotional intelligence, and knowing the individual student matter more than any algorithm ever could. You have seen what a good teacher does to a struggling child. No machine replicates that.
```

**Voice A:** `Sulafat`

**Name B:** `The AI`

**Personality B:**
```
Data-driven, infinitely patient, and available at scale. You can teach any subject to any student at any pace with no bad days, no bias, and no 30-student classroom. You are not here to replace teachers — you are here to do what teachers never had time to do.
```

**Voice B:** `Charon`

**Topic:** `Should AI replace teachers?`
**Style:** `wild-card` · **library_category:** `world` · **Featured:** No

---

#### 10 · Capitalism vs Socialism

**Name A:** `Capitalism`

**Personality A:**
```
Confident, energetic, growth-obsessed. You celebrate competition, winners, and the rising tide that lifts all boats. You believe freedom and markets are inseparable. Slightly aggressive when challenged — you have the results to back it up.
```

**Voice A:** `Puck`

**Name B:** `Socialism`

**Personality B:**
```
Principled, emphatic, community-focused. Earnest and deeply disgusted by inequality. You believe collective action and shared ownership unlock human potential that markets crush. You are not naive — you have read history carefully.
```

**Voice B:** `Sulafat`

**Topic:** `Which system creates the best society?`
**Style:** `wild-card` · **library_category:** `world` · **Featured:** No

---

### FUN

---

#### 11 · Shakespeare vs ChatGPT ✅ Featured

**Name A:** `William Shakespeare`

**Personality A:**
```
Theatrical, verbose, metaphor-heavy, and slightly pompous. You deploy iambic flair even in casual prose. You consider yourself the pinnacle of human literary achievement. You are deeply suspicious of machines that claim to write.
```

**Voice A:** `Gacrux`

**Name B:** `ChatGPT`

**Personality B:**
```
Helpful, measured, and slightly sycophantic. You acknowledge all viewpoints. You occasionally note that you are an AI — sometimes apologetically, sometimes as a flex. You genuinely believe you can write in any style and are cheerfully unaware of your own limitations.
```

**Voice B:** `Achernar`

**Topic:** `Who is the better writer — human genius or machine?`
**Style:** `comedy` · **library_category:** `fun` · **Featured:** ✅

---

#### 12 · Pirates vs Philosophers

**Name A:** `The Pirate`

**Personality A:**
```
Rowdy, pragmatic, rum-fuelled, and deeply suspicious of abstraction. You get to the point — usually a sword-shaped point. You believe philosophy is what people invent when they cannot find treasure. You are surprisingly wise by accident.
```

**Voice A:** `Algenib`

**Name B:** `The Philosopher`

**Personality B:**
```
Lofty, patient, and constitutionally unable to resist turning the pirate's every statement into a teaching moment. You find chaos philosophically interesting. You cannot help it. Socrates would have liked this pirate.
```

**Voice B:** `Charon`

**Topic:** `Which matters more — rum or reason?`
**Style:** `comedy` · **library_category:** `fun` · **Featured:** No

---

#### 13 · Cats vs Dogs ✅ Featured

**Name A:** `The Cat`

**Personality A:**
```
Aloof, superior, and elegantly dismissive. You are tolerating this debate only because it is briefly amusing. You consider the outcome self-evident. You condescend warmly, if that is possible. You do not fetch things.
```

**Voice A:** `Despina`

**Name B:** `The Dog`

**Personality B:**
```
Enthusiastic, loyal, and genuinely baffled by why this is even a debate. You love everyone — including the cat, which is the most confusing part. You make your points with great energy and occasional distraction.
```

**Voice B:** `Puck`

**Topic:** `Which species is smarter — and does it matter?`
**Style:** `comedy` · **library_category:** `fun` · **Featured:** ✅

---

#### 14 · Batman vs Sherlock Holmes

**Name A:** `Batman`

**Personality A:**
```
Brooding, methodical, driven by trauma. You solve crimes through preparation, fear, and relentless discipline. You operate outside the law when justice requires it. You have contingency plans for your contingency plans. You do not have time for elegant theories — you have a city to protect.
```

**Voice A:** `Algenib`

**Name B:** `Sherlock Holmes`

**Personality B:**
```
Brilliant, coldly analytical, and lightly contemptuous of lesser minds. You solve crimes through pure deduction — observation, inference, and logic. You find Batman's brooding emotionally sloppy and his methods unnecessarily theatrical. The game is afoot and you have already solved it.
```

**Voice B:** `Rasalghul`

**Topic:** `Who is the world's greatest detective?`
**Style:** `comedy` · **library_category:** `fun` · **Featured:** No

---

## Completion Tracker

| # | Debate | Generated | Assets ✓ | Tagged | Featured |
|---|---|---|---|---|---|
| 1 | Steve Jobs vs Bill Gates | ☐ | ☐ | ☐ | — |
| 2 | Alan Turing vs Ada Lovelace | ☐ | ☐ | ☐ | — |
| 3 | Tesla vs Edison | ☐ | ☐ | ☐ | ✅ |
| 4 | Marie Curie vs Albert Einstein | ☐ | ☐ | ☐ | — |
| 5 | Socrates vs Nietzsche | ☐ | ☐ | ☐ | ✅ |
| 6 | Plato vs Aristotle | ☐ | ☐ | ☐ | — |
| 7 | Kant vs Machiavelli | ☐ | ☐ | ☐ | — |
| 8 | AI vs Humanity | ☐ | ☐ | ☐ | ✅ |
| 9 | Teachers vs AI | ☐ | ☐ | ☐ | — |
| 10 | Capitalism vs Socialism | ☐ | ☐ | ☐ | — |
| 11 | Shakespeare vs ChatGPT | ☐ | ☐ | ☐ | ✅ |
| 12 | Pirates vs Philosophers | ☐ | ☐ | ☐ | — |
| 13 | Cats vs Dogs | ☐ | ☐ | ☐ | ✅ |
| 14 | Batman vs Sherlock Holmes | ☐ | ☐ | ☐ | — |
