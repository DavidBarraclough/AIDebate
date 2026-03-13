import express from 'express'
import cors from 'cors'
import { GoogleGenerativeAI } from '@google/generative-ai'
import { createClient } from '@supabase/supabase-js'
import Stripe from 'stripe'
import 'dotenv/config'

const app = express()

const isProduction = process.env.NODE_ENV === 'production'
const allowServerFallback = (process.env.ALLOW_SERVER_FALLBACK ?? (isProduction ? 'false' : 'true')).toLowerCase() === 'true'
const corsOrigins = (process.env.CORS_ORIGIN || '')
  .split(',')
  .map(origin => origin.trim())
  .filter(Boolean)

app.use(cors({
  origin(origin, callback) {
    // Allow non-browser clients and same-machine tools with no Origin header.
    if (!origin) return callback(null, true)
    if (corsOrigins.length === 0) return callback(null, true)
    if (corsOrigins.includes(origin)) return callback(null, true)
    return callback(new Error('CORS not allowed'))
  },
}))
app.use(express.json())
app.use((req, _res, next) => { console.log(req.method, req.path); next() })

// ─── Stripe ──────────────────────────────────────────────────────────────────
const stripeSecretKey = (process.env.STRIPE_SECRET_KEY || '').trim()
const stripePriceId   = (process.env.STRIPE_PRICE_ID   || '').trim()
const stripe = stripeSecretKey ? new Stripe(stripeSecretKey, { apiVersion: '2025-05-28.basil' }) : null

// ─── Supabase server client ──────────────────────────────────────────────────
const supabaseUrl  = (process.env.SUPABASE_URL  || '').trim()
const supabaseAnon = (process.env.SUPABASE_ANON_KEY || '').trim()
const supabaseServer = supabaseUrl && supabaseAnon
  ? createClient(supabaseUrl, supabaseAnon)
  : null

const DAILY_DEBATE_LIMIT = 10

/**
 * Verify a Supabase JWT from the Authorization header.
 * Returns the user object or sends a 401 and returns null.
 */
async function requireSupabaseUser(req, res) {
  if (!supabaseServer) {
    res.status(503).json({ error: 'Supabase not configured on server.' })
    return null
  }
  const auth = (req.headers.authorization || '').trim()
  const token = auth.startsWith('Bearer ') ? auth.slice(7) : ''
  if (!token) {
    res.status(401).json({ error: 'Missing auth token.' })
    return null
  }
  const { data: { user }, error } = await supabaseServer.auth.getUser(token)
  if (error || !user) {
    res.status(401).json({ error: 'Invalid or expired session.' })
    return null
  }
  return user
}

// ─────────────────────────────────────────────────────────────────────────────
const HEADER_API_KEY = 'x-gemini-api-key'

function resolveGeminiApiKey(req) {
  const headerKey = (req.get(HEADER_API_KEY) || '').trim()
  const envKey = allowServerFallback ? (process.env.GEMINI_API_KEY || '').trim() : ''
  return headerKey || envKey || null
}

function requireGeminiApiKey(req, res) {
  const apiKey = resolveGeminiApiKey(req)
  if (!apiKey) {
    const helpText = allowServerFallback
      ? 'Add your personal key in the app or configure GEMINI_API_KEY on the server.'
      : 'Add your personal key in the app. Server-side fallback key is disabled.'
    res.status(400).json({ error: `Gemini API key missing. ${helpText}` })
    return null
  }
  return apiKey
}

