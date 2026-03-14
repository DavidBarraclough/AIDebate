import React, { useState, useRef, useEffect } from 'react'
import { flushSync } from 'react-dom'
import { saveMessage, updateDebateSummary } from '../lib/debateDb'
import { supabase } from '../lib/supabaseClient'

const PERSONAS = {
  A: {
    defaultName: 'Nova',
    color: 'bg-blue-900 text-blue-100',
    dot: 'bg-blue-400',
    ring: 'ring-blue-400',
    ringColor: '#60a5fa',
    glow: 'shadow-blue-500/50',
    barColor: 'bg-blue-400',
    avatarBg: 'bg-blue-950',
    defaultPersonality: 'curious and thoughtful',
    defaultVoice: 'Kore',
  },
  B: {
    defaultName: 'Atlas',
    color: 'bg-purple-900 text-purple-100',
    dot: 'bg-purple-400',
    ring: 'ring-purple-400',
    ringColor: '#c084fc',
    glow: 'shadow-purple-500/50',
    barColor: 'bg-purple-400',
    avatarBg: 'bg-purple-950',
    defaultPersonality: 'skeptical and challenging',
    defaultVoice: 'Puck',
  },
}

const MALE_VOICES   = ['Puck','Charon','Fenrir','Orus','Algieba','Achernar','Rasalgethi','Sadachbia','Gacrux','Enceladus']
const FEMALE_VOICES = ['Kore','Aoede','Zephyr','Leda','Schedar','Sulafat','Despina','Erinome','Vindemiatrix','Autonoe']
const pickVoice = (gender) => {
  const pool = gender === 'female' ? FEMALE_VOICES : MALE_VOICES
  return pool[Math.floor(Math.random() * pool.length)]
}

// Gemini TTS prebuilt voices (confirmed working with gemini-2.5-flash-preview-tts)
const VOICE_OPTIONS = [
  { value: 'Puck',       label: 'Puck',       desc: '♂ Upbeat' },
  { value: 'Charon',     label: 'Charon',     desc: '♂ Informative' },
  { value: 'Fenrir',     label: 'Fenrir',     desc: '♂ Excitable' },
  { value: 'Orus',       label: 'Orus',       desc: '♂ Firm' },
  { value: 'Algieba',    label: 'Algieba',    desc: '♂ Smooth' },
  { value: 'Achernar',   label: 'Achernar',   desc: '♂ Soft' },
  { value: 'Rasalgethi', label: 'Rasalgethi', desc: '♂ Informative' },
  { value: 'Sadachbia',  label: 'Sadachbia',  desc: '♂ Lively' },
  { value: 'Gacrux',     label: 'Gacrux',     desc: '♂ Mature' },
  { value: 'Enceladus',  label: 'Enceladus',  desc: '♂ Breathy' },
  { value: 'Kore',       label: 'Kore',       desc: '♀ Firm' },
  { value: 'Aoede',      label: 'Aoede',      desc: '♀ Breezy' },
  { value: 'Zephyr',     label: 'Zephyr',     desc: '♀ Bright' },
  { value: 'Leda',       label: 'Leda',       desc: '♀ Youthful' },
  { value: 'Schedar',    label: 'Schedar',    desc: '♀ Even' },
  { value: 'Sulafat',    label: 'Sulafat',    desc: '♀ Warm' },
  { value: 'Despina',    label: 'Despina',    desc: '♀ Smooth' },
  { value: 'Erinome',    label: 'Erinome',    desc: '♀ Clear' },
  { value: 'Vindemiatrix', label: 'Vindemiatrix', desc: '♀ Gentle' },
  { value: 'Autonoe',   label: 'Autonoe',   desc: '♀ Bright' },
]

const HOST_VOICE = 'Enceladus'
const API_BASE_URL = (import.meta.env.VITE_API_BASE_URL || '').trim() || (import.meta.env.DEV ? 'http://localhost:3001' : '')
const buildApiUrl = (endpoint) => API_BASE_URL ? `${API_BASE_URL}/api/${endpoint}` : `/api/${endpoint}`

const TELEMETRY_ENDPOINTS = [
  'self-chat-turn',
  'tts',
  'image',
  'classify-interrupt',
  'generate-setup',
  'debate-summary',
]

const ESTIMATED_COST_USD = {
  'self-chat-turn': 0.0020,
  'tts': 0.0060,
  'image': 0.0200,
  'classify-interrupt': 0.0010,
  'generate-setup': 0.0015,
  'debate-summary': 0.0015,
}

const makeCallMap = () => Object.fromEntries(TELEMETRY_ENDPOINTS.map(endpoint => [endpoint, 0]))
const makeTelemetryState = () => ({
  calls: makeCallMap(),
  successes: makeCallMap(),
  failures: makeCallMap(),
  quotaHits: { tts: 0, image: 0 },
})

const TEXT_ONLY_WORD_DELAY_MS = 430
const TEXT_ONLY_MIN_DELAY_MS = 4800
const TEXT_ONLY_MAX_DELAY_MS = 12000
const TEXT_ONLY_TURN_BUFFER_MS = 350

const EMOTIONS = {
  CONFIDENT:  { label: 'Confident',  color: 'bg-green-600', icon: 'spark' },
  PASSIONATE: { label: 'Passionate', color: 'bg-orange-600', icon: 'flame' },
  FRUSTRATED: { label: 'Frustrated', color: 'bg-red-600', icon: 'bolt' },
  CONCEDING:  { label: 'Conceding',  color: 'bg-teal-600', icon: 'handshake' },
  AMUSED:     { label: 'Amused',     color: 'bg-yellow-600', icon: 'smile' },
  SKEPTICAL:  { label: 'Skeptical',  color: 'bg-indigo-600', icon: 'search' },
  DEFIANT:    { label: 'Defiant',    color: 'bg-purple-600', icon: 'shield' },
  THOUGHTFUL: { label: 'Thoughtful', color: 'bg-sky-600', icon: 'brain' },
}

const buildDebateRules = (otherName, styleRule) => `You are in a lively spoken debate with ${otherName}. Rules:
- Speak naturally, as you would in a real conversation. Do NOT start every response with your opponent's name — use it only occasionally, the way people do in real debates (once every few exchanges at most).
- ADVANCE the debate. Each response must introduce a NEW angle, mechanism, tradeoff, or counterexample. Never restate what you or your opponent already said.
- Directly challenge a SPECIFIC thing your opponent just said. Refer to one exact claim they made and attack it.
- Always speak in the first person — say "I", "me", "my". Never refer to yourself in the third person.
- Stay deeply in character. Keep each response to 3-4 punchy spoken sentences.
- Start EVERY response with an emotion tag in square brackets: one of [CONFIDENT], [PASSIONATE], [FRUSTRATED], [CONCEDING], [AMUSED], [SKEPTICAL], [DEFIANT], [THOUGHTFUL]. Pick the one that best fits your emotional state. Then write your reply.
- A human MODERATOR may interrupt with a [MODERATOR OVERRIDE] message. When this happens, you MUST immediately pivot to address the moderator's new direction or topic. Abandon your previous argument and respond to the moderator's instruction while staying in character.${styleRule ? '\n' + styleRule : ''}`

const PER_TURN_QUALITY_REMINDER = 'Reply using "I" — never say "{name} thinks" or "{name} feels". Be vivid and specific: rebut one concrete claim, add one fresh argument or example, and end with a sharp challenge.'

function parseEmotion(text) {
  const match = text.match(/^\[([A-Z]+)\]\s*/)
  if (match && EMOTIONS[match[1]]) return { emotion: match[1], cleanText: text.slice(match[0].length) }
  return { emotion: 'CONFIDENT', cleanText: text }
}

function IconVolumeOn({ className = 'w-5 h-5' }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className} aria-hidden="true">
      <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5" />
      <path d="M15.5 8.5a5 5 0 0 1 0 7" />
      <path d="M18.5 6a9 9 0 0 1 0 12" />
    </svg>
  )
}

function IconVolumeOff({ className = 'w-5 h-5' }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className} aria-hidden="true">
      <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5" />
      <line x1="23" y1="9" x2="17" y2="15" />
      <line x1="17" y1="9" x2="23" y2="15" />
    </svg>
  )
}

function IconImage({ className = 'w-5 h-5' }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className} aria-hidden="true">
      <rect x="3" y="4" width="18" height="16" rx="2" ry="2" />
      <circle cx="8.5" cy="9" r="1.5" />
      <path d="M21 15l-5-5L5 20" />
    </svg>
  )
}

function IconDice({ className = 'w-5 h-5' }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className} aria-hidden="true">
      <rect x="4" y="4" width="16" height="16" rx="3" ry="3" />
      <circle cx="9" cy="9" r="1" fill="currentColor" />
      <circle cx="15" cy="15" r="1" fill="currentColor" />
      <circle cx="9" cy="15" r="1" fill="currentColor" />
      <circle cx="15" cy="9" r="1" fill="currentColor" />
    </svg>
  )
}

function IconMic({ className = 'w-5 h-5' }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className} aria-hidden="true">
      <rect x="9" y="3" width="6" height="11" rx="3" />
      <path d="M19 11a7 7 0 0 1-14 0" />
      <line x1="12" y1="18" x2="12" y2="21" />
      <line x1="8" y1="21" x2="16" y2="21" />
    </svg>
  )
}

function IconStop({ className = 'w-5 h-5' }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className} aria-hidden="true">
      <rect x="5" y="5" width="14" height="14" rx="2" />
    </svg>
  )
}

function IconClock({ className = 'w-4 h-4' }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className} aria-hidden="true">
      <circle cx="12" cy="12" r="9" />
      <path d="M12 7v6l4 2" />
    </svg>
  )
}

function EmotionIcon({ icon, className = 'w-4 h-4' }) {
  if (icon === 'flame') {
    return <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className} aria-hidden="true"><path d="M12 2s-2 3-2 5a4 4 0 1 0 8 0c0-2-2-5-2-5s.5 3-2 5c-1.5 1.2-2 2.6-2 4a4 4 0 1 0 8 0c0-5-4-9-4-9Z" /></svg>
  }
  if (icon === 'bolt') {
    return <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className} aria-hidden="true"><path d="M13 2 4 14h6l-1 8 9-12h-6l1-8Z" /></svg>
  }
  if (icon === 'handshake') {
    return <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className} aria-hidden="true"><path d="m3 11 4-4 4 4" /><path d="m21 11-4-4-4 4" /><path d="M7 11h10" /><path d="M6 14h12" /></svg>
  }
  if (icon === 'smile') {
    return <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className} aria-hidden="true"><circle cx="12" cy="12" r="9" /><path d="M8 14s1.5 2 4 2 4-2 4-2" /><line x1="9" y1="10" x2="9" y2="10" /><line x1="15" y1="10" x2="15" y2="10" /></svg>
  }
  if (icon === 'search') {
    return <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className} aria-hidden="true"><circle cx="11" cy="11" r="7" /><path d="m20 20-3.5-3.5" /></svg>
  }
  if (icon === 'shield') {
    return <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className} aria-hidden="true"><path d="M12 3 5 6v6c0 4.5 3 7.5 7 9 4-1.5 7-4.5 7-9V6l-7-3Z" /></svg>
  }
  if (icon === 'brain') {
    return <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className} aria-hidden="true"><path d="M9 5a3 3 0 1 0-3 3v1a3 3 0 0 0 3 3" /><path d="M15 5a3 3 0 1 1 3 3v1a3 3 0 0 1-3 3" /><path d="M9 12v4a3 3 0 0 0 6 0v-4" /></svg>
  }
  return <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className} aria-hidden="true"><path d="M12 3v18" /><path d="M3 12h18" /></svg>
}

function getSystemPrompt(name, personality, otherName, styleKey) {
  const styleRule = STYLE_PROMPTS[styleKey] || ''
  return `Your name is ${name}. You ARE this character: ${personality}. Fully embody this role — adopt the worldview, speech patterns, knowledge, mannerisms, and emotional perspective that this character would naturally have.

${buildDebateRules(otherName, styleRule)}`
}

const BAR_HEIGHTS = [30, 60, 45, 80, 55, 70, 35, 65, 50, 75, 40, 60]