// Start a debate: enforce daily limit, create debate row, return debateId
app.post('/api/debate/start', async (req, res) => {
  const user = await requireSupabaseUser(req, res)
  if (!user) return

  const { topic, nameA, nameB, personalityA, personalityB, style, category } = req.body

  // User-scoped client (respects RLS — user can only see/write their own rows)
  const auth = req.headers.authorization
  const userClient = createClient(supabaseUrl, supabaseAnon, {
    global: { headers: { Authorization: auth } },
  })

  try {
    // Count debates created today
    const todayStart = new Date()
    todayStart.setHours(0, 0, 0, 0)
    const { count, error: countError } = await userClient
      .from('debates')
      .select('*', { count: 'exact', head: true })
      .gte('created_at', todayStart.toISOString())

    if (countError) throw countError

    if (count >= DAILY_DEBATE_LIMIT) {
      return res.status(429).json({
        error: `Daily limit reached (${DAILY_DEBATE_LIMIT} debates/day). Try again tomorrow.`,
        used: count,
        limit: DAILY_DEBATE_LIMIT,
      })
    }

    // Create the debate row
    const { data, error: insertError } = await userClient
      .from('debates')
      .insert({
        user_id:       user.id,
        topic,
        name_a:        nameA,
        name_b:        nameB,
        personality_a: personalityA,
        personality_b: personalityB,
        style,
        category,
      })
      .select('id')
      .single()

    if (insertError) throw insertError

    return res.json({
      debateId: data.id,
      used: count + 1,
      limit: DAILY_DEBATE_LIMIT,
    })
  } catch (err) {
    console.error('debate/start error:', err.message)
    return res.status(500).json({ error: err.message })
  }
})

app.post('/api/test-key', async (req, res) => {
  const apiKey = requireGeminiApiKey(req, res)
  if (!apiKey) return

  try {
    const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models?key=${apiKey}`)
    const data = await response.json()

    if (!response.ok || data.error) {
      const msg = data?.error?.message || 'API key validation failed.'
      const status = response.status === 401 || response.status === 403 ? 401 : 400
      return res.status(status).json({ valid: false, error: msg })
    }

    return res.json({ valid: true })
  } catch (err) {
    console.error('test-key error:', err.message)
    return res.status(500).json({ valid: false, error: 'Unable to validate key right now.' })
  }
})

app.post('/api/chat', async (req, res) => {
  const { history, message } = req.body
  const apiKey = requireGeminiApiKey(req, res)
  if (!apiKey) return

  try {
    const genAI = new GoogleGenerativeAI(apiKey)
    const model = genAI.getGenerativeModel({ model: 'gemini-2.5-flash-lite' })

    const chat = model.startChat({
      history: history.map(msg => ({
        role: msg.role === 'assistant' ? 'model' : 'user',
        parts: [{ text: msg.content }],
      })),
    })

    const result = await chat.sendMessage(message)
    const text = result.response.text()

    res.json({ reply: text })
  } catch (err) {
    console.error(err)
    res.status(500).json({ error: err.message })
  }
})

// One turn in a self-chat — each side has its own system prompt + history
app.post('/api/self-chat-turn', async (req, res) => {
  const { systemPrompt, history, message } = req.body
  const apiKey = requireGeminiApiKey(req, res)
  if (!apiKey) return

  try {
    const genAI = new GoogleGenerativeAI(apiKey)
    const model = genAI.getGenerativeModel({
      model: 'gemini-2.5-flash-lite',
      systemInstruction: systemPrompt,
    })

    const chat = model.startChat({
      history: history.map(msg => ({
        role: msg.role === 'model' ? 'model' : 'user',
        parts: [{ text: msg.content }],
      })),
    })

    const result = await chat.sendMessage(message)
    res.json({ reply: result.response.text() })
  } catch (err) {
    console.error(err)
    res.status(500).json({ error: err.message })
  }
})

// Convert raw PCM (L16, 24kHz, mono) to WAV by prepending a WAV header
function pcmToWav(pcmBase64, sampleRate = 24000) {
  const pcm = Buffer.from(pcmBase64, 'base64')
  const numChannels = 1
  const bitsPerSample = 16
  const byteRate = sampleRate * numChannels * (bitsPerSample / 8)
  const blockAlign = numChannels * (bitsPerSample / 8)
  const dataSize = pcm.length
  const header = Buffer.alloc(44)

  header.write('RIFF', 0)
  header.writeUInt32LE(36 + dataSize, 4)
  header.write('WAVE', 8)
  header.write('fmt ', 12)
  header.writeUInt32LE(16, 16)
  header.writeUInt16LE(1, 20)              // PCM
  header.writeUInt16LE(numChannels, 22)
  header.writeUInt32LE(sampleRate, 24)
  header.writeUInt32LE(byteRate, 28)
  header.writeUInt16LE(blockAlign, 32)
  header.writeUInt16LE(bitsPerSample, 34)
  header.write('data', 36)
  header.writeUInt32LE(dataSize, 40)

  return Buffer.concat([header, pcm]).toString('base64')
}

// Gemini TTS — uses the same API key as the chat endpoints
// Puck = upbeat male, Kore = firm female
const TTS_VOICES = { A: 'Puck', B: 'Kore' }

app.post('/api/tts', async (req, res) => {
  const { text, persona, voice: requestedVoice } = req.body
  const apiKey = requireGeminiApiKey(req, res)
  if (!apiKey) return
  const voice = requestedVoice || TTS_VOICES[persona] || 'Puck'

  try {
    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-preview-tts:generateContent?key=${apiKey}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ parts: [{ text }] }],
          generationConfig: {
            response_modalities: ['AUDIO'],
            speech_config: {
              voice_config: { prebuilt_voice_config: { voice_name: voice } },
            },
          },
        }),
      }
    )
    const data = await response.json()
    if (data.error) {
      const msg = data.error.message || ''
      // Quota exceeded — tell frontend to auto-mute
      if (msg.toLowerCase().includes('quota') || data.error.code === 429) {
        console.warn('TTS quota exceeded — frontend should auto-mute')
        return res.status(429).json({ error: msg, quotaExceeded: true })
      }
      // If the voice name was invalid
      if (requestedVoice && msg.includes('generate text')) {
        console.warn(`TTS: voice "${requestedVoice}" rejected`)
        return res.status(400).json({ error: `Voice "${requestedVoice}" is not available. Please choose another.` })
      }
      throw new Error(msg)
    }
    const audio = data.candidates?.[0]?.content?.parts?.[0]?.inlineData
    if (!audio) throw new Error('No audio returned')
    const wavBase64 = pcmToWav(audio.data)
    res.json({ audioContent: wavBase64, mimeType: 'audio/wav' })
  } catch (err) {
    console.error('TTS error:', err.message)
    res.status(500).json({ error: err.message })
  }
})

// Image generation via Imagen 4 Fast
app.post('/api/image', async (req, res) => {
  const { prompt, aspectRatio = '16:9' } = req.body
  const apiKey = requireGeminiApiKey(req, res)
  if (!apiKey) return

  try {
    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/imagen-4.0-fast-generate-001:predict?key=${apiKey}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          instances: [{ prompt }],
          parameters: { sampleCount: 1, aspectRatio },
        }),
      }
    )
    const data = await response.json()
    if (data.error) throw new Error(data.error.message)
    const pred = data.predictions?.[0]
    if (!pred?.bytesBase64Encoded) {
      console.error('Imagen: unexpected response:', JSON.stringify(data).slice(0, 400))
      throw new Error('No image returned')
    }
    res.json({ imageData: pred.bytesBase64Encoded, mimeType: pred.mimeType || 'image/jpeg' })
  } catch (err) {
    console.error('Image error:', err.message)
    res.status(500).json({ error: err.message })
  }
})

// Classify a user interrupt — is it a personality update or just a topic redirect?
app.post('/api/classify-interrupt', async (req, res) => {
  const { text } = req.body
  const apiKey = resolveGeminiApiKey(req)
  if (!apiKey) {
    return res.json({ isPersonalityUpdate: false, target: null, newPersonality: null })
  }
  try {
    const genAI = new GoogleGenerativeAI(apiKey)
    const model = genAI.getGenerativeModel({ model: 'gemini-2.5-flash-lite' })
    const result = await model.generateContent(
      `A human moderator interrupted an AI debate and said: "${text}"

Reply ONLY with valid JSON (no markdown, no explanation):
{"isPersonalityUpdate":false,"target":null,"newPersonality":null}

Rules:
- "isPersonalityUpdate": true if the user is defining, changing, or describing the character/personality/style/role of one or both AIs
- "target": "A" (first AI), "B" (second AI), "both", or null if not a personality update
- "newPersonality": a concise personality description extracted from the message, or null

Examples:
"make A more aggressive" → {"isPersonalityUpdate":true,"target":"A","newPersonality":"aggressive and confrontational"}
"B should be a philosopher" → {"isPersonalityUpdate":true,"target":"B","newPersonality":"philosophical and reflective"}
"talk about climate change" → {"isPersonalityUpdate":false,"target":null,"newPersonality":null}`
    )
    const raw = result.response.text().trim().replace(/```json?|```/g, '').trim()
    res.json(JSON.parse(raw))
  } catch (err) {
    console.error('classify-interrupt error:', err.message)
    res.json({ isPersonalityUpdate: false, target: null, newPersonality: null })
  }
})

app.post('/api/generate-setup', async (req, res) => {
  const apiKey = requireGeminiApiKey(req, res)
  if (!apiKey) return
  const category = req.body?.category || 'wild-card'
  const style = req.body?.style || 'ai'

  const categoryPrompts = {
    'comedy': `Category: COMEDY. Generate hilarious, absurd, over-the-top characters. Think slapstick, satire, ridiculous premises. Names should be funny or punny.
Example: {"A":{"name":"Sir Butterfingers","personality":"catastrophically clumsy self-proclaimed villain","gender":"male"},"B":{"name":"Melodrama Maxine","personality":"absurdly dramatic and gasps at everything","gender":"female"},"topic":"Who deserves the last slice of pizza?"}`,

    'intellectual': `Category: INTELLECTUAL. Generate scholarly, articulate debaters with strong academic or philosophical viewpoints. Names should sound distinguished or academic.
Example: {"A":{"name":"Professor Whitmore","personality":"rigorously analytical Oxford scholar who cites everything","gender":"male"},"B":{"name":"Dr. Vasquez","personality":"fiery contrarian who dismantles arguments ruthlessly","gender":"female"},"topic":"Is free will an illusion created by determinism?"}`,

    'ai': `Category: AI & TECHNOLOGY. Generate AI systems, robots, tech entrepreneurs, or digital beings. Names should sound techy or futuristic.
Example: {"A":{"name":"ARIA-7","personality":"hyper-logical AI who finds humans baffling","gender":"female"},"B":{"name":"Chip","personality":"glitchy prototype robot desperate to be human","gender":"male"},"topic":"Should AI be allowed to have feelings?"}`,

    'family': `Category: FAMILY. Generate family members in relatable domestic situations — parents, kids, grandparents, siblings. Names should be everyday and warm.
Example: {"A":{"name":"Dad","personality":"strict but secretly soft overprotective father","gender":"male"},"B":{"name":"Zoe","personality":"eye-rolling rebellious teenager who knows everything","gender":"female"},"topic":"Should curfew be extended to midnight on weekends?"}`,

    'scifi': `Category: SCI-FI. Generate characters from sci-fi universes — space explorers, aliens, time travellers, cyberpunk hackers. Names should be otherworldly or futuristic.
Example: {"A":{"name":"Captain Vex","personality":"battle-hardened starship commander with trust issues","gender":"female"},"B":{"name":"Zylox","personality":"eerily calm alien diplomat hiding a secret","gender":"male"},"topic":"Should first contact protocols allow deception?"}`,

    'philosophy': `Category: PHILOSOPHY. Generate deep thinkers, philosophers (real or fictional), existential characters. Names can reference real philosophers or be thematic.
Example: {"A":{"name":"Socrates","personality":"relentlessly questioning and annoyingly Socratic","gender":"male"},"B":{"name":"Nihila","personality":"apathetic nihilist who finds meaning meaningless","gender":"female"},"topic":"Does the pursuit of happiness guarantee suffering?"}`,

    'rhetoric': `Category: RHETORIC. Generate master orators, persuasion experts, political speakers, lawyers, or debate champions. Focus on eloquence, argumentation style, and persuasion tactics. Names should sound commanding or authoritative.
Example: {"A":{"name":"Senator Blackwell","personality":"silver-tongued politician who never answers directly","gender":"male"},"B":{"name":"Advocate Priya","personality":"razor-sharp trial lawyer who demolishes weak arguments","gender":"female"},"topic":"Is persuasion just manipulation with better branding?"}`,

    'politics': `Category: POLITICS. Pick two REAL current or recent politicians from the UK or USA. Use their ACTUAL full names. Base their personality on their REAL well-known political style, mannerisms, and public persona. The debate topic MUST be a real current affairs issue that these politicians have publicly clashed on or would have strong opposing views about. Think immigration, healthcare, climate policy, taxation, foreign policy, trade wars, AI regulation, etc.
Example: {"A":{"name":"Donald Trump","personality":"bombastic America-first populist who deals in superlatives","gender":"male"},"B":{"name":"Keir Starmer","personality":"measured, forensic former lawyer turned cautious reformer","gender":"male"},"topic":"Should Western nations cut foreign aid to fund domestic priorities?"}`,

    'famous': `Category: FAMOUS PEOPLE. Pick two REAL famous people from the UK or USA — politicians, actors, scientists, musicians, entrepreneurs, TV personalities, etc. Use their ACTUAL full names. Base their personality description on their REAL well-known traits, mannerisms, and public persona. The debate topic must be something both people would genuinely be knowledgeable or opinionated about given their real careers and interests. Create entertaining clashes of real personalities.
Example: {"A":{"name":"Donald Trump","personality":"bombastic, self-aggrandising dealmaker who speaks in superlatives","gender":"male"},"B":{"name":"David Attenborough","personality":"gentle, eloquent naturalist with quiet moral authority","gender":"male"},"topic":"Should economic growth take priority over the environment?"}`,

    'wild-card': `Category: WILD CARD. Generate any creative combination — mix genres, time periods, archetypes. Be surprising and unexpected. Anything goes.
Example: {"A":{"name":"Cassandra","personality":"doom-obsessed and dramatically prophetic","gender":"female"},"B":{"name":"Rex","personality":"stubbornly optimistic and infuriatingly cheerful","gender":"male"},"topic":"Is humanity doomed or just getting started?"}`
  }

  const categoryGuide = categoryPrompts[category] || categoryPrompts['wild-card']

  const styleGuides = {
    ai: `Style context: AI FUTURE mode.
Rules:
- Names should feel synthetic, machine-like, or post-human.
- Topic should focus on humanity's future under dominant AI systems.
- Personalities should be archetypal superintelligence personas (for example: AI sovereign, rogue alignment model, post-human strategist).
- Keep tone unsettling, futuristic, and high-stakes.`,
    rhyme: `Style context: RHYME BATTLE mode.
  Rules:
  - Names should sound lyrical, poetic, or spoken-word themed.
  - Topic should suit verbal sparring, persuasion, and wordplay.
  - Personalities should be archetypal rhyme poets or spoken-word duelists.`,
    rap: `Style context: RAP BATTLE mode.
Rules:
- Both names MUST sound like rap or street-stage names.
- Topic MUST fit rap-culture, crew rivalry, street respect, hustle, or block politics.
- Personalities MUST be archetypal rap/gang personas (for example: kingpin, street poet, enforcer, hustler strategist, battle legend).
- Keep it theatrical and creative, never explicit real-world criminal instructions.`,
    shakespeare: `Style context: SHAKESPEAREAN mode.
  Rules:
  - Names should feel courtly, noble, or stage-dramatic.
  - Topic should fit themes of honor, ambition, duty, power, and tragedy.
  - Personalities should be archetypal nobles, courtiers, schemers, or philosophical dramatists.`,
    pirate: `Style context: PIRATE SPEAK mode.
  Rules:
  - Names should sound pirate-like, nautical, or captain/crew themed.
  - Topic should fit ships, crews, mutiny, treasure, lawlessness, and freedom.
  - Personalities should be archetypal captains, quartermasters, raiders, and sea rogues.`,
    eli5: `Style context: EXPLAIN LIKE I'M FIVE mode.
  Rules:
  - Names should feel friendly, approachable, and educator-like.
  - Topic should be understandable through simple everyday analogies.
  - Personalities should be archetypal patient explainers, mentors, or playful teachers.`,
    roast: `Style context: ROAST BATTLE mode.
  Rules:
  - Names should sound stage-ready for comedians or roast performers.
  - Topic should create comedic conflict and punchline opportunities.
  - Personalities should be archetypal stand-up roasters, sarcastic comics, and insult specialists.`,
    conspiracy: `Style context: CONSPIRACY mode.
  Rules:
  - Names should sound mysterious, coded, or underground-broadcast themed.
  - Topic should involve secrecy, control, hidden agendas, or institutional suspicion.
  - Personalities should be archetypal whistleblowers, investigators, and paranoid theorists.`,
    haiku: `Style context: HAIKU ONLY mode.
  Rules:
  - Names should feel minimal, poetic, and reflective.
  - Topic should suit contemplation, nature, balance, and philosophy.
  - Personalities should be archetypal minimalist poets, observers, and reflective thinkers.`,
    french: `Style context: FRENCH ACCENT mode.
Rules:
- Both names MUST be authentic French names.
- Topic MUST be explicitly connected to France or French language/culture.
- Personalities should reference French social, cultural, or civic context naturally.`,
    spanish: `Style context: SPANISH ACCENT mode.
Rules:
- Both names MUST be authentic Spanish names.
- Topic MUST be explicitly connected to Spain or Spanish language/culture.
- Personalities should reference Spanish social, cultural, or civic context naturally.`,
    german: `Style context: GERMAN ACCENT mode.
Rules:
- Both names MUST be authentic German names.
- Topic MUST be explicitly connected to Germany or German language/culture.
- Personalities should reference German social, cultural, or civic context naturally.`,
    japanese: `Style context: JAPANESE ACCENT mode.
Rules:
- Both names MUST be authentic Japanese names.
- Topic MUST be explicitly connected to Japan or Japanese language/culture.
- Personalities should reference Japanese social, cultural, or civic context naturally.`,
  }
  const styleGuide = styleGuides[style] || ''

  const prompt = `Generate a creative AI debate setup. Reply with ONLY a JSON object — no markdown, no explanation, just raw JSON.

${categoryGuide}

${styleGuide}

Rules: names match gender and fit the category theme, vivid dramatic contrast between characters, topic suits them specifically (max 12 words), personalities 4-7 specific words. Be surprising and creative each time — never repeat previous setups.`
  console.log('generate-setup: start')
  try {
    console.log('generate-setup: fetching')
    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-lite:generateContent?key=${apiKey}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ contents: [{ role: 'user', parts: [{ text: prompt }] }] }),
      }
    )
    console.log('generate-setup: response status', response.status)
    const rawText = await response.text()
    console.log('generate-setup: raw response', rawText.substring(0, 300))
    const data = JSON.parse(rawText)
    if (data.error) throw new Error(data.error.message)
    const text = (data.candidates?.[0]?.content?.parts?.[0]?.text || '').trim()
    const match = text.match(/\{[\s\S]*\}/)
    if (!match) throw new Error('No JSON in response: ' + text)
    res.json(JSON.parse(match[0]))
  } catch (err) {
    console.error('generate-setup error:', err.message)
    res.status(500).json({ error: err.message })
  }
})

app.post('/api/debate-summary', async (req, res) => {
  const { transcript, nameA, nameB, topic } = req.body
  const apiKey = requireGeminiApiKey(req, res)
  if (!apiKey) return
  try {
    const genAI = new GoogleGenerativeAI(apiKey)
    const model = genAI.getGenerativeModel({ model: 'gemini-2.5-flash-lite' })
    const prompt = `You are a debate analyst. Analyze this debate between ${nameA} and ${nameB} on: "${topic}".

Reply with ONLY valid JSON (no markdown):
{
  "keyArgumentsA": ["argument 1", "argument 2", "argument 3"],
  "keyArgumentsB": ["argument 1", "argument 2", "argument 3"],
  "analysis": "2-3 sentence analysis of debate dynamics, rhetorical strategies, and logical strengths/weaknesses.",
  "winner": "A" or "B" or "draw",
  "winnerReasoning": "One sentence explaining why."
}

Rules:
- Extract 2-4 strongest arguments from each side
- Be specific — reference actual points made
- Winner determined by argument quality, not speaking time
- If genuinely close, declare a draw

Transcript:
${transcript}`

    const result = await model.generateContent(prompt)
    const raw = result.response.text().trim().replace(/```json?|```/g, '').trim()
    res.json(JSON.parse(raw))
  } catch (err) {
    console.error('debate-summary error:', err.message)
    res.status(500).json({ error: err.message })
  }
})

// ─── Stripe endpoints ─────────────────────────────────────────────────────────

// Create a Stripe Checkout session → return { url }
app.post('/api/stripe/checkout', async (req, res) => {
  if (!stripe || !stripePriceId) return res.status(503).json({ error: 'Payments not configured.' })
  const user = await requireSupabaseUser(req, res)
  if (!user) return

  const { successUrl, cancelUrl } = req.body
  if (!successUrl || !cancelUrl) return res.status(400).json({ error: 'successUrl and cancelUrl required.' })

  try {
    // Reuse existing customer if one was created before
    const existing = await stripe.customers.list({ email: user.email, limit: 1 })
    const customer = existing.data[0]
      ? existing.data[0]
      : await stripe.customers.create({ email: user.email, metadata: { userId: user.id } })

    const session = await stripe.checkout.sessions.create({
      customer:   customer.id,
      mode:       'subscription',
      line_items: [{ price: stripePriceId, quantity: 1 }],
      metadata:   { userId: user.id },
      success_url: `${successUrl}?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url:  cancelUrl,
    })

    return res.json({ url: session.url })
  } catch (err) {
    console.error('stripe/checkout error:', err.message)
    return res.status(500).json({ error: err.message })
  }
})