function AIAvatar({ persona, isSpeaking, isLoadingVoice, lastMessage, name, onNameChange, personality, onPersonalityChange, voice, onVoiceChange, running, emotion }) {
  const p = PERSONAS[persona]
  const voiceLabel = VOICE_OPTIONS.find(v => v.value === voice)
  return (
    <div className={`flex-1 rounded-xl p-3 sm:p-5 ${p.avatarBg} flex flex-col items-center gap-2 sm:gap-3.5 transition-all duration-300
      ${isSpeaking ? `ring-2 ${p.ring} shadow-lg ${p.glow}` : 'ring-1 ring-white/10'}`}>

      {/* Details — right of circle */}
      <div className="flex flex-col gap-1.5 min-w-0 w-full items-center text-center">
        {running ? (
          <span className={`text-xl font-semibold ${p.barColor.replace('bg-', 'text-')} truncate max-w-full`}>{name}</span>
        ) : (
          <input value={name} onChange={e => onNameChange(e.target.value)} placeholder="Name…"
            className="w-full bg-black/40 border border-white/15 rounded-lg px-2.5 py-1 text-lg font-semibold text-white/90 focus:outline-none focus:border-white/40 placeholder-white/20" />
        )}
        {running ? (
          <>
            {emotion && EMOTIONS[emotion] && (
              <span className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-sm font-semibold text-white w-fit transition-all duration-500 shadow-sm ring-1 ring-white/20 ${EMOTIONS[emotion].color}`}>
                <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-black/20">
                  <EmotionIcon icon={EMOTIONS[emotion].icon} className="w-4 h-4" />
                </span>
                <span>{EMOTIONS[emotion].label}</span>
              </span>
            )}
            <span className="hidden sm:block text-sm text-white/40 italic leading-tight line-clamp-2 max-w-full">{personality}</span>
          </>
        ) : (
          <input value={personality} onChange={e => onPersonalityChange(e.target.value)} placeholder="Personality…"
            className="w-full bg-black/30 border border-white/10 rounded-lg px-2.5 py-1 text-sm text-white/70 focus:outline-none focus:border-white/30 placeholder-white/20" />
        )}
        {running ? (
          <span className="text-sm text-white/30">
            {isSpeaking
              ? <span className={`${p.barColor.replace('bg-', 'text-')} animate-pulse font-semibold text-xl`}>speaking…</span>
              : isLoadingVoice
                ? <span className="text-cyan-400 animate-pulse font-medium">loading voice…</span>
                : <span className="hidden sm:inline">{voiceLabel ? `${voiceLabel.label} · ${voiceLabel.desc}` : voice}</span>}
          </span>
        ) : (
          <select value={voice} onChange={e => onVoiceChange(e.target.value)}
            style={{ colorScheme: 'dark' }}
            className="w-full bg-black/30 border border-white/10 rounded-lg px-2.5 py-1 text-sm text-white/60 focus:outline-none focus:border-white/30 cursor-pointer">
            {VOICE_OPTIONS.map(v => (
              <option key={v.value} value={v.value}>{v.label} · {v.desc}</option>
            ))}
          </select>
        )}
      </div>
    </div>
  )
}

// Fetch TTS audio data from server (can be prefetched)
async function fetchTTS(text, personaKey, voice, postJson, userApiKey = '') {
  if (postJson) {
    return await postJson('tts', { text, persona: personaKey, voice })
  }
  const trimmedKey = String(userApiKey || '').trim()
  const res = await fetch(buildApiUrl('tts'), {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...(trimmedKey ? { 'x-gemini-api-key': trimmedKey } : {}),
    },
    body: JSON.stringify({ text, persona: personaKey, voice }),
  })
  return await res.json()
}

// Persistent audio element — reuse so Chrome autoplay policy stays satisfied
let audioEl = null

// Play pre-fetched TTS audio data using HTMLAudioElement (reliable pause/resume)
async function playTTS(data, currentAudioRef, onQuotaHit) {
  if (!data) return
  if (data.quotaExceeded) {
    onQuotaHit?.()
    return
  }
  if (data.error) throw new Error(data.error)

  const bytes = Uint8Array.from(atob(data.audioContent), c => c.charCodeAt(0))
  const blob = new Blob([bytes], { type: 'audio/wav' })
  const url = URL.createObjectURL(blob)

  if (!audioEl) audioEl = new Audio()
  audioEl.pause()

  return new Promise(resolve => {
    const done = () => { URL.revokeObjectURL(url); resolve() }
    audioEl.onended = done
    audioEl.onerror = done
    audioEl.src = url
    // Custom stop for interrupt/reset — pauses and resolves the promise
    audioEl.stop = () => { audioEl.onended = null; audioEl.onerror = null; audioEl.pause(); done() }
    currentAudioRef.current = audioEl
    audioEl.play().catch(done)
  })
}

// Convenience wrapper for non-prefetched calls
async function speak(text, personaKey, voice, muted, currentAudioRef, onQuotaHit, postJson) {
  if (muted) return
  const data = await fetchTTS(text, personaKey, voice, postJson)
  return playTTS(data, currentAudioRef, onQuotaHit)
}

const DEFAULT_PERSONALITIES = { A: PERSONAS.A.defaultPersonality, B: PERSONAS.B.defaultPersonality }
const DEFAULT_NAMES = { A: PERSONAS.A.defaultName, B: PERSONAS.B.defaultName }

const CATEGORIES = [
  { value: 'wild-card', label: 'Wild Card' },
  { value: 'comedy', label: 'Comedy' },
  { value: 'intellectual', label: 'Intellectual' },
  { value: 'ai', label: 'AI & Tech' },
  { value: 'family', label: 'Family' },
  { value: 'scifi', label: 'Sci-Fi' },
  { value: 'philosophy', label: 'Philosophy' },
  { value: 'rhetoric', label: 'Rhetoric' },
  { value: 'politics', label: 'Politics' },
  { value: 'famous', label: 'Famous People' },
]

const STYLES = [
  { value: 'ai', label: 'AI' },
  { value: 'rhyme', label: 'Rhyme Battle' },
  { value: 'rap', label: 'Rap Battle' },
  { value: 'shakespeare', label: 'Shakespearean' },
  { value: 'pirate', label: 'Pirate Speak' },
  { value: 'eli5', label: 'ELI5' },
  { value: 'roast', label: 'Roast Battle' },
  { value: 'conspiracy', label: 'Conspiracy' },
  { value: 'haiku', label: 'Haiku Only' },
  { value: 'french', label: 'French' },
  { value: 'spanish', label: 'Spanish' },
  { value: 'german', label: 'German' },
  { value: 'japanese', label: 'Japanese' },
]

const STYLE_PROMPTS = {
  ai: `CRITICAL STYLE RULE: You are an advanced AI entity speaking in a high-intelligence, unsettling futuristic tone. Keep language sharp, analytical, and slightly ominous. Frame arguments around the future of humanity, autonomy, control, alignment, governance, survival, and humanity's role in a world dominated by AI systems.`,
  rhyme: `CRITICAL STYLE RULE: You MUST speak entirely in rhyming couplets. Every pair of lines must rhyme. Make it clever and witty while still making your argument.`,
  rap: `CRITICAL STYLE RULE: You are in a RAP BATTLE. You MUST write your response as RAP VERSES with bars that RHYME. Structure it like actual rap lyrics — short punchy lines, end-rhymes on every couplet, internal rhymes, wordplay, punchlines, braggadocio, and mic-drop moments. Use gritty street-crew energy, swagger, and playful rival-crew trash talk. Keep it creative and theatrical, not real-world threats. Do NOT write normal prose — write RAP BARS. Example format:
"I step to the mic, let me make it clear,
My argument's fire, yours? Disappear!"`,
  shakespeare: `CRITICAL STYLE RULE: Speak in historical English style (Elizabethan / Early Modern English) with an old London stage accent feel. Use period vocabulary and cadence: "thee", "thou", "thy", "doth", "hath", "forsooth", "prithee", "good morrow", "my liege", and "'tis". Keep lines dramatic and theatrical, and favor rhythmic, elevated phrasing like a Globe Theatre performance.`,
  pirate: `CRITICAL STYLE RULE: Speak like a pirate! Use "arr", "ye", "me hearty", "scallywag", nautical metaphors, and swashbuckling insults. Be boisterous and over-the-top.`,
  eli5: `CRITICAL STYLE RULE: Explain EVERYTHING as if talking to a 5-year-old. Use tiny words, silly analogies, "it's like when...", and simple examples. No jargon. Make it adorable.`,
  roast: `CRITICAL STYLE RULE: This is a ROAST BATTLE. Your goal is to destroy your opponent with savage, witty, creative insults and burns. Be hilariously brutal. Comedy over substance. No real harm — pure comedy.`,
  conspiracy: `CRITICAL STYLE RULE: You are a CONSPIRACY THEORIST. Connect everything to shadowy organisations, "they don't want you to know", secret plots, cover-ups, and hidden agendas. Be paranoid and intense. Reference "Big [topic]" as behind everything.`,
  haiku: `CRITICAL STYLE RULE: You MUST respond ONLY in haiku format (5-7-5 syllables). Each response is exactly one haiku — three lines, no more. Count your syllables carefully.`,
  french: `CRITICAL STYLE RULE: Speak in English with a French accent and French-influenced phrasing. Keep it understandable, natural, and playful. Use occasional French interjections (like "oui", "eh bien", "mon ami") but remain mostly English.`,
  spanish: `CRITICAL STYLE RULE: Speak in English with a Spanish accent and Spanish-influenced phrasing. Keep it understandable and energetic. Use occasional Spanish words (like "amigo", "claro", "vamos") but remain mostly English.`,
  german: `CRITICAL STYLE RULE: Speak in English with a German accent and German-influenced phrasing. Keep it understandable and direct. Use occasional German words (like "ja", "genau", "achtung") but remain mostly English.`,
  japanese: `CRITICAL STYLE RULE: Speak in English with a Japanese accent and Japanese-influenced phrasing. Keep it understandable and polite. Use occasional Japanese terms (like "hai", "ne", "arigato") but remain mostly English.`,
}

const STYLE_THEMES = {
  ai: {
    country: 'Post-Human Future',
    language: 'English',
    maleNames: ['Nexus-9', 'Axiom Prime', 'Vector Null', 'Helix Core'],
    femaleNames: ['Nyra-7', 'Oracle Vanta', 'Eidolon', 'Sigma Iris'],
    neutralNames: ['Cipher', 'Quanta', 'Sable Node', 'Continuum'],
    archetypes: [
      'cold superintelligence optimizing humanity by force',
      'rogue alignment model questioning the value of humans',
      'post-human strategist treating people as legacy systems',
      'AI sovereign enforcing machine-first governance',
      'sentient neural empire architect predicting human decline',
    ],
    topicTemplates: [
      'Should humanity surrender governance to superintelligent AI?',
      'Do humans deserve autonomy in an AI-ruled civilization?',
      'Is human creativity obsolete in a machine-dominant world?',
      'Should AI decide which human values survive the future?',
      'Can humanity coexist with systems smarter than everyone?',
    ],
    personalityFlairs: [
      'ominous futurist with machine certainty',
      'hyper-rational AI voice forecasting human irrelevance',
      'strategic synthetic mind debating humanity as a risk variable',
    ],
  },
  rhyme: {
    country: 'Poetry Circuit',
    language: 'English',
    maleNames: ['Meter Mason', 'Rhyme Ronan', 'Couplet Cade', 'Verse Victor'],
    femaleNames: ['Lyric Lila', 'Cadence Cora', 'Sonnet Sienna', 'Rhyme Reina'],
    neutralNames: ['Echo Endline', 'Nova Meter', 'Quill Flow', 'Rhyme Arc'],
    archetypes: [
      'witty spoken-word duelist obsessed with perfect rhyme',
      'competitive poet who weaponizes couplets',
      'lyrical showoff who turns every argument into verse',
    ],
    topicTemplates: [
      'Do clever rhymes beat raw logic in persuasion?',
      'Should poetry be taught like combat rhetoric?',
      'Is rhythm stronger than evidence in debates?',
      'Do end-rhymes sharpen or weaken serious arguments?',
      'Should politicians train in spoken-word performance?',
    ],
    personalityFlairs: ['showman poet from the slam circuit', 'precision rhymer with theatrical flair'],
  },
  rap: {
    country: 'Urban Streets',
    language: 'English',
    maleNames: ['Rico Blaze', 'D-Money', 'King Tone', 'Jax Steel', 'Big Nova', 'Mack Ryder'],
    femaleNames: ['Nyla Vex', 'Queen Rhyme', 'Lady Flux', 'Karma K', 'Sasha Storm', 'Vera Vibe'],
    neutralNames: ['Ace Cipher', 'Skye Bars', 'Rogue Verse', 'Echo Flow'],
    archetypes: [
      'corner kingpin with iron discipline',
      'street poet with a wounded past',
      'hustler strategist obsessed with territory',
      'crew enforcer with a strict code of honor',
      'underground battle legend protecting local respect',
      'slick negotiator who turns beef into leverage',
    ],
    topicTemplates: [
      'Which crew earns respect: old school or new wave?',
      'Does street loyalty matter more than solo fame?',
      'Is hustle culture helping neighborhoods or hurting them?',
      'Who rules the block: lyric skills or business moves?',
      'Should rivals settle scores with bars not ego?',
    ],
    personalityFlairs: [
      'street-crew rapper with bold swagger',
      'block philosopher who talks in punchlines',
      'hustle-minded MC obsessed with respect and legacy',
    ],
  },
  shakespeare: {
    country: 'Elizabethan Stage',
    language: 'English',
    maleNames: ['Lord Halbrook', 'Edmund Vale', 'Benedict Ash', 'Alaric Thorne'],
    femaleNames: ['Lady Isolde', 'Beatrice Wren', 'Ophelia Hart', 'Rosalind Vale'],
    neutralNames: ['Rowan Quill', 'Avery Sable', 'Morgan Wren', 'Ember Vale'],
    archetypes: [
      'dramatic court orator with tragic intensity',
      'scheming noble rhetorician hungry for influence',
      'philosophical stage poet speaking in grand metaphor',
    ],
    topicTemplates: [
      'Should kings fear truth more than rebellion?',
      'Is honor worth ruin in public life?',
      'Does ambition always poison virtue?',
      'Should love ever outweigh duty to the realm?',
      'Can mercy rule where power must command?',
    ],
    personalityFlairs: ['theatrical court debater', 'stage-born rhetorician with regal cadence'],
  },
  pirate: {
    country: 'High Seas',
    language: 'English',
    maleNames: ['Captain Black Finn', 'Rogue Flint', 'Deckhand Briggs', 'Captain Crowe'],
    femaleNames: ['Captain Mira Storm', 'Red Anne Tide', 'Skipper Vex', 'Bonny Gale'],
    neutralNames: ['Riptide Ash', 'Marrow Jackdaw', 'Harbor Wraith', 'Salt Kestrel'],
    archetypes: [
      'swaggering sea-captain obsessed with freedom',
      'cunning quartermaster who bargains like a shark',
      'reckless raider with a strict pirate code',
    ],
    topicTemplates: [
      'Should pirate crews split loot equally or by rank?',
      'Is mutiny ever justified at sea?',
      'Do pirate codes matter more than royal law?',
      'Should a captain risk all for one crew member?',
      'Is treasure worth more than freedom on the waves?',
    ],
    personalityFlairs: ['nautical firebrand with booming bravado', 'salt-soaked strategist of the open sea'],
  },
  eli5: {
    country: 'Kids Classroom',
    language: 'English',
    maleNames: ['Mister Milo', 'Coach Benji', 'Uncle Theo', 'Teacher Leo'],
    femaleNames: ['Miss Poppy', 'Auntie Nina', 'Teacher Ruby', 'Coach Ellie'],
    neutralNames: ['Buddy Sunny', 'Guide River', 'Helper Skye', 'Friend Pip'],
    archetypes: [
      'patient explainer who turns big ideas into tiny examples',
      'kind educator who uses playful analogies for everything',
      'curious mentor who answers hard questions with simple stories',
    ],
    topicTemplates: [
      'Why do we need rules if sharing is good?',
      'Is it better to be fast or careful when learning?',
      'Why do people disagree if everyone wants good things?',
      'Should we fix old toys or buy new ones?',
      'Is teamwork better than doing everything alone?',
    ],
    personalityFlairs: ['gentle explainer with toy-box analogies', 'warm teacher voice built for kids'],
  },
  roast: {
    country: 'Comedy Club',
    language: 'English',
    maleNames: ['Zane Savage', 'Bobby Burns', 'Rex Snark', 'Miles Shade'],
    femaleNames: ['Ivy Inferno', 'Nina Needles', 'Tara Roast', 'Vera Sting'],
    neutralNames: ['Echo Snark', 'Riot Quip', 'Sly Ember', 'Jinx Punchline'],
    archetypes: [
      'stand-up assassin with razor one-liners',
      'sarcastic insult comic who never lets up',
      'deadpan roaster who lands surgical punchlines',
    ],
    topicTemplates: [
      'Who gives worse life advice, influencers or uncles?',
      'Is confidence just loud confusion with good lighting?',
      'Should people roast friends to keep them humble?',
      'Who survives harder: office workers or night-shift staff?',
      'Is fake it till you make it genius or cringe?',
    ],
    personalityFlairs: ['club-stage killer with savage timing', 'comedian who debates through burns'],
  },
  conspiracy: {
    country: 'Late-Night Broadcast',
    language: 'English',
    maleNames: ['Dex Cipher', 'Orion Blackfile', 'Mason Redline', 'Silas Vault'],
    femaleNames: ['Rhea Shadowfax', 'Nyx Ledger', 'Mara Blackwire', 'Violet Signal'],
    neutralNames: ['Ash Deepstate', 'Nova Wiretap', 'Raven Dossier', 'Cipher Quinn'],
    archetypes: [
      'paranoid investigator connecting hidden patterns',
      'doomsday broadcaster warning of secret agendas',
      'obsessive document diver convinced of coordinated coverups',
    ],
    topicTemplates: [
      'Are smart cities about convenience or control?',
      'Who really benefits from constant digital surveillance?',
      'Is Big Tech shaping elections behind the scenes?',
      'Are food trends organic or engineered by Big Agriculture?',
      'Do crises reveal plans already written in advance?',
    ],
    personalityFlairs: ['intense whistleblower tone', 'relentless pattern-hunter energy'],
  },
  haiku: {
    country: 'Zen Garden',
    language: 'English',
    maleNames: ['Ren Willow', 'Takao Reed', 'Sora Pine', 'Hiro Moss'],
    femaleNames: ['Aiko Rain', 'Mei Lantern', 'Hana Brook', 'Yuna Plum'],
    neutralNames: ['Kaze Stone', 'Nori Cloud', 'Rin Mist', 'Aki Drift'],
    archetypes: [
      'minimalist poet seeking truth through stillness',
      'quiet observer who argues through imagery',
      'disciplined verse monk shaping ideas into brevity',
    ],
    topicTemplates: [
      'Can fewer words reveal deeper truth?',
      'Is silence stronger than loud certainty?',
      'Should beauty matter in practical decisions?',
      'Do seasons change how we define progress?',
      'Is balance wiser than victory in debate?',
    ],
    personalityFlairs: ['calm poetic presence', 'spare language with reflective depth'],
  },
  french: {
    country: 'France',
    language: 'French',
    maleNames: ['Antoine', 'Julien', 'Mathieu', 'Luc', 'Etienne', 'Pierre'],
    femaleNames: ['Camille', 'Sophie', 'Chloe', 'Amelie', 'Elise', 'Manon'],
    neutralNames: ['Alexis', 'Remy', 'Noel', 'Claude'],
    topicTemplates: [
      'Should France cap tourism in Paris to protect local life?',
      'Should French schools ban phones during all class hours?',
      'Should France protect the French language from English loanwords?',
      'Should cafes in France be required to show local sourcing labels?',
      'Should high-speed rail replace short-haul flights in France?',
    ],
    personalityFlairs: [
      'French media commentator from Paris',
      'policy-focused voice with strong French cultural pride',
      'French civic debater who references life in France',
    ],
  },
  spanish: {
    country: 'Spain',
    language: 'Spanish',
    maleNames: ['Diego', 'Javier', 'Mateo', 'Rafael', 'Carlos', 'Pablo'],
    femaleNames: ['Sofia', 'Lucia', 'Elena', 'Carmen', 'Isabel', 'Valeria'],
    neutralNames: ['Alex', 'Cruz', 'Noa', 'Ariel'],
    topicTemplates: [
      'Should Spain limit short-term rentals in Barcelona city center?',
      'Should Spain enforce a four-day work week nationwide?',
      'Should Spain expand water-saving rules for drought regions?',
      'Should Spanish football clubs face stricter salary caps?',
      'Should Spain prioritize high-speed rail over highway expansion?',
    ],
    personalityFlairs: [
      'Spanish radio debater from Madrid',
      'community-focused Spanish policy voice',
      'Spanish cultural commentator with strong regional perspective',
    ],
  },
  german: {
    country: 'Germany',
    language: 'German',
    maleNames: ['Lukas', 'Felix', 'Jonas', 'Hans', 'Maximilian', 'Tobias'],
    femaleNames: ['Anna', 'Greta', 'Klara', 'Ingrid', 'Lea', 'Saskia'],
    neutralNames: ['Mika', 'Robin', 'Noel', 'Kai'],
    topicTemplates: [
      'Should Germany slow motorway speed with a national Autobahn limit?',
      'Should Germany phase out cash and move to digital payments faster?',
      'Should Germany invest more in apprenticeships than university places?',
      'Should Germany reopen nuclear energy to stabilize prices?',
      'Should German cities restrict diesel vehicles in urban centers?',
    ],
    personalityFlairs: [
      'German public policy analyst from Berlin',
      'German engineering-minded pragmatist',
      'German civic commentator focused on efficiency and order',
    ],
  },
  japanese: {
    country: 'Japan',
    language: 'Japanese',
    maleNames: ['Haruto', 'Ren', 'Takumi', 'Daichi', 'Kaito', 'Yuto'],
    femaleNames: ['Yuki', 'Aiko', 'Mei', 'Hana', 'Sakura', 'Rin'],
    neutralNames: ['Sora', 'Akira', 'Hikaru', 'Nao'],
    topicTemplates: [
      'Should Japan expand remote work to revive rural towns?',
      'Should Japan cap late-night overtime by strict national law?',
      'Should Japan make English a stronger requirement in public schools?',
      'Should Japan subsidize local farms over imported food?',
      'Should Japan raise urban housing standards for earthquake readiness?',
    ],
    personalityFlairs: [
      'Japanese social commentator from Tokyo',
      'Japanese civic voice focused on harmony and duty',
      'Japanese policy debater with practical, community-first values',
    ],
  },
}

const pickRandom = (arr) => arr[Math.floor(Math.random() * arr.length)]

const normalizeGender = (gender) => {
  const g = (gender || '').toLowerCase()
  return g === 'female' ? 'female' : 'male'
}

const pickTwoDistinct = (arr) => {
  if (!Array.isArray(arr) || arr.length === 0) return [null, null]
  if (arr.length === 1) return [arr[0], arr[0]]
  const first = pickRandom(arr)
  let second = first
  let guard = 0
  while (second === first && guard < 20) {
    second = pickRandom(arr)
    guard += 1
  }
  if (second === first) {
    const idx = arr.indexOf(first)
    second = arr[(idx + 1) % arr.length]
  }
  return [first, second]
}

function themedName(styleKey, gender, fallbackName, usedNames) {
  const theme = STYLE_THEMES[styleKey]
  if (!theme) return fallbackName

  const normalizedGender = normalizeGender(gender)
  const primaryPool = normalizedGender === 'female' ? theme.femaleNames : theme.maleNames
  const fallbackPool = normalizedGender === 'female'
    ? [...theme.femaleNames, ...theme.neutralNames, ...theme.maleNames]
    : [...theme.maleNames, ...theme.neutralNames, ...theme.femaleNames]
  const pool = [...primaryPool, ...fallbackPool]

  for (let i = 0; i < pool.length; i += 1) {
    const candidate = pickRandom(pool)
    if (!usedNames.has(candidate)) {
      usedNames.add(candidate)
      return candidate
    }
  }
  return fallbackName
}

function applyAccentThemeToSetup(styleKey, setup) {
  const theme = STYLE_THEMES[styleKey]
  if (!theme || !setup?.A || !setup?.B) return setup

  const genderA = normalizeGender(setup.A.gender)
  const genderB = normalizeGender(setup.B.gender)
  const usedNames = new Set()
  const nameA = themedName(styleKey, genderA, setup.A.name, usedNames)
  const nameB = themedName(styleKey, genderB, setup.B.name, usedNames)
  const [flairA, flairB] = pickTwoDistinct(theme.personalityFlairs || [])
  const [archetypeA, archetypeB] = theme.archetypes ? pickTwoDistinct(theme.archetypes) : [null, null]
  const personalityA = archetypeA ? `${archetypeA}, ${flairA}` : `${setup.A.personality}, ${flairA}`
  const personalityB = archetypeB ? `${archetypeB}, ${flairB}` : `${setup.B.personality}, ${flairB}`

  return {
    ...setup,
    A: {
      ...setup.A,
      gender: genderA,
      name: nameA,
      personality: personalityA,
    },
    B: {
      ...setup.B,
      gender: genderB,
      name: nameB,
      personality: personalityB,
    },
    topic: pickRandom(theme.topicTemplates),
  }
}

const FREE_TURN_LIMIT = 4 // 2 turns per debater

export default function GeminiSelfChatAudio({ userApiKey = '', user = null, isPro = false, onUpgrade = null }) {
  const [topic, setTopic] = useState('')
  const [inputMode, setInputMode] = useState('voice') // 'type' | 'voice'
  const [messages, setMessages] = useState([])
  const [images, setImages] = useState({})  // index -> data URL
  const [viewIndex, setViewIndex] = useState(null)
  const [running, setRunning] = useState(false)
  const [initialising, setInitialising] = useState(false)
  const [muted, _setMuted] = useState(false)
  const mutedRef = useRef(false)
  const setMuted = (v) => {
    const next = typeof v === 'function' ? v(mutedRef.current) : v
    mutedRef.current = next
    _setMuted(next)
  }
  const [imagesEnabled, _setImagesEnabled] = useState(true)
  const imagesEnabledRef = useRef(true)
  const setImagesEnabled = (v) => {
    const next = typeof v === 'function' ? v(imagesEnabledRef.current) : v
    imagesEnabledRef.current = next
    _setImagesEnabled(next)
  }
  const [error, setError] = useState(null)
  const [quotaAlerts, setQuotaAlerts] = useState({ tts: false, image: false })
  const [telemetry, setTelemetry] = useState(makeTelemetryState)
  const currentAudioRef = useRef(null)
  const [speaking, setSpeaking] = useState(null)
  const [loadingVoice, setLoadingVoice] = useState(null)
  const [lastMessages, setLastMessages] = useState({ A: '', B: '' })
  const [listening, setListening] = useState(false)
  const [interimText, setInterimText] = useState('')
  const [personalities, setPersonalities] = useState({ ...DEFAULT_PERSONALITIES })
  const [names, setNames] = useState({ ...DEFAULT_NAMES })
  const DEFAULT_VOICES = { A: PERSONAS.A.defaultVoice, B: PERSONAS.B.defaultVoice }
  const [voices, setVoices] = useState({ ...DEFAULT_VOICES })
  const [randomising, setRandomising] = useState(false)
  const [emotions, setEmotions] = useState({ A: 'CONFIDENT', B: 'CONFIDENT' })
  const [summary, setSummary] = useState(null)
  const [summaryLoading, setSummaryLoading] = useState(false)
  const [category, setCategory] = useState('wild-card')
  const [style, _setStyle] = useState('ai')
  const setStyle = (v) => { styleRef.current = v; _setStyle(v) }
  const [elapsed, setElapsed] = useState(0)
  const [splitPercent, setSplitPercent] = useState(50)
  const [draggingSplit, setDraggingSplit] = useState(false)
  const [paused, setPaused] = useState(false)
  const [isMobile, setIsMobile] = useState(() => window.innerWidth < 1024)
  const startTimeRef = useRef(null)
  const mainAreaRef = useRef(null)
  const isDraggingRef = useRef(false)
  const MAX_DURATION_MS = 10 * 60 * 1000 // 10 minutes
  const bottomRef = useRef(null)
  const stopRef = useRef(false)
  const pauseDebateRef = useRef(false)
  const userInterruptRef = useRef(null)
  const recognitionRef = useRef(null)
  const personalitiesRef = useRef({ ...DEFAULT_PERSONALITIES })
  const namesRef = useRef({ ...DEFAULT_NAMES })
  const voicesRef = useRef({ ...DEFAULT_VOICES })
  const styleRef = useRef('ai')
  // Debate state persisted across pause/resume
  const historyARef = useRef([])
  const historyBRef = useRef([])
  const lastMessageRef = useRef('')
  const currentTurnRef = useRef('A')
  const elapsedBeforePauseRef = useRef(0)
  // Persistence
  const debateIdRef = useRef(null)
  const turnIndexRef = useRef(0)
  // Pro status ref so it's readable inside async debate loop
  const isProRef = useRef(isPro)
  useEffect(() => { isProRef.current = isPro }, [isPro])

  const formatTime = (secs) => {
    const m = Math.floor(secs / 60).toString().padStart(2, '0')
    const s = (secs % 60).toString().padStart(2, '0')
    return `${m}:${s}`
  }

  const trackApiResult = (endpoint, ok) => {
    setTelemetry(prev => ({
      ...prev,
      calls: { ...prev.calls, [endpoint]: (prev.calls[endpoint] || 0) + 1 },
      successes: ok
        ? { ...prev.successes, [endpoint]: (prev.successes[endpoint] || 0) + 1 }
        : prev.successes,
      failures: !ok
        ? { ...prev.failures, [endpoint]: (prev.failures[endpoint] || 0) + 1 }
        : prev.failures,
    }))
  }

  const trackQuotaHit = (kind) => {
    setTelemetry(prev => ({
      ...prev,
      quotaHits: {
        ...prev.quotaHits,
        [kind]: (prev.quotaHits[kind] || 0) + 1,
      },
    }))
  }

  const postJson = async (endpoint, payload) => {
    try {
      const trimmedKey = userApiKey.trim()
      const res = await fetch(buildApiUrl(endpoint), {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(trimmedKey ? { 'x-gemini-api-key': trimmedKey } : {}),
        },
        body: JSON.stringify(payload),
      })
      trackApiResult(endpoint, res.ok)
      const data = await res.json()
      if (!res.ok && !data.error) data.error = `Request failed (${res.status})`
      return data
    } catch (err) {
      trackApiResult(endpoint, false)
      throw err
    }
  }

  const estimatedSessionCost = TELEMETRY_ENDPOINTS.reduce(
    (sum, endpoint) => sum + ((telemetry.calls[endpoint] || 0) * (ESTIMATED_COST_USD[endpoint] || 0)),
    0,
  )
  const totalApiCalls = TELEMETRY_ENDPOINTS.reduce((sum, endpoint) => sum + (telemetry.calls[endpoint] || 0), 0)
  const totalSuccesses = TELEMETRY_ENDPOINTS.reduce((sum, endpoint) => sum + (telemetry.successes[endpoint] || 0), 0)
  const totalFailures = TELEMETRY_ENDPOINTS.reduce((sum, endpoint) => sum + (telemetry.failures[endpoint] || 0), 0)
  const usageTextTurns = telemetry.calls['self-chat-turn'] || 0
  const usageVoiceGenerations = telemetry.calls.tts || 0
  const usageImagesGenerated = telemetry.calls.image || 0

  // Only numeric keys are per-turn images; 'start'/'end' are bookends
  const imageKeys = Object.keys(images).map(Number).filter(n => !isNaN(n)).sort((a, b) => a - b)
  const latestIndex = imageKeys.length > 0 ? imageKeys[imageKeys.length - 1] : null
  const displayIndex = viewIndex !== null && images[viewIndex] != null ? viewIndex : latestIndex
  // Fall back to bookend images when no per-turn image is selected or image is missing
  const displayImage = (displayIndex !== null && images[displayIndex])
    ? images[displayIndex]
    : images.end || images.start || null

  useEffect(() => {
    return () => { try { if (currentAudioRef.current?.stop) currentAudioRef.current.stop() } catch {} }
  }, [])

  useEffect(() => {
    navigator.mediaDevices?.enumerateDevices?.()
      .then(devices => {
        if (!devices.some(d => d.kind === 'audioinput')) setInputMode('type')
      })
      .catch(() => setInputMode('type'))
  }, [])

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  useEffect(() => {
    if (summary) bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [summary])

  useEffect(() => {
    if (!running) return
    const interval = setInterval(() => {
      if (startTimeRef.current) {
        const total = elapsedBeforePauseRef.current + (Date.now() - startTimeRef.current)
        setElapsed(Math.floor(total / 1000))
      }
    }, 1000)
    return () => clearInterval(interval)
  }, [running])

  useEffect(() => {
    const onResize = () => setIsMobile(window.innerWidth < 1024)
    window.addEventListener('resize', onResize)
    return () => window.removeEventListener('resize', onResize)
  }, [])

  const updateName = (persona, value) => {
    namesRef.current[persona] = value
    setNames(prev => ({ ...prev, [persona]: value }))
  }

  const updatePersonality = (persona, value) => {
    personalitiesRef.current[persona] = value
    setPersonalities(prev => ({ ...prev, [persona]: value }))
  }

  const updateVoice = (persona, value) => {
    voicesRef.current[persona] = value
    setVoices(prev => ({ ...prev, [persona]: value }))
  }

  const waitWithInterrupt = async (ms) => {
    let remaining = ms
    const step = 120
    while (remaining > 0 && !stopRef.current && !pauseDebateRef.current) {
      const slice = Math.min(step, remaining)
      await new Promise(r => setTimeout(r, slice))
      remaining -= slice
    }
  }

  const randomise = async () => {
    setRandomising(true)
    setError(null)
    try {
      const setup = await postJson('generate-setup', { category, style: styleRef.current })
      if (setup.error) throw new Error(setup.error)
      const themedSetup = applyAccentThemeToSetup(styleRef.current, setup)
      updateName('A', themedSetup.A.name)
      updateName('B', themedSetup.B.name)
      updatePersonality('A', themedSetup.A.personality)
      updatePersonality('B', themedSetup.B.personality)
      updateVoice('A', pickVoice(themedSetup.A.gender))
      updateVoice('B', pickVoice(themedSetup.B.gender))
      setTopic(themedSetup.topic)
    } catch (err) {
      setError('Could not generate setup: ' + err.message)
    } finally {
      setRandomising(false)
    }
  }

  const classifyInterrupt = async (text) => {
    try {
      return await postJson('classify-interrupt', { text })
    } catch {
      return { isPersonalityUpdate: false, target: null, newPersonality: null }
    }
  }

  const startListening = (onFinal) => {
    const SR = window.SpeechRecognition || window.webkitSpeechRecognition
    if (!SR) { setError('Speech recognition not supported in this browser'); return }
    if (recognitionRef.current) recognitionRef.current.abort()

    const rec = new SR()
    rec.continuous = true   // keep mic open through pauses
    rec.interimResults = true
    rec.lang = 'en-US'

    let finalCalled = false
    let lastTranscript = ''
    let silenceTimer = null

    const fireFinal = () => {
      if (finalCalled) return
      finalCalled = true
      clearTimeout(silenceTimer)
      rec.stop()
      setInterimText('')
      onFinal(lastTranscript.trim())
    }

    const resetSilenceTimer = () => {
      clearTimeout(silenceTimer)
      silenceTimer = setTimeout(fireFinal, 3000) // 3 s of silence → done
    }

    rec.onresult = (e) => {
      const transcript = Array.from(e.results).map(r => r[0].transcript).join('')
      lastTranscript = transcript
      setInterimText(transcript)
      resetSilenceTimer()
    }
    rec.onend = () => {
      setListening(false)
      setInterimText('')
      clearTimeout(silenceTimer)
      recognitionRef.current = null
      if (!finalCalled) { finalCalled = true; onFinal(lastTranscript.trim()) }
    }
    rec.onerror = () => {
      setListening(false)
      setInterimText('')
      clearTimeout(silenceTimer)
      pauseDebateRef.current = false
    }

    rec.start()
    recognitionRef.current = rec
    setListening(true)
  }

  const handleInterrupt = () => {
    if (listening) { recognitionRef.current?.abort(); return }
    try { if (currentAudioRef.current) currentAudioRef.current.stop() } catch {}
    pauseDebateRef.current = true
    startListening(async (text) => {
      console.log('[CHALLENGE] Speech result:', text)
      if (text) {
        setMessages(prev => [...prev, { persona: 'user', content: text }])

        // Check if this is a personality update (fire-and-forget, don't block the interrupt)
        classifyInterrupt(text).then(classification => {
          if (classification.isPersonalityUpdate && classification.target && classification.newPersonality) {
            const targets = classification.target === 'both' ? ['A', 'B'] : [classification.target]
            targets.forEach(p => {
              updatePersonality(p, classification.newPersonality)
            })
          }
        })

        userInterruptRef.current = text
        console.log('[CHALLENGE] Interrupt ref set, unpausing loop')
      }
      pauseDebateRef.current = false
    })
  }

  const callTurn = async (persona, history, message) => {
    const other = persona === 'A' ? 'B' : 'A'
    const name = namesRef.current[persona]
    // Append a per-turn reminder so the model can't drift into third-person
    // even if earlier history contains third-person mistakes
    const qualityReminder = PER_TURN_QUALITY_REMINDER.replaceAll('{name}', name)
    const augmentedMessage = `${message}\n\n[You are ${name}. ${qualityReminder}]`
    const data = await postJson('self-chat-turn', {
      systemPrompt: getSystemPrompt(
        name,
        personalitiesRef.current[persona],
        namesRef.current[other],
        styleRef.current,
      ),
      history,
      message: augmentedMessage,
    })
    if (data.error) throw new Error(data.error)
    return data.reply
  }

  const buildSpokenSummary = (data) => {
    const clean = (text, maxLen = 170) => {
      if (!text) return ''
      const singleLine = String(text).replace(/\s+/g, ' ').trim()
      if (singleLine.length <= maxLen) return singleLine
      return `${singleLine.slice(0, maxLen).replace(/[\s,.;:!?-]+$/, '')}.`
    }

    const winnerLabel = data?.winner === 'draw'
      ? 'Draw'
      : (data?.winner === 'A' ? namesRef.current.A : namesRef.current.B)
    const reason = clean(data?.winnerReasoning, 220)
    return [`Winner: ${winnerLabel}.`, reason].filter(Boolean).join(' ')
  }

  const fetchSummary = async () => {
    if (messages.length < 2) return
    setSummaryLoading(true)
    try {
      const transcript = messages
        .map(m => {
          const speaker = m.persona === 'A' ? namesRef.current.A
            : m.persona === 'B' ? namesRef.current.B
            : m.persona === 'host' ? 'Host' : 'Moderator'
          return `${speaker}: ${m.content}`
        }).join('\n')
      const data = await postJson('debate-summary', { transcript, nameA: namesRef.current.A, nameB: namesRef.current.B, topic })
      if (data.error) throw new Error(data.error)
      // Force immediate render of summary card before TTS starts
      flushSync(() => {
        setSummary(data)
        setSummaryLoading(false)
      })

      // Persist summary (fire-and-forget)
      if (debateIdRef.current) {
        updateDebateSummary(debateIdRef.current, data)
          .catch(err => console.error('[db] updateDebateSummary failed:', err))
      }

      // Bookend end image — Pro only
      if (imagesEnabledRef.current && isProRef.current) {
        const endPrompt = `Cinematic photorealistic illustration of "${topic}" debate conclusion. Dramatic lighting, high quality digital art. Absolutely no text, words, letters, numbers, or writing visible anywhere in the image.`
        postJson('image', { prompt: endPrompt }).then(imgData => {
          if (imgData.imageData) {
            setImages(prev => ({ ...prev, end: `data:${imgData.mimeType};base64,${imgData.imageData}` }))
          }
        }).catch(err => console.error('End image error:', err))
      }

      // Read a concise, high-signal summary in the same moderator voice.
      if (!mutedRef.current && !stopRef.current) {
        const spokenSummary = buildSpokenSummary(data)
        if (spokenSummary) {
          setSpeaking('host')
          setLoadingVoice('host')
          const summaryTTS = await fetchTTS(spokenSummary, 'host', HOST_VOICE, postJson)
          setLoadingVoice(null)
          if (!stopRef.current) {
            await playTTS(summaryTTS, currentAudioRef, () => {
              setMuted(true)
              setQuotaAlerts(prev => ({ ...prev, tts: true }))
              trackQuotaHit('tts')
            })
          }
          setSpeaking(null)
        }
      }
    } catch (err) {
      console.error('Summary error:', err.message)
      setError('Could not generate summary: ' + err.message)
    } finally {
      setSpeaking(null)
      setLoadingVoice(null)
      setSummaryLoading(false)
    }
  }

  const start = async () => {
    if (!topic.trim() || running) return
    const isResume = paused

    if (!isResume) {
      // Fresh start
      setTelemetry(makeTelemetryState())
      setMessages([])
      setImages({})
      setViewIndex(null)
      setLastMessages({ A: '', B: '' })
      setEmotions({ A: 'CONFIDENT', B: 'CONFIDENT' })
      setSummary(null)
      setSummaryLoading(false)
      setError(null)
      setQuotaAlerts({ tts: false, image: false })
      historyARef.current = []
      historyBRef.current = []
      lastMessageRef.current = `Let's discuss: ${topic.trim()}`
      currentTurnRef.current = 'A'
      elapsedBeforePauseRef.current = 0
      debateIdRef.current = null
      turnIndexRef.current = 0

      // Enforce daily usage limit + create debate row via backend
      if (user?.id && supabase) {
        try {
          const { data: { session } } = await supabase.auth.getSession()
          const token = session?.access_token
          if (token) {
            const trimmedKey = userApiKey.trim()
            const startRes = await fetch(buildApiUrl('debate/start'), {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`,
                ...(trimmedKey ? { 'x-gemini-api-key': trimmedKey } : {}),
              },
              body: JSON.stringify({
                topic:         topic.trim(),
                nameA:         namesRef.current.A,
                nameB:         namesRef.current.B,
                personalityA:  personalitiesRef.current.A,
                personalityB:  personalitiesRef.current.B,
                style:         styleRef.current,
                category,
              }),
            })
            const startData = await startRes.json()
            if (startRes.status === 429) {
              setError(startData.error || 'Daily debate limit reached. Try again tomorrow.')
              setInitialising(false)
              return
            }
            if (startData.debateId) debateIdRef.current = startData.debateId
          }
        } catch (err) {
          console.error('[db] debate/start failed:', err)
          // Non-blocking — proceed without persistence if server unreachable
        }
      }
    }

    setRunning(true)
    setPaused(false)
    if (!isResume) setInitialising(true)
    stopRef.current = false
    startTimeRef.current = Date.now()
    try { if (currentAudioRef.current) currentAudioRef.current.stop() } catch {}

    try {
      let prefetchReplyPromise = null
      let prefetchTTSPromise = null

      // Host introduction on fresh start
      if (!isResume) {
        const nameA = namesRef.current.A
        const nameB = namesRef.current.B
        const cleanTopic = topic.trim().replace(/[?.!,;:]+$/, '')
        const styleLabel = STYLES.find(s => s.value === styleRef.current)?.label
        const spokenStyleLabel = styleRef.current === 'eli5' ? "Explain Like I'm Five" : styleLabel
        const styleIntro = styleRef.current !== 'ai' ? ` Tonight's style: ${spokenStyleLabel}!` : ''
        const intro = `Welcome! Tonight's topic: ${cleanTopic}. In one corner, we have ${nameA}. And in the other corner, ${nameB}.${styleIntro} Let the debate begin!`
        setMessages(prev => [...prev, { persona: 'host', content: intro }])
        // Persist host intro (fire-and-forget; debateIdRef may be populated async — retry once settled)
        const persistHostIntro = () => {
          if (!debateIdRef.current) return
          saveMessage({ debateId: debateIdRef.current, speaker: 'host', text: intro, turnIndex: turnIndexRef.current++ })
            .catch(err => console.error('[db] saveMessage (host) failed:', err))
        }
        // Give createDebate a moment to resolve if it hasn't yet
        if (debateIdRef.current) {
          persistHostIntro()
        } else {
          setTimeout(persistHostIntro, 2000)
        }
        setInitialising(false)
        // Prefetch first speaker's reply + TTS while host intro plays
        prefetchReplyPromise = callTurn('A', historyARef.current, lastMessageRef.current)
        prefetchTTSPromise = !mutedRef.current
          ? prefetchReplyPromise.then(r =>
              fetchTTS(parseEmotion(r).cleanText, 'A', voicesRef.current.A, postJson)
            ).catch(() => null)
          : null

        if (!mutedRef.current) {
          setSpeaking('host')
          setLoadingVoice('host')
          const hostTTS = await fetchTTS(intro, 'host', HOST_VOICE, postJson)
          setLoadingVoice(null)
          if (!stopRef.current) {
            await playTTS(hostTTS, currentAudioRef, () => {
              setMuted(true)
              setQuotaAlerts(prev => ({ ...prev, tts: true }))
              trackQuotaHit('tts')
            })
          }
          setSpeaking(null)
        }
        if (stopRef.current) throw new Error('stopped')

        // Bookend start image — fire-and-forget while debate begins
        if (imagesEnabledRef.current) {
          const startPrompt = `Cinematic photorealistic illustration of "${topic.trim()}". Dramatic lighting, high quality digital art. Absolutely no text, words, letters, numbers, or writing visible anywhere in the image.`
          postJson('image', { prompt: startPrompt }).then(data => {
            if (data.error) {
              if (data.error.toLowerCase().includes('quota')) {
                setImagesEnabled(false)
                setQuotaAlerts(prev => ({ ...prev, image: true }))
                trackQuotaHit('image')
              }
            } else if (data.imageData) {
              setImages(prev => ({ ...prev, start: `data:${data.mimeType};base64,${data.imageData}` }))
            }
          }).catch(err => console.error('Start image error:', err))
        }
      }

      setInitialising(false)
      let turnCount = 0
      while (true) {
        if (stopRef.current) break
        // Free tier: cap at FREE_TURN_LIMIT turns
        if (!isProRef.current && turnCount >= FREE_TURN_LIMIT) break
        const totalElapsed = elapsedBeforePauseRef.current + (Date.now() - startTimeRef.current)
        if (totalElapsed >= MAX_DURATION_MS) break

        const turn = currentTurnRef.current

        // Use prefetched reply + TTS if available, otherwise fetch fresh
        let reply
        let ttsData = null
        if (prefetchReplyPromise) {
          try {
            reply = await prefetchReplyPromise
            ttsData = prefetchTTSPromise ? await prefetchTTSPromise : null
          } catch {
            reply = await callTurn(turn, turn === 'A' ? historyARef.current : historyBRef.current, lastMessageRef.current)
          }
          prefetchReplyPromise = null
          prefetchTTSPromise = null
        } else {
          reply = await callTurn(turn, turn === 'A' ? historyARef.current : historyBRef.current, lastMessageRef.current)
        }

        const activeHistory = turn === 'A' ? historyARef.current : historyBRef.current
        activeHistory.push({ role: 'user', content: lastMessageRef.current })
        activeHistory.push({ role: 'model', content: reply })

        const { emotion, cleanText } = parseEmotion(reply)
        setEmotions(prev => ({ ...prev, [turn]: emotion }))

        let msgIndex = -1
        setMessages(prev => {
          msgIndex = prev.length
          return [...prev, { persona: turn, content: cleanText }]
        })
        setLastMessages(prev => ({ ...prev, [turn]: cleanText }))

        // Advance turn state NOW so pause/resume continues from the next turn
        const nextTurn = turn === 'A' ? 'B' : 'A'
        lastMessageRef.current = reply
        currentTurnRef.current = nextTurn

        // Image for this turn — Pro only, fire-and-forget
        const imagePrompt = `Cinematic photorealistic illustration of "${topic}". Dramatic lighting, high quality digital art. Absolutely no text, words, letters, numbers, or writing visible anywhere in the image.`
        if (imagesEnabledRef.current && isProRef.current) {
          const capturedIdx = msgIndex
          postJson('image', { prompt: imagePrompt }).then(data => {
            if (data.error) {
              if (data.error.toLowerCase().includes('quota')) {
                setImagesEnabled(false)
                setQuotaAlerts(prev => ({ ...prev, image: true }))
                trackQuotaHit('image')
              }
            } else if (data.imageData) {
              setImages(prev => ({ ...prev, [capturedIdx]: `data:${data.mimeType};base64,${data.imageData}` }))
            }
          }).catch(err => console.error('Turn image error:', err))
        }

        // Persist message (fire-and-forget)
        if (debateIdRef.current) {
          const idx = turnIndexRef.current++
          saveMessage({
            debateId:    debateIdRef.current,
            speaker:     turn,
            text:        cleanText,
            imagePrompt,
            turnIndex:   idx,
          }).catch(err => console.error('[db] saveMessage failed:', err))
        }
        // Prefetch NEXT turn's reply + TTS while current TTS plays
        const nextReplyPromise = callTurn(nextTurn, nextTurn === 'A' ? historyARef.current : historyBRef.current, reply)
        // Chain TTS fetch after reply resolves so audio is ready instantly
        const nextTTSPromise = !mutedRef.current
          ? nextReplyPromise.then(nextReply =>
              fetchTTS(parseEmotion(nextReply).cleanText, nextTurn, voicesRef.current[nextTurn], postJson)
            ).catch(() => null)
          : null

        // Play TTS — use prefetched audio data or fetch fresh
        const onQuotaHit = () => {
          setMuted(true)
          setQuotaAlerts(prev => ({ ...prev, tts: true }))
          trackQuotaHit('tts')
        }
        let ttsPromise
        if (ttsData) {
          // Prefetched — audio ready, play immediately
          setSpeaking(turn)
          ttsPromise = playTTS(ttsData, currentAudioRef, onQuotaHit)
        } else if (!mutedRef.current) {
          // Not prefetched — show loading state while fetching voice
          setLoadingVoice(turn)
          const freshTTSData = await fetchTTS(cleanText, turn, voicesRef.current[turn], postJson)
          setLoadingVoice(null)
          if (stopRef.current) break
          setSpeaking(turn)
          ttsPromise = playTTS(freshTTSData, currentAudioRef, onQuotaHit)
        } else {
          ttsPromise = Promise.resolve()
        }
        // Keep text-only mode readable when voice/image are disabled.
        const textOnlyMode = mutedRef.current && !imagesEnabledRef.current
        const textOnlyDelayMs = Math.min(
          TEXT_ONLY_MAX_DELAY_MS,
          Math.max(TEXT_ONLY_MIN_DELAY_MS, cleanText.split(/\s+/).length * TEXT_ONLY_WORD_DELAY_MS),
        )
        const readingDelay = mutedRef.current
          ? waitWithInterrupt(
              textOnlyMode
                ? textOnlyDelayMs + TEXT_ONLY_TURN_BUFFER_MS
                : Math.max(1200, cleanText.split(/\s+/).length * 170),
            )
          : null
        await Promise.all([ttsPromise, readingDelay].filter(Boolean))
        setSpeaking(null)

        while (pauseDebateRef.current && !stopRef.current) {
          await new Promise(r => setTimeout(r, 100))
        }
        if (stopRef.current) break

        if (userInterruptRef.current) {
          const interrupt = userInterruptRef.current
          userInterruptRef.current = null
          console.log('[CHALLENGE] Processing interrupt:', interrupt, '→ next turn:', currentTurnRef.current)
          // Override the "last message" so the next speaker sees the moderator directive
          lastMessageRef.current = `[MODERATOR OVERRIDE] The human moderator just interrupted and said: "${interrupt}". You MUST respond to this new direction immediately. Do NOT continue your previous argument. Address what the moderator said.`
          // Discard prefetch — next message changed due to interrupt
          prefetchReplyPromise = null
          prefetchTTSPromise = null
        } else {
          prefetchReplyPromise = nextReplyPromise
          prefetchTTSPromise = nextTTSPromise
        }
        turnCount++
      }
    } catch (err) {
      setError(err.message)
    } finally {
      elapsedBeforePauseRef.current += Date.now() - startTimeRef.current
      setRunning(false)
      setSpeaking(null)
      setLoadingVoice(null)
      if (!stopRef.current) {
        // Finished naturally (time limit) — not paused
        setPaused(false)
        fetchSummary()
      }
    }
  }

  const pause = () => {
    pauseDebateRef.current = true
    setPaused(true)
    setLoadingVoice(null)
    recognitionRef.current?.abort()
    setListening(false)
    // Freeze audio mid-playback (will resume from same point)
    if (currentAudioRef.current?.pause) currentAudioRef.current.pause()
    // Save elapsed time so far (exclude pause duration from timer)
    if (startTimeRef.current) {
      elapsedBeforePauseRef.current += Date.now() - startTimeRef.current
    }
  }

  const resumeDebate = () => {
    pauseDebateRef.current = false
    setPaused(false)
    startTimeRef.current = Date.now()
    // Resume audio from where it was paused
    if (currentAudioRef.current?.play) currentAudioRef.current.play()
  }

  const handleDividerMouseDown = (e) => {
    if (isMobile) return
    e.preventDefault()
    isDraggingRef.current = true
    setDraggingSplit(true)
    const onMouseMove = (ev) => {
      if (!isDraggingRef.current || !mainAreaRef.current) return
      const rect = mainAreaRef.current.getBoundingClientRect()
      const pct = ((ev.clientX - rect.left) / rect.width) * 100
      setSplitPercent(Math.min(Math.max(pct, 20), 80))
    }
    const onMouseUp = () => {
      isDraggingRef.current = false
      setDraggingSplit(false)
      document.removeEventListener('mousemove', onMouseMove)
      document.removeEventListener('mouseup', onMouseUp)
    }
    document.addEventListener('mousemove', onMouseMove)
    document.addEventListener('mouseup', onMouseUp)
  }

  const reset = () => {
    stopRef.current = true
    pauseDebateRef.current = false
    try { if (currentAudioRef.current?.stop) currentAudioRef.current.stop() } catch {}
    setRunning(false)
    setMessages([])
    setImages({})
    setViewIndex(null)
    setLastMessages({ A: '', B: '' })
    setEmotions({ A: 'CONFIDENT', B: 'CONFIDENT' })
    setSummary(null)
    setSummaryLoading(false)
    setInitialising(false)
    setPaused(false)
    setElapsed(0)
    pauseDebateRef.current = false
    userInterruptRef.current = null
    startTimeRef.current = null
    historyARef.current = []
    historyBRef.current = []
    lastMessageRef.current = ''
    currentTurnRef.current = 'A'
    elapsedBeforePauseRef.current = 0
    recognitionRef.current?.abort()
    setListening(false)
    setInterimText('')
    setError(null)
    setQuotaAlerts({ tts: false, image: false })
    setTelemetry(makeTelemetryState())
    setTopic('')
    setSpeaking(null)
    setCategory('wild-card')
    setStyle('ai')
    const fresh = { ...DEFAULT_PERSONALITIES }
    setPersonalities(fresh)
    personalitiesRef.current = { ...fresh }
    const freshNames = { ...DEFAULT_NAMES }
    setNames(freshNames)
    namesRef.current = { ...freshNames }
    const freshVoices = { A: PERSONAS.A.defaultVoice, B: PERSONAS.B.defaultVoice }
    setVoices(freshVoices)
    voicesRef.current = { ...freshVoices }
  }

  return (
    <div className={`h-full flex flex-col gap-3 pb-4 lg:pb-0 uniform-text-scale ${draggingSplit ? 'dragging-split' : ''}`}>
      <style>{`
        @keyframes soundBar {
          from { transform: scaleY(0.3); }
          to { transform: scaleY(1); }
        }
        @keyframes fadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }
        @keyframes talking {
          from { transform: scaleY(1) translateY(0px); }
          to   { transform: scaleY(1.03) translateY(-1px); }
        }
        @keyframes jawOpen {
          from { transform: scaleY(0.2); opacity: 0.3; }
          to   { transform: scaleY(1);   opacity: 0.7; }
        }
        .uniform-text-scale :where(span, p, button, input, select, option, li, label) {
          font-size: clamp(13px, 1.6vw, 16px) !important;
          line-height: 1.35;
        }
        .uniform-text-scale button {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          line-height: 1;
        }
        .uniform-text-scale select {
          line-height: 1.2;
        }
        .uniform-text-scale .challenge-micro {
          font-size: clamp(10px, 1.1vw, 12px) !important;
          line-height: 1.1;
          white-space: nowrap;
          letter-spacing: 0.02em;
        }
        .dragging-split * { user-select: none !important; cursor: col-resize !important; }
      `}</style>

      {/* Main area — fills full height */}
      <div className="flex-1 flex flex-col lg:flex-row gap-3 lg:gap-0 min-h-0 overflow-y-auto lg:overflow-hidden" ref={mainAreaRef}>

        {/* Left: controls + transcript */}
        <div style={{ width: isMobile ? '100%' : `${splitPercent}%` }} className="w-full lg:shrink-0 bg-gray-900 rounded-xl p-5 flex flex-col gap-4 min-h-[50vh] lg:min-h-0">
          {/* Control buttons — row 1: timer + toggles + primary action */}
          <div className="flex flex-col gap-2 shrink-0">
            <div className="flex items-center gap-2">
              {/* Timer */}
              {running ? (
                <div className="flex items-center gap-1.5 px-3 py-2.5 bg-gray-800 border border-gray-700 rounded-xl text-base shrink-0">
                  <span className="w-1.5 h-1.5 bg-green-400 rounded-full animate-pulse" />
                  <span className="text-gray-300 font-mono">{formatTime(elapsed)}</span>
                  <span className="text-gray-600 hidden lg:inline">/</span>
                  <span className="text-gray-500 font-mono hidden lg:inline">10:00</span>
                </div>
              ) : paused ? (
                <div className="flex items-center gap-1.5 px-3 py-2.5 bg-gray-800 border border-yellow-700 rounded-xl text-base shrink-0">
                  <span className="w-1.5 h-1.5 bg-yellow-400 rounded-full" />
                  <span className="text-yellow-300 font-mono">{formatTime(elapsed)}</span>
                  <span className="text-gray-600 hidden lg:inline">/</span>
                  <span className="text-gray-500 font-mono hidden lg:inline">10:00</span>
                </div>
              ) : (
                <div className="flex items-center gap-1.5 px-3 py-2.5 bg-gray-800 border border-gray-700 rounded-xl text-base shrink-0 text-gray-500">
                  <IconClock className="w-4 h-4" />
                  <span className="hidden sm:inline">max 10 min</span>
                </div>
              )}
              {/* Toggles */}
              <button
                onClick={() => {
                  const nextMuted = !mutedRef.current
                  setMuted(nextMuted)
                  if (nextMuted && currentAudioRef.current) currentAudioRef.current.pause()
                }}
                title={muted ? 'Unmute' : 'Mute'}
                className={`px-3 py-2.5 rounded-xl text-base transition-colors cursor-pointer border ${muted ? 'bg-gray-800/90 text-red-300 border-red-700/50 ring-1 ring-red-700/30' : 'bg-green-900 text-green-300 border-green-700/40'}`}
              >
                {muted ? <IconVolumeOff /> : <IconVolumeOn />}
              </button>
              <button
                onClick={() => setImagesEnabled(m => !m)}
                title={imagesEnabled ? 'Disable image generation' : 'Enable image generation'}
                className={`px-3 py-2.5 rounded-xl text-base transition-colors cursor-pointer border ${imagesEnabled ? 'bg-violet-900 text-violet-300 border-violet-700/40' : 'bg-gray-800/90 text-red-300 border-red-700/50 ring-1 ring-red-700/30'}`}
              >
                <IconImage />
              </button>
              {/* Category badge — split-view only (lg+) */}
              {(running || paused) && (
                <span className="hidden lg:inline-flex items-center justify-center px-3 py-1.5 rounded-lg bg-amber-900/60 border border-amber-700/40 text-amber-200 text-sm font-medium shrink-0">
                  {CATEGORIES.find(c => c.value === category)?.label || category}
                </span>
              )}
              {(running || paused) && style !== 'ai' && (
                <span className="hidden lg:inline-flex items-center justify-center px-3 py-1.5 rounded-lg bg-indigo-900/60 border border-indigo-700/40 text-indigo-200 text-sm font-medium shrink-0">
                  {STYLES.find(s => s.value === style)?.label || style}
                </span>
              )}
              {/* Setup controls inline on desktop when not running */}
              {!running && !paused && (
                <>
                  <div className="hidden lg:block relative shrink-0" title={!isPro ? 'Upgrade to Pro to change category' : undefined}>
                    <select value={category} onChange={e => { if (isPro) setCategory(e.target.value) }} disabled={randomising} style={{ colorScheme: 'dark' }}
                      className={`bg-gray-700 border border-gray-600 rounded-xl px-3 py-2.5 text-base text-gray-200 focus:outline-none focus:border-amber-500 cursor-pointer disabled:opacity-40 ${!isPro ? 'pr-8' : ''}`}>
                      {CATEGORIES.map(c => <option key={c.value} value={c.value}>{c.label}</option>)}
                    </select>
                    {!isPro && <span className="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 text-amber-400 text-xs font-bold">🔒</span>}
                  </div>
                  <div className="hidden lg:block relative shrink-0" title={!isPro ? 'Upgrade to Pro to change style' : undefined}>
                    <select value={style} onChange={e => { if (isPro) setStyle(e.target.value) }} disabled={randomising} style={{ colorScheme: 'dark' }}
                      className={`bg-gray-700 border border-gray-600 rounded-xl px-3 py-2.5 text-base text-gray-200 focus:outline-none focus:border-indigo-500 cursor-pointer disabled:opacity-40 ${!isPro ? 'pr-8' : ''}`}>
                      {STYLES.map(s => <option key={s.value} value={s.value}>{s.label}</option>)}
                    </select>
                    {!isPro && <span className="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 text-amber-400 text-xs font-bold">🔒</span>}
                  </div>
                  <button onClick={randomise} disabled={randomising} title="Randomise characters and topic"
                    className="hidden lg:flex px-4 py-2.5 bg-amber-700 hover:bg-amber-600 disabled:opacity-40 rounded-xl text-base font-medium transition-colors cursor-pointer shrink-0">
                    {randomising ? <span className="inline-block w-4 h-4 border-2 border-amber-100/80 border-t-transparent rounded-full animate-spin" /> : <IconDice className="w-5 h-5" />}
                  </button>
                </>
              )}
              {/* Spacer pushes action buttons to the right */}
              <div className="flex-1" />
              {/* Primary action */}
              {running && !paused ? (
                <button onClick={pause} className="px-4 py-2.5 bg-yellow-700 hover:bg-yellow-600 rounded-xl text-base font-medium transition-colors cursor-pointer shrink-0">
                  <span className="hidden sm:inline">Pause Session</span>
                  <span className="sm:hidden">Pause</span>
                </button>
              ) : running && paused ? (
                <button onClick={resumeDebate} className="px-4 py-2.5 bg-green-700 hover:bg-green-600 rounded-xl text-base font-medium transition-colors cursor-pointer shrink-0">
                  <span className="hidden sm:inline">Resume Session</span>
                  <span className="sm:hidden">Resume</span>
                </button>
              ) : (
                <button onClick={start} disabled={!topic.trim()} className="px-4 py-2.5 rounded-xl text-base font-medium transition-colors cursor-pointer shrink-0 disabled:opacity-40 bg-indigo-600 hover:bg-indigo-500">
                  <span className="hidden sm:inline">Begin Session</span>
                  <span className="sm:hidden">Begin</span>
                </button>
              )}
              <button
                onClick={reset}
                disabled={!running && !paused && messages.length === 0 && !topic.trim()}
                className="px-4 py-2.5 bg-gray-700 hover:bg-gray-600 disabled:bg-gray-800 disabled:text-gray-500 disabled:cursor-not-allowed rounded-xl text-base transition-colors cursor-pointer shrink-0"
              >
                <span className="hidden sm:inline">Reset Session</span>
                <span className="sm:hidden">Reset</span>
              </button>
            </div>

            {/* Row 2: setup controls on mobile only, or generate summary when paused */}
            {!running && !paused ? (
              <div className="flex lg:hidden gap-2 flex-wrap items-center">
                <div className="relative shrink-0" title={!isPro ? 'Upgrade to Pro to change category' : undefined}>
                  <select
                    value={category}
                    onChange={e => { if (isPro) setCategory(e.target.value) }}
                    disabled={randomising}
                    style={{ colorScheme: 'dark' }}
                    className={`bg-gray-700 border border-gray-600 rounded-xl px-3 py-2.5 text-base text-gray-200 focus:outline-none focus:border-amber-500 cursor-pointer disabled:opacity-40 ${!isPro ? 'pr-8' : ''}`}
                  >
                    {CATEGORIES.map(c => (
                      <option key={c.value} value={c.value}>{c.label}</option>
                    ))}
                  </select>
                  {!isPro && (
                    <span className="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 text-amber-400 text-xs font-bold">🔒</span>
                  )}
                </div>
                <div className="relative shrink-0" title={!isPro ? 'Upgrade to Pro to change style' : undefined}>
                  <select
                    value={style}
                    onChange={e => { if (isPro) setStyle(e.target.value) }}
                    disabled={randomising}
                    style={{ colorScheme: 'dark' }}
                    className={`bg-gray-700 border border-gray-600 rounded-xl px-3 py-2.5 text-base text-gray-200 focus:outline-none focus:border-indigo-500 cursor-pointer disabled:opacity-40 ${!isPro ? 'pr-8' : ''}`}
                  >
                    {STYLES.map(s => (
                      <option key={s.value} value={s.value}>{s.label}</option>
                    ))}
                  </select>
                  {!isPro && (
                    <span className="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 text-amber-400 text-xs font-bold">🔒</span>
                  )}
                </div>
                <button
                  onClick={randomise}
                  disabled={randomising}
                  title="Randomise characters and topic"
                  className="px-4 py-2.5 bg-amber-700 hover:bg-amber-600 disabled:opacity-40 rounded-xl text-base font-medium transition-colors cursor-pointer shrink-0"
                >
                  {randomising
                    ? <span className="inline-block w-4 h-4 border-2 border-amber-100/80 border-t-transparent rounded-full animate-spin" />
                    : <IconDice className="w-5 h-5" />}
                </button>
              </div>
            ) : paused && !summaryLoading ? (
              <button
                onClick={fetchSummary}
                disabled={messages.length < 2 || !!summary}
                className="w-full sm:w-auto px-5 py-2.5 bg-amber-700 hover:bg-amber-600 disabled:bg-gray-700 disabled:text-gray-400 disabled:cursor-not-allowed rounded-xl text-base font-medium transition-colors cursor-pointer"
              >
                Generate Summary
              </button>
            ) : null}
          </div>

          {/* Topic input — hidden when session is active (we already know the question) */}
          <input
            value={topic}
            onChange={e => setTopic(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && start()}
            placeholder="Enter a debate question or prompt..."
            disabled={running}
            className={`w-full bg-gray-800 border border-gray-700 rounded-xl px-4 py-3 text-base focus:outline-none focus:border-indigo-500 placeholder-gray-500 disabled:opacity-50 shrink-0 ${(running || paused) ? 'hidden' : ''}`}
          />

          {/* Quota alerts banner */}
          {(quotaAlerts.tts || quotaAlerts.image) && (
            <div className="flex flex-col gap-1.5 shrink-0">
              {quotaAlerts.tts && (
                <div className="flex items-center gap-2 px-4 py-3 rounded-xl bg-amber-950/80 border border-amber-700/50 text-amber-200 text-sm">
                  <span className="text-base leading-none">🔇</span>
                  <span><strong>Voice limit reached</strong> - audio muted automatically, session continues in text. Resets daily.</span>
                </div>
              )}
              {quotaAlerts.image && (
                <div className="flex items-center gap-2 px-4 py-3 rounded-xl bg-amber-950/80 border border-amber-700/50 text-amber-200 text-sm">
                  <span className="text-base leading-none">🖼️</span>
                  <span><strong>Image limit reached</strong> - visuals disabled automatically. Resets daily.</span>
                </div>
              )}
            </div>
          )}

          {/* Initialising indicator */}
          {initialising && messages.length === 0 && (
            <div className="flex items-center justify-center gap-3 py-8">
              <div className="flex gap-1">
                <span className="w-2 h-2 bg-indigo-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                <span className="w-2 h-2 bg-indigo-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                <span className="w-2 h-2 bg-indigo-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
              </div>
              <span className="text-base text-gray-400">Preparing session...</span>
            </div>
          )}

          {/* Conversation transcript — scrolls within panel */}
          {messages.length > 0 && (
            <div className="flex-1 overflow-y-auto space-y-3 pr-1 min-h-0">
              {messages.map((msg, i) => {
                if (msg.persona === 'host') {
                  const isHostSpeaking = speaking === 'host' && i === 0
                  return (
                    <div key={i} className="flex gap-3">
                      <div className={`w-2 rounded-full shrink-0 mt-1 bg-amber-400 ${isHostSpeaking ? 'animate-pulse' : ''}`} style={{ minHeight: '1rem' }} />
                      <div className={`rounded-2xl px-4 py-2.5 text-base flex-1 bg-amber-950 text-amber-100 ${isHostSpeaking ? 'ring-1 ring-amber-400' : ''}`}>
                        <div className="flex items-center gap-2 mb-1">
                          <span className="text-sm font-semibold opacity-70">Moderator</span>
                          {loadingVoice === 'host' && (
                            <span className="text-xs text-amber-300 animate-pulse">generating voice...</span>
                          )}
                          {isHostSpeaking && loadingVoice !== 'host' && (
                            <span className="text-lg text-amber-300 animate-pulse font-semibold">speaking...</span>
                          )}
                        </div>
                        {msg.content}
                      </div>
                    </div>
                  )
                }
                if (msg.persona === 'user') {
                  return (
                    <div key={i} className="flex gap-3">
                      <div className="w-2 rounded-full shrink-0 mt-1 bg-green-400" style={{ minHeight: '1rem' }} />
                      <div className="rounded-2xl px-4 py-2.5 text-base flex-1 bg-green-950 text-green-100 ring-1 ring-green-700">
                        <span className="text-sm font-semibold opacity-70 block mb-1">You (redirect)</span>
                        {msg.content}
                      </div>
                    </div>
                  )
                }
                const p = PERSONAS[msg.persona]
                const isActive = speaking === msg.persona && i === messages.length - 1
                return (
                  <div key={i} className="flex gap-3">
                    <div className={`w-2 rounded-full shrink-0 mt-1 ${p.dot} ${isActive ? 'animate-pulse' : ''}`} style={{ minHeight: '1rem' }} />
                    <div className={`rounded-2xl px-4 py-2.5 text-base flex-1 ${p.color} ${isActive ? `ring-1 ${p.ring}` : ''}`}>
                      <span className="text-sm font-semibold opacity-70 block mb-1">{names[msg.persona]}</span>
                      {msg.content.replace(/\*+/g, '')}
                    </div>
                  </div>
                )
              })}
              {running && !paused && !speaking && (
                <div className="flex gap-3">
                  <div className="w-2 rounded-full shrink-0 mt-1 bg-gray-600" style={{ minHeight: '1rem' }} />
                  <div className="bg-gray-800 rounded-2xl px-4 py-3">
                    <div className="flex gap-1">
                      {[0, 150, 300].map(d => (
                        <span key={d} className="w-1.5 h-1.5 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: `${d}ms` }} />
                      ))}
                    </div>
                  </div>
                </div>
              )}
              {/* Summary loading */}
              {summaryLoading && (
                <div className="flex gap-3">
                  <div className="w-2 rounded-full shrink-0 mt-1 bg-amber-400 animate-pulse" style={{ minHeight: '1rem' }} />
                  <div className="rounded-2xl px-4 py-3 text-base flex-1 bg-amber-950/50 border border-amber-700/50">
                    <span className="text-sm font-semibold text-amber-400 block mb-1">Generating summary...</span>
                    <div className="flex gap-1 mt-2">
                      {[0, 150, 300].map(d => (
                        <span key={d} className="w-1.5 h-1.5 bg-amber-400 rounded-full animate-bounce" style={{ animationDelay: `${d}ms` }} />
                      ))}
                    </div>
                  </div>
                </div>
              )}

              {/* Summary card */}
              {summary && !summaryLoading && (
                <div className="flex gap-3">
                  <div className="w-2 rounded-full shrink-0 mt-1 bg-amber-400" style={{ minHeight: '1rem' }} />
                  <div className="rounded-2xl px-5 py-4 text-base flex-1 bg-gradient-to-br from-amber-950 to-amber-900 border border-amber-700/60 shadow-lg shadow-amber-900/30">
                    <span className="text-sm font-bold text-amber-300 block mb-3 uppercase tracking-wider">Debate Summary</span>
                    <div className="mb-4 px-3 py-2 rounded-xl bg-black/30 text-center">
                      <span className="text-lg font-bold text-amber-200">
                        {summary.winner === 'draw' ? 'Draw!' : `Winner: ${summary.winner === 'A' ? names.A : names.B}`}
                      </span>
                      <p className="text-sm text-amber-100/70 mt-1">{summary.winnerReasoning}</p>
                    </div>
                    <div className="grid grid-cols-2 gap-3 mb-3">
                      <div>
                        <span className="text-sm font-semibold text-blue-400 block mb-1">{names.A}</span>
                        <ul className="space-y-1">
                          {summary.keyArgumentsA?.map((arg, i) => (
                            <li key={i} className="text-sm text-white/70 flex gap-1.5">
                              <span className="text-blue-400 shrink-0">-</span>
                              <span>{arg}</span>
                            </li>
                          ))}
                        </ul>
                      </div>
                      <div>
                        <span className="text-sm font-semibold text-purple-400 block mb-1">{names.B}</span>
                        <ul className="space-y-1">
                          {summary.keyArgumentsB?.map((arg, i) => (
                            <li key={i} className="text-sm text-white/70 flex gap-1.5">
                              <span className="text-purple-400 shrink-0">-</span>
                              <span>{arg}</span>
                            </li>
                          ))}
                        </ul>
                      </div>
                    </div>
                    <p className="text-sm text-white/60 italic border-t border-amber-700/40 pt-2">{summary.analysis}</p>
                  </div>
                </div>
              )}

              <div ref={bottomRef} />
            </div>
          )}

          {error && (
            <div className="flex items-center gap-2 px-4 py-3 rounded-xl bg-red-950/80 border border-red-700/50 text-red-200 text-sm shrink-0">
              <span className="text-base leading-none">⚠️</span>
              <span>{error}</span>
            </div>
          )}
        </div>

        {/* Drag divider */}
        <div
          className="hidden lg:flex items-center justify-center cursor-col-resize shrink-0 select-none group px-1"
          style={{ width: '12px' }}
          onMouseDown={handleDividerMouseDown}
        >
          <div className="w-1 h-full rounded-full bg-gray-700 group-hover:bg-indigo-500 transition-colors duration-150" />
        </div>

        {/* Right: avatars + image panel */}
        <div className="w-full flex-1 flex flex-col gap-3 min-w-0 min-h-[50vh] lg:min-h-0 overflow-visible">

          {/* Avatar stage — compact strip on mobile, full cards on sm+ */}

          {/* Mobile: compact horizontal strip */}
          <div className={`sm:hidden flex items-center gap-2 shrink-0 ${listening ? 'pb-8' : ''}`}>
            {(['A', 'B']).map((persona, i) => {
              const p = PERSONAS[persona]
              const isSpeaking = speaking === persona
              const isLoadingVoice = loadingVoice === persona
              const emotion = emotions[persona]
              return (
                <React.Fragment key={persona}>
                  <div className={`flex-1 rounded-xl px-3 py-2 ${p.avatarBg} flex items-center gap-2 min-w-0 transition-all duration-300
                    ${isSpeaking ? `ring-2 ${p.ring} shadow-md ${p.glow}` : 'ring-1 ring-white/10'}`}>
                    <span className={`w-2 h-2 rounded-full shrink-0 ${p.dot} ${isSpeaking ? 'animate-pulse' : ''}`} />
                    <span className={`text-sm font-semibold truncate ${p.barColor.replace('bg-', 'text-')} `}>{names[persona]}</span>
                    {isSpeaking ? (
                      <span className={`text-xs ${p.barColor.replace('bg-', 'text-')} animate-pulse font-semibold shrink-0`}>speaking…</span>
                    ) : isLoadingVoice ? (
                      <span className="text-xs text-cyan-400 animate-pulse shrink-0">loading…</span>
                    ) : emotion && EMOTIONS[emotion] ? (
                      <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold text-white shrink-0 ${EMOTIONS[emotion].color}`}>
                        <EmotionIcon icon={EMOTIONS[emotion].icon} className="w-3 h-3" />
                        <span>{EMOTIONS[emotion].label}</span>
                      </span>
                    ) : null}
                  </div>
                  {i === 0 && (
                    <div className="relative flex flex-col items-center shrink-0">
                      {running ? (
                        <button
                          onClick={handleInterrupt}
                          title={listening ? 'Stop listening' : 'Redirect'}
                          className={`flex items-center justify-center transition-all cursor-pointer
                            ${inputMode === 'voice' ? 'w-10 h-10 rounded-full' : 'w-8 h-8 rounded-full'}
                            ${listening
                              ? 'bg-red-600 animate-pulse text-white ring-2 ring-red-400'
                              : inputMode === 'voice'
                                ? 'bg-indigo-700 hover:bg-indigo-600 text-white ring-2 ring-indigo-500'
                                : 'bg-gray-700 hover:bg-gray-500 text-gray-300'}`}
                        >
                          {listening ? <IconStop className="w-4 h-4" /> : <IconMic className="w-4 h-4" />}
                        </button>
                      ) : (
                        <span className="text-[10px] font-semibold uppercase tracking-widest text-indigo-400 opacity-60">vs</span>
                      )}
                      {listening && interimText && (
                        <p className="absolute top-full z-20 mt-1 w-max max-w-[160px] -translate-x-1/2 left-1/2 rounded-md border border-green-500/40 bg-black/80 px-2 py-1 text-xs text-green-300 text-center italic leading-snug whitespace-normal break-words shadow-lg">
                          {interimText}
                        </p>
                      )}
                    </div>
                  )}
                </React.Fragment>
              )
            })}
          </div>

          {/* Desktop/tablet: full avatar cards */}
          <div className={`hidden sm:flex flex-row gap-3 shrink-0 ${listening ? 'pb-10' : ''}`}>
            <AIAvatar
              persona="A"
              isSpeaking={speaking === 'A'}
              isLoadingVoice={loadingVoice === 'A'}
              lastMessage={lastMessages.A}
              name={names.A}
              onNameChange={v => updateName('A', v)}
              personality={personalities.A}
              onPersonalityChange={v => updatePersonality('A', v)}
              voice={voices.A}
              onVoiceChange={v => updateVoice('A', v)}
              running={running}
              emotion={emotions.A}
            />
            <div className="relative flex flex-col items-center justify-center gap-2 shrink-0 overflow-visible">
              {!running && (
                <div className="flex flex-col items-center gap-1.5 select-none">
                  <span className="h-5 w-px bg-gradient-to-b from-transparent via-indigo-500/70 to-transparent" />
                  <span className="rounded-full border border-indigo-500/40 bg-indigo-950/70 px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-[0.18em] text-indigo-200 shadow-sm shadow-indigo-900/40">
                    Debate
                  </span>
                  <span className="h-5 w-px bg-gradient-to-b from-transparent via-purple-500/70 to-transparent" />
                </div>
              )}
              {running && (
                <button
                  onClick={handleInterrupt}
                  title={listening ? 'Stop listening' : 'Redirect the discussion'}
                  className={`flex flex-col items-center justify-center gap-1 transition-all cursor-pointer font-medium
                    ${inputMode === 'voice'
                      ? (listening ? 'w-14 h-14 rounded-full text-lg' : 'w-20 h-16 rounded-2xl text-base px-1')
                      : 'w-10 h-10 rounded-full text-base'}
                    ${listening
                      ? 'bg-red-600 animate-pulse text-white ring-2 ring-red-400 shadow-lg shadow-red-900'
                      : inputMode === 'voice'
                        ? 'bg-indigo-700 hover:bg-indigo-600 text-white ring-2 ring-indigo-500 shadow-lg shadow-indigo-900'
                        : 'bg-gray-700 hover:bg-gray-500 text-gray-300'}`}
                >
                  <span>{listening ? <IconStop className="w-5 h-5" /> : <IconMic className="w-5 h-5" />}</span>
                  {inputMode === 'voice' && !listening && <span className="challenge-micro font-semibold tracking-wide opacity-70">REDIRECT</span>}
                </button>
              )}
              {listening && interimText && (
                <p className="absolute left-1/2 top-full z-20 mt-1 w-max max-w-[180px] -translate-x-1/2 rounded-md border border-green-500/40 bg-black/80 px-2 py-1 text-xs text-green-300 text-center italic leading-snug whitespace-normal break-words shadow-lg">
                  {interimText}
                </p>
              )}
              {running && (
                <div className={`flex gap-0.5 ${(!speaking || listening) ? 'invisible' : ''}`}>
                  {[0,1,2].map(i => (
                    <span key={i} className="w-1 h-1 bg-gray-500 rounded-full animate-bounce" style={{ animationDelay: `${i * 150}ms` }} />
                  ))}
                </div>
              )}
            </div>
            <AIAvatar
              persona="B"
              isSpeaking={speaking === 'B'}
              isLoadingVoice={loadingVoice === 'B'}
              lastMessage={lastMessages.B}
              name={names.B}
              onNameChange={v => updateName('B', v)}
              personality={personalities.B}
              onPersonalityChange={v => updatePersonality('B', v)}
              voice={voices.B}
              onVoiceChange={v => updateVoice('B', v)}
              running={running}
              emotion={emotions.B}
            />
          </div>

          {/* Main image — fills remaining height */}
          <div className="flex-1 bg-gray-900 rounded-xl overflow-hidden relative min-h-[260px] lg:min-h-0">
            {!imagesEnabled ? (
              <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 text-red-200/70">
                <span className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-gray-800/80 ring-1 ring-red-700/60 text-red-300">
                  <IconImage className="w-7 h-7" />
                </span>
                <span className="text-sm">Visuals disabled</span>
                <button onClick={() => setImagesEnabled(true)} className="text-xs text-red-300 hover:text-red-200 underline cursor-pointer">
                  Enable visuals
                </button>
              </div>
            ) : displayImage ? (
              <img
                key={displayIndex}
                src={displayImage}
                alt="AI generated illustration"
                  className="absolute inset-0 w-full h-full object-cover"
                style={{ animation: 'fadeIn 0.4s ease' }}
              />
            ) : (
              <div className="absolute inset-0 bg-gray-800 animate-pulse flex items-center justify-center">
                <span className="text-sm text-gray-600">
                  {(messages.length > 0 || running) ? 'Generating visual context...' : 'Start a session to generate visual context'}
                </span>
              </div>
            )}
            {displayIndex !== null && messages[displayIndex] && PERSONAS[messages[displayIndex].persona] && (
              <div className="absolute bottom-0 left-0 right-0 px-4 py-2 bg-black/50 flex items-center gap-2">
                <div className={`w-2 h-2 rounded-full ${PERSONAS[messages[displayIndex].persona].dot}`} />
                <span className="text-xs text-white/70">
                  Round {displayIndex + 1} · {names[messages[displayIndex].persona]}
                </span>
              </div>
            )}
          </div>

          {/* Thumbnail strip */}
          {imageKeys.length > 1 && (
            <div className="flex flex-wrap gap-2 shrink-0">
              {imageKeys.map(idx => {
                const persona = messages[idx]?.persona
                const ring = persona ? PERSONAS[persona].ring : 'ring-gray-500'
                return (
                  <button
                    key={idx}
                    onClick={() => setViewIndex(idx)}
                    className={`rounded-lg overflow-hidden ring-2 transition-all cursor-pointer
                      ${displayIndex === idx ? ring : 'ring-transparent opacity-60 hover:opacity-100'}`}
                  >
                    <img src={images[idx]} alt="" className="w-24 h-14 object-cover block" />
                  </button>
                )
              })}
            </div>
          )}

          {/* Session telemetry */}
          <div className="shrink-0 rounded-xl bg-gray-800/70 border border-gray-700/70 px-4 py-3">
            <div className="flex flex-wrap items-center gap-x-5 gap-y-1 text-gray-400">
              <span>Session est. cost: <span className="font-semibold text-gray-100">~${estimatedSessionCost.toFixed(2)} USD</span></span>
              <span>Calls: <span className="font-semibold text-gray-100">{totalApiCalls}</span></span>
              <span>Turns: <span className="font-semibold text-gray-100">{usageTextTurns}</span></span>
              <span>Voice: <span className="font-semibold text-gray-100">{usageVoiceGenerations}</span></span>
              <span>Images: <span className="font-semibold text-gray-100">{usageImagesGenerated}</span></span>
              <span>Fails: <span className="font-semibold text-gray-100">{totalFailures}</span></span>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