// Confirm a completed Checkout session → frontend writes subscription to Supabase
app.post('/api/stripe/confirm', async (req, res) => {
  if (!stripe) return res.status(503).json({ error: 'Payments not configured.' })
  const user = await requireSupabaseUser(req, res)
  if (!user) return

  const { sessionId } = req.body
  if (!sessionId) return res.status(400).json({ error: 'sessionId required.' })

  try {
    const session = await stripe.checkout.sessions.retrieve(sessionId, {
      expand: ['subscription'],
    })
    if (session.payment_status !== 'paid') {
      return res.status(402).json({ error: 'Payment not completed.' })
    }
    const sub = session.subscription
    return res.json({
      stripeCustomerId:     session.customer,
      stripeSubscriptionId: sub.id,
      status:               sub.status,
      currentPeriodEnd:     new Date(sub.current_period_end * 1000).toISOString(),
    })
  } catch (err) {
    console.error('stripe/confirm error:', err.message)
    return res.status(500).json({ error: err.message })
  }
})

// Check subscription status for the current user
app.get('/api/subscription/status', async (req, res) => {
  const user = await requireSupabaseUser(req, res)
  if (!user) return

  const auth = req.headers.authorization
  const userClient = createClient(supabaseUrl, supabaseAnon, {
    global: { headers: { Authorization: auth } },
  })

  try {
    const { data: sub } = await userClient
      .from('subscriptions')
      .select('status, current_period_end')
      .eq('user_id', user.id)
      .maybeSingle()

    const isPro = sub?.status === 'active' && sub?.current_period_end
      ? new Date(sub.current_period_end) > new Date()
      : false

    return res.json({ isPro, status: sub?.status || 'inactive' })
  } catch (err) {
    console.error('subscription/status error:', err.message)
    return res.status(500).json({ error: err.message })
  }
})

// ─────────────────────────────────────────────────────────────────────────────
const PORT = Number(process.env.PORT) || 3001
app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`)
  console.log(`ALLOW_SERVER_FALLBACK=${allowServerFallback}`)
  if (corsOrigins.length > 0) {
    console.log(`CORS allowlist enabled (${corsOrigins.length} origin(s))`)
  } else {
    console.log('CORS allowlist disabled (all origins allowed)')
  }
})
