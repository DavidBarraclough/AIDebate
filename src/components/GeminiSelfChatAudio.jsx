import { useState, useRef, useEffect } from 'react'

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

const EMOTIONS = {
  CONFIDENT:  { label: 'Confident',  emoji: '😎', color: 'bg-green-600' },
  PASSIONATE: { label: 'Passionate', emoji: '🔥', color: 'bg-orange-600' },
  FRUSTRATED: { label: 'Frustrated', emoji: '😤', color: 'bg-red-600' },
  CONCEDING:  { label: 'Conceding',  emoji: '🤝', color: 'bg-teal-600' },
  AMUSED:     { label: 'Amused',     emoji: '😄', color: 'bg-yellow-600' },
  SKEPTICAL:  { label: 'Skeptical',  emoji: '🤨', color: 'bg-indigo-600' },
  DEFIANT:    { label: 'Defiant',    emoji: '💪', color: 'bg-purple-600' },
  THOUGHTFUL: { label: 'Thoughtful', emoji: '🤔', color: 'bg-sky-600' },
}

function parseEmotion(text) {
  const match = text.match(/^\[([A-Z]+)\]\s*/)
  if (match && EMOTIONS[match[1]]) return { emotion: match[1], cleanText: text.slice(match[0].length) }
  return { emotion: 'CONFIDENT', cleanText: text }
}

function getSystemPrompt(name, personality, otherName, styleKey) {
  const styleRule = STYLE_PROMPTS[styleKey] || ''
  return `Your name is ${name}. You ARE this character: ${personality}. Fully embody this role — adopt the worldview, speech patterns, knowledge, mannerisms, and emotional perspective that this character would naturally have.

You are in a lively spoken debate with ${otherName}. Rules:
- Speak naturally, as you would in a real conversation. Do NOT start every response with your opponent's name — use it only occasionally, the way people do in real debates (once every few exchanges at most).
- ADVANCE the debate. Each response must introduce a NEW angle, counterexample, or argument. Never restate what you or your opponent have already said.
- Directly challenge a SPECIFIC thing your opponent just said — don't respond to their general position, respond to their actual words.
- Always speak in the first person — say "I", "me", "my". Never refer to yourself in the third person.
- Stay deeply in character. Keep each response to 2-3 punchy sentences.
- Start EVERY response with an emotion tag in square brackets: one of [CONFIDENT], [PASSIONATE], [FRUSTRATED], [CONCEDING], [AMUSED], [SKEPTICAL], [DEFIANT], [THOUGHTFUL]. Pick the one that best fits your emotional state. Then write your reply.
- A human MODERATOR may interrupt with a [MODERATOR OVERRIDE] message. When this happens, you MUST immediately pivot to address the moderator's new direction or topic. Abandon your previous argument and respond to the moderator's instruction while staying in character.${styleRule ? '\n' + styleRule : ''}`
}

const BAR_HEIGHTS = [30, 60, 45, 80, 55, 70, 35, 65, 50, 75, 40, 60]

function AIAvatar({ persona, isSpeaking, isLoadingVoice, lastMessage, avatarImage, avatarLoading, name, onNameChange, personality, onPersonalityChange, voice, onVoiceChange, running, emotion }) {
  const p = PERSONAS[persona]
  const voiceLabel = VOICE_OPTIONS.find(v => v.value === voice)
  return (
    <div className={`flex-1 rounded-xl p-5 ${p.avatarBg} flex flex-col items-center gap-3.5 transition-all duration-300
      ${isSpeaking ? `ring-2 ${p.ring} shadow-lg ${p.glow}` : 'ring-1 ring-white/10'}`}>

      {/* Avatar circle + sound bars */}
      <div className="flex flex-col items-center gap-1.5 shrink-0">
        <div className={`relative w-24 h-24 rounded-full overflow-hidden ring-3 transition-all duration-300
          ${isSpeaking ? p.ring : 'ring-white/20'}`}
          style={isSpeaking ? { animation: 'talking 0.18s ease-in-out infinite alternate' } : {}}>
          {avatarImage ? (
            <img src={avatarImage} alt={name} className="w-full h-full object-cover" style={{ animation: 'fadeIn 0.6s ease' }} />
          ) : (
            <div className={`w-full h-full flex items-center justify-center ${p.avatarBg} text-3xl font-black
              ${avatarLoading ? 'animate-pulse' : 'text-white/80'}`}>
              {avatarLoading ? '?' : persona}
            </div>
          )}
          {isSpeaking && (
            <div className="absolute bottom-0 left-0 right-0 h-1/4 origin-bottom"
              style={{ animation: 'jawOpen 0.18s ease-in-out infinite alternate' }}>
              <div className="w-full h-full"
                style={{ background: `linear-gradient(to top, ${p.ringColor}33, transparent)` }} />
            </div>
          )}
        </div>
        <div className="flex items-end gap-px h-4">
          {BAR_HEIGHTS.slice(0, 8).map((h, i) => (
            <div key={i} className={`w-1.5 rounded-full transition-all ${p.barColor}`}
              style={{
                height: isSpeaking ? `${h}%` : '15%',
                opacity: isSpeaking ? 0.9 : 0.25,
                animation: isSpeaking ? `soundBar ${0.5 + (i % 4) * 0.15}s ease-in-out infinite alternate` : 'none',
                animationDelay: `${i * 0.05}s`,
              }} />
          ))}
        </div>
      </div>

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
              <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-sm font-medium text-white w-fit transition-all duration-500 ${EMOTIONS[emotion].color}`}>
                <span>{EMOTIONS[emotion].emoji}</span> <span>{EMOTIONS[emotion].label}</span>
              </span>
            )}
            <span className="text-sm text-white/40 italic leading-tight line-clamp-2 max-w-full">{personality}</span>
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
                : voiceLabel ? `${voiceLabel.label} · ${voiceLabel.desc}` : voice}
          </span>
        ) : (
          <select value={voice} onChange={e => onVoiceChange(e.target.value)}
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
async function fetchTTS(text, personaKey, voice) {
  const res = await fetch('http://localhost:3001/api/tts', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
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
async function speak(text, personaKey, voice, muted, currentAudioRef, onQuotaHit) {
  if (muted) return
  const data = await fetchTTS(text, personaKey, voice)
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
  { value: 'normal', label: 'Normal' },
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
  normal: '',
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

export default function GeminiSelfChatAudio() {
  const [topic, setTopic] = useState('')
  const [inputMode, setInputMode] = useState('voice') // 'type' | 'voice'
  const [messages, setMessages] = useState([])
  const [images, setImages] = useState({})  // index -> data URL
  const [viewIndex, setViewIndex] = useState(null)
  const [running, setRunning] = useState(false)
  const [initialising, setInitialising] = useState(false)
  const [muted, setMuted] = useState(false)
  const [imagesEnabled, _setImagesEnabled] = useState(true)
  const imagesEnabledRef = useRef(true)
  const setImagesEnabled = (v) => {
    const next = typeof v === 'function' ? v(imagesEnabledRef.current) : v
    imagesEnabledRef.current = next
    _setImagesEnabled(next)
  }
  const [error, setError] = useState(null)
  const [quotaAlerts, setQuotaAlerts] = useState({ tts: false, image: false })
  const currentAudioRef = useRef(null)
  const [speaking, setSpeaking] = useState(null)
  const [loadingVoice, setLoadingVoice] = useState(null)
  const [lastMessages, setLastMessages] = useState({ A: '', B: '' })
  const [avatarImages, setAvatarImages] = useState({ A: null, B: null })
  const [avatarLoading, setAvatarLoading] = useState({ A: false, B: false })
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
  const [style, _setStyle] = useState('normal')
  const setStyle = (v) => { styleRef.current = v; _setStyle(v) }
  const [elapsed, setElapsed] = useState(0)
  const [splitPercent, setSplitPercent] = useState(50)
  const [draggingSplit, setDraggingSplit] = useState(false)
  const [paused, setPaused] = useState(false)
  const [isMobile, setIsMobile] = useState(() => window.innerWidth < 1024)
  const startTimeRef = useRef(null)
  const mainAreaRef = useRef(null)
  const isDraggingRef = useRef(false)
  const MAX_DURATION_MS = 60 * 60 * 1000 // 60 minutes
  const bottomRef = useRef(null)
  const stopRef = useRef(false)
  const pauseDebateRef = useRef(false)
  const userInterruptRef = useRef(null)
  const recognitionRef = useRef(null)
  const personalitiesRef = useRef({ ...DEFAULT_PERSONALITIES })
  const namesRef = useRef({ ...DEFAULT_NAMES })
  const voicesRef = useRef({ ...DEFAULT_VOICES })
  const styleRef = useRef('normal')
  // Debate state persisted across pause/resume
  const historyARef = useRef([])
  const historyBRef = useRef([])
  const lastMessageRef = useRef('')
  const currentTurnRef = useRef('A')
  const elapsedBeforePauseRef = useRef(0)

  const formatTime = (secs) => {
    const m = Math.floor(secs / 60).toString().padStart(2, '0')
    const s = (secs % 60).toString().padStart(2, '0')
    return `${m}:${s}`
  }

  const imageKeys = Object.keys(images).map(Number).sort((a, b) => a - b)
  const latestIndex = imageKeys.length > 0 ? imageKeys[imageKeys.length - 1] : null
  const displayIndex = viewIndex !== null && images[viewIndex] != null ? viewIndex : latestIndex
  const displayImage = displayIndex !== null ? images[displayIndex] : null

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

  const randomise = async () => {
    setRandomising(true)
    setError(null)
    try {
      const res = await fetch('http://localhost:3001/api/generate-setup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ category, style: styleRef.current }),
      })
      const setup = await res.json()
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

  const generateSelfPortrait = async (persona) => {
    const personality = personalitiesRef.current[persona]
    setAvatarLoading(prev => ({ ...prev, [persona]: true }))
    try {
      // Ask the AI how it visually imagines itself, seeded with its personality
      const descRes = await fetch('http://localhost:3001/api/self-chat-turn', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          systemPrompt: `You are an AI with this personality: ${personality}. You have a vivid sense of visual identity that reflects who you are. In ONE sentence only, describe how you visually imagine yourself — as an abstract form, color, pattern, element of nature, or symbol that embodies your personality. Pure visual description only, no explanation.`,
          history: [],
          message: 'Describe your visual self-image in one sentence.',
        }),
      })
      const descData = await descRes.json()
      if (descData.error) return

      // Generate the image
      const imgRes = await fetch('http://localhost:3001/api/image', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          prompt: `${descData.reply} Abstract digital art, vibrant, highly detailed. No text, no letters, no faces, no people.`,
          aspectRatio: '1:1',
        }),
      })
      const imgData = await imgRes.json()
      if (imgData.imageData) {
        setAvatarImages(prev => ({ ...prev, [persona]: `data:${imgData.mimeType};base64,${imgData.imageData}` }))
      }
    } catch (err) {
      console.error(`Avatar generation failed for ${persona}:`, err.message)
    } finally {
      setAvatarLoading(prev => ({ ...prev, [persona]: false }))
    }
  }

  const classifyInterrupt = async (text) => {
    try {
      const res = await fetch('http://localhost:3001/api/classify-interrupt', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text }),
      })
      return await res.json()
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
              generateSelfPortrait(p)
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
    const augmentedMessage = `${message}\n\n[You are ${name}. Reply using "I" — never say "${name} thinks" or "${name} feels".]`
    const res = await fetch('http://localhost:3001/api/self-chat-turn', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        systemPrompt: getSystemPrompt(
          name,
          personalitiesRef.current[persona],
          namesRef.current[other],
          styleRef.current,
        ),
        history,
        message: augmentedMessage,
      }),
    })
    const data = await res.json()
    if (data.error) throw new Error(data.error)
    return data.reply
  }

  const fetchSummary = async () => {
    if (messages.length < 4) return
    setSummaryLoading(true)
    try {
      const transcript = messages
        .map(m => {
          const speaker = m.persona === 'A' ? namesRef.current.A
            : m.persona === 'B' ? namesRef.current.B
            : m.persona === 'host' ? 'Host' : 'Moderator'
          return `${speaker}: ${m.content}`
        }).join('\n')
      const res = await fetch('http://localhost:3001/api/debate-summary', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ transcript, nameA: namesRef.current.A, nameB: namesRef.current.B, topic }),
      })
      const data = await res.json()
      if (data.error) throw new Error(data.error)
      setSummary(data)
    } catch (err) {
      console.error('Summary error:', err.message)
      setError('Could not generate summary: ' + err.message)
    } finally {
      setSummaryLoading(false)
    }
  }

  const start = async () => {
    if (!topic.trim() || running) return
    const isResume = paused

    if (!isResume) {
      // Fresh start
      setMessages([])
      setImages({})
      setViewIndex(null)
      setLastMessages({ A: '', B: '' })
      setAvatarImages({ A: null, B: null })
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
      // Generate self-portraits for both AIs in parallel
      generateSelfPortrait('A')
      generateSelfPortrait('B')
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
      let prefetchImagePromise = null

      // Host introduction on fresh start
      if (!isResume && !muted) {
        const nameA = namesRef.current.A
        const nameB = namesRef.current.B
        const cleanTopic = topic.trim().replace(/[?.!,;:]+$/, '')
        const styleLabel = STYLES.find(s => s.value === styleRef.current)?.label
        const spokenStyleLabel = styleRef.current === 'eli5' ? "Explain Like I'm Five" : styleLabel
        const styleIntro = styleRef.current !== 'normal' ? ` Tonight's style: ${spokenStyleLabel}!` : ''
        const intro = `Welcome! Tonight's topic: ${cleanTopic}. In one corner, we have ${nameA}. And in the other corner, ${nameB}.${styleIntro} Let the debate begin!`
        setMessages(prev => [...prev, { persona: 'host', content: intro }])
        setInitialising(false)
        setSpeaking('host')
        setLoadingVoice('host')

        // Prefetch first speaker's reply + TTS while host intro plays
        prefetchReplyPromise = callTurn('A', historyARef.current, lastMessageRef.current)
        prefetchTTSPromise = prefetchReplyPromise.then(r =>
          fetchTTS(parseEmotion(r).cleanText, 'A', voicesRef.current.A)
        ).catch(() => null)

        const hostTTS = await fetchTTS(intro, 'host', HOST_VOICE)
        setLoadingVoice(null)
        if (!stopRef.current) {
          await playTTS(hostTTS, currentAudioRef, () => {
            setMuted(true)
            setQuotaAlerts(prev => ({ ...prev, tts: true }))
          })
        }
        setSpeaking(null)
        if (stopRef.current) throw new Error('stopped')
      }

      setInitialising(false)
      while (true) {
        if (stopRef.current) break
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

        // Image for this turn — use prefetched data or fetch fresh
        const imagePrompt = `Cinematic photorealistic illustration of "${topic}". Dramatic lighting, high quality digital art. Absolutely no text, words, letters, numbers, or writing visible anywhere in the image.`
        const applyImage = (data) => {
          if (data.error) {
            if (data.error.toLowerCase().includes('quota')) {
              setImagesEnabled(false)
              setQuotaAlerts(prev => ({ ...prev, image: true }))
            } else {
              console.error('Image API error:', data.error)
            }
          } else if (data.imageData) {
            setImages(prev => ({ ...prev, [msgIndex]: `data:${data.mimeType};base64,${data.imageData}` }))
          }
        }
        const currentImagePromise = prefetchImagePromise
          ? prefetchImagePromise.then(applyImage).catch(err => console.error('Image fetch error:', err))
          : (imagesEnabledRef.current
            ? fetch('http://localhost:3001/api/image', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ prompt: imagePrompt }),
              }).then(r => r.json()).then(applyImage).catch(err => console.error('Image fetch error:', err))
            : Promise.resolve())
        prefetchImagePromise = null

        // Prefetch NEXT turn's reply + TTS + image while current TTS plays
        const nextReplyPromise = callTurn(nextTurn, nextTurn === 'A' ? historyARef.current : historyBRef.current, reply)
        // Chain TTS fetch after reply resolves so audio is ready instantly
        const nextTTSPromise = !muted
          ? nextReplyPromise.then(nextReply =>
              fetchTTS(parseEmotion(nextReply).cleanText, nextTurn, voicesRef.current[nextTurn])
            ).catch(() => null)
          : null
        const nextImagePromise = imagesEnabledRef.current
          ? fetch('http://localhost:3001/api/image', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ prompt: imagePrompt }),
            }).then(r => r.json())
          : null

        // Play TTS — use prefetched audio data or fetch fresh
        const onQuotaHit = () => {
          setMuted(true)
          setQuotaAlerts(prev => ({ ...prev, tts: true }))
        }
        let ttsPromise
        if (ttsData) {
          // Prefetched — audio ready, play immediately
          setSpeaking(turn)
          ttsPromise = playTTS(ttsData, currentAudioRef, onQuotaHit)
        } else if (!muted) {
          // Not prefetched — show loading state while fetching voice
          setLoadingVoice(turn)
          const freshTTSData = await fetchTTS(cleanText, turn, voicesRef.current[turn])
          setLoadingVoice(null)
          if (stopRef.current) break
          setSpeaking(turn)
          ttsPromise = playTTS(freshTTSData, currentAudioRef, onQuotaHit)
        } else {
          ttsPromise = Promise.resolve()
        }
        // Reading-pace delay when muted — ~250ms per word, minimum 2s
        const readingDelay = muted
          ? new Promise(r => setTimeout(r, Math.max(2000, cleanText.split(/\s+/).length * 250)))
          : null
        await Promise.all([ttsPromise, currentImagePromise, readingDelay].filter(Boolean))
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
          prefetchImagePromise = null
        } else {
          prefetchReplyPromise = nextReplyPromise
          prefetchTTSPromise = nextTTSPromise
          prefetchImagePromise = nextImagePromise
        }
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
    setMessages([])
    setImages({})
    setViewIndex(null)
    setLastMessages({ A: '', B: '' })
    setAvatarImages({ A: null, B: null })
    setAvatarLoading({ A: false, B: false })
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
    setTopic('')
    setSpeaking(null)
    setCategory('wild-card')
    setStyle('normal')
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
    <div className={`h-full flex flex-col gap-3 uniform-text-scale ${draggingSplit ? 'dragging-split' : ''}`}>
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
          font-size: 1rem !important;
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
        .dragging-split * { user-select: none !important; cursor: col-resize !important; }
      `}</style>

      {/* Main area — fills full height */}
      <div className="flex-1 flex flex-col lg:flex-row gap-3 lg:gap-0 min-h-0 overflow-y-auto lg:overflow-hidden" ref={mainAreaRef}>

        {/* Left: controls + transcript */}
        <div style={{ width: isMobile ? '100%' : `${splitPercent}%` }} className="w-full lg:shrink-0 bg-gray-900 rounded-xl p-5 flex flex-col gap-4 min-h-[50vh] lg:min-h-0">
          {/* Control buttons */}
          <div className="flex gap-2 shrink-0 flex-wrap">
            {running ? (
              <div className="flex items-center gap-2 px-4 py-3 bg-gray-800 border border-gray-700 rounded-xl text-base shrink-0">
                <span className="w-1.5 h-1.5 bg-green-400 rounded-full animate-pulse" />
                <span className="text-gray-300 font-mono">{formatTime(elapsed)}</span>
                <span className="text-gray-600">/</span>
                <span className="text-gray-500 font-mono">60:00</span>
              </div>
            ) : paused ? (
              <div className="flex items-center gap-2 px-4 py-3 bg-gray-800 border border-yellow-700 rounded-xl text-base shrink-0">
                <span className="w-1.5 h-1.5 bg-yellow-400 rounded-full" />
                <span className="text-yellow-300 font-mono">{formatTime(elapsed)}</span>
                <span className="text-gray-600">/</span>
                <span className="text-gray-500 font-mono">60:00</span>
              </div>
            ) : (
              <div className="flex items-center gap-2 px-4 py-3 bg-gray-800 border border-gray-700 rounded-xl text-base shrink-0 text-gray-500">
                <span>⏱</span>
                <span>up to 60 min</span>
              </div>
            )}
            <button
              onClick={() => { setMuted(m => !m); if (!muted && currentAudioRef.current) currentAudioRef.current.pause() }}
              title={muted ? 'Unmute' : 'Mute'}
              className={`px-4 py-3 rounded-xl text-base transition-colors cursor-pointer ${muted ? 'bg-gray-700 text-gray-400' : 'bg-green-900 text-green-300'}`}
            >
              {muted ? '🔇' : '🔊'}
            </button>
            <button
              onClick={() => setImagesEnabled(m => !m)}
              title={imagesEnabled ? 'Disable image generation' : 'Enable image generation'}
              className={`px-4 py-3 rounded-xl text-base transition-colors cursor-pointer ${imagesEnabled ? 'bg-violet-900 text-violet-300' : 'bg-gray-700 text-gray-500 line-through'}`}
            >
              🖼️
            </button>
            {!running && !paused ? (
              <>
                <select
                  value={category}
                  onChange={e => setCategory(e.target.value)}
                  disabled={randomising}
                  className="bg-gray-700 border border-gray-600 rounded-xl px-3 py-3 text-base text-gray-200 focus:outline-none focus:border-amber-500 cursor-pointer disabled:opacity-40 shrink-0"
                >
                  {CATEGORIES.map(c => (
                    <option key={c.value} value={c.value}>{c.label}</option>
                  ))}
                </select>
                <select
                  value={style}
                  onChange={e => setStyle(e.target.value)}
                  disabled={randomising}
                  className="bg-gray-700 border border-gray-600 rounded-xl px-3 py-3 text-base text-gray-200 focus:outline-none focus:border-indigo-500 cursor-pointer disabled:opacity-40 shrink-0"
                >
                  {STYLES.map(s => (
                    <option key={s.value} value={s.value}>{s.label}</option>
                  ))}
                </select>
                <button
                  onClick={randomise}
                  disabled={randomising}
                  title="Randomise characters and topic"
                  className="px-4 py-3 bg-amber-700 hover:bg-amber-600 disabled:opacity-40 rounded-xl text-base font-medium transition-colors cursor-pointer shrink-0"
                >
                  {randomising ? '⏳' : '🎲'}
                </button>
              </>
            ) : (
              <>
                <span className="inline-flex items-center justify-center px-3 py-1.5 rounded-lg bg-amber-900/60 border border-amber-700/40 text-amber-200 text-sm font-medium shrink-0">
                  {CATEGORIES.find(c => c.value === category)?.label || category}
                </span>
                {style !== 'normal' && (
                  <span className="inline-flex items-center justify-center px-3 py-1.5 rounded-lg bg-indigo-900/60 border border-indigo-700/40 text-indigo-200 text-sm font-medium shrink-0">
                    {STYLES.find(s => s.value === style)?.label || style}
                  </span>
                )}
              </>
            )}
            {running && !paused ? (
              <button onClick={pause} className="px-5 py-3 bg-yellow-700 hover:bg-yellow-600 rounded-xl text-base font-medium transition-colors cursor-pointer shrink-0">
                Pause
              </button>
            ) : running && paused ? (
              <button onClick={resumeDebate} className="px-5 py-3 bg-green-700 hover:bg-green-600 rounded-xl text-base font-medium transition-colors cursor-pointer shrink-0">
                Resume
              </button>
            ) : (
              <button onClick={start} disabled={!topic.trim()} className="px-5 py-3 rounded-xl text-base font-medium transition-colors cursor-pointer shrink-0 disabled:opacity-40 bg-indigo-600 hover:bg-indigo-500">
                Start
              </button>
            )}
            {(messages.length > 0 || paused) && (
              <button onClick={reset} className="px-5 py-3 bg-gray-700 hover:bg-gray-600 rounded-xl text-base transition-colors cursor-pointer shrink-0">
                Reset
              </button>
            )}
            {paused && messages.length >= 4 && !summary && !summaryLoading && (
              <button onClick={fetchSummary} className="px-5 py-3 bg-amber-700 hover:bg-amber-600 rounded-xl text-base font-medium transition-colors cursor-pointer shrink-0">
                Summarise
              </button>
            )}
          </div>

          {/* Topic input — below controls */}
          <input
            value={topic}
            onChange={e => setTopic(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && start()}
            placeholder="Give them a topic…"
            disabled={running}
            className="w-full bg-gray-800 border border-gray-700 rounded-xl px-4 py-3 text-base focus:outline-none focus:border-indigo-500 placeholder-gray-500 disabled:opacity-50 shrink-0"
          />

          {/* Quota alerts banner */}
          {(quotaAlerts.tts || quotaAlerts.image) && (
            <div className="flex flex-col gap-1.5 shrink-0">
              {quotaAlerts.tts && (
                <div className="flex items-center gap-2 px-4 py-3 rounded-xl bg-amber-950/80 border border-amber-700/50 text-amber-200 text-sm">
                  <span className="text-base leading-none">🔇</span>
                  <span><strong>Voice quota exceeded</strong> — audio auto-muted, debate continues as text. Resets daily.</span>
                </div>
              )}
              {quotaAlerts.image && (
                <div className="flex items-center gap-2 px-4 py-3 rounded-xl bg-amber-950/80 border border-amber-700/50 text-amber-200 text-sm">
                  <span className="text-base leading-none">🖼️</span>
                  <span><strong>Image quota exceeded</strong> — images auto-disabled. Resets daily.</span>
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
              <span className="text-base text-gray-400">Preparing debate…</span>
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
                          <span className="text-sm font-semibold opacity-70">Host</span>
                          {loadingVoice === 'host' && (
                            <span className="text-xs text-amber-300 animate-pulse">generating voice…</span>
                          )}
                          {isHostSpeaking && loadingVoice !== 'host' && (
                            <span className="text-lg text-amber-300 animate-pulse font-semibold">speaking…</span>
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
                        <span className="text-sm font-semibold opacity-70 block mb-1">You (redirecting)</span>
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
              {running && !speaking && (
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
                    <span className="text-sm font-semibold text-amber-400 block mb-1">Generating Summary...</span>
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

          {/* Avatar stage */}
          <div className="flex flex-col sm:flex-row gap-3 shrink-0">
            <AIAvatar
              persona="A"
              isSpeaking={speaking === 'A'}
              isLoadingVoice={loadingVoice === 'A'}
              lastMessage={lastMessages.A}
              avatarImage={avatarImages.A}
              avatarLoading={avatarLoading.A}
              name={names.A}
              onNameChange={v => updateName('A', v)}
              personality={personalities.A}
              onPersonalityChange={v => updatePersonality('A', v)}
              voice={voices.A}
              onVoiceChange={v => updateVoice('A', v)}
              running={running}
              emotion={emotions.A}
            />
            <div className="flex flex-col items-center justify-center gap-2 shrink-0">
              {!running && <div className="text-gray-600 text-xs font-medium">VS</div>}
              {running && (
                <button
                  onClick={handleInterrupt}
                  title={listening ? 'Cancel listening' : 'Challenge the debaters'}
                  className={`rounded-full flex flex-col items-center justify-center gap-1 transition-all cursor-pointer font-medium
                    ${inputMode === 'voice' ? 'w-14 h-14 text-lg' : 'w-10 h-10 text-base'}
                    ${listening
                      ? 'bg-red-600 animate-pulse text-white ring-2 ring-red-400 shadow-lg shadow-red-900'
                      : inputMode === 'voice'
                        ? 'bg-indigo-700 hover:bg-indigo-600 text-white ring-2 ring-indigo-500 shadow-lg shadow-indigo-900'
                        : 'bg-gray-700 hover:bg-gray-500 text-gray-300'}`}
                >
                  <span>{listening ? '⏹' : '🎤'}</span>
                  {inputMode === 'voice' && !listening && <span className="text-[8px] font-semibold tracking-wide opacity-70">CHALLENGE</span>}
                </button>
              )}
              {listening && interimText && (
                <p className="text-xs text-green-400 text-center max-w-[60px] italic leading-tight line-clamp-2">{interimText}</p>
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
              avatarImage={avatarImages.B}
              avatarLoading={avatarLoading.B}
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
              <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 text-gray-600">
                <span className="text-4xl opacity-30">🖼️</span>
                <span className="text-sm">Images disabled</span>
                <button onClick={() => setImagesEnabled(true)} className="text-xs text-violet-500 hover:text-violet-400 underline cursor-pointer">
                  Enable
                </button>
              </div>
            ) : displayImage ? (
              <img
                key={displayIndex}
                src={displayImage}
                alt="AI generated illustration"
                className="absolute inset-0 w-full h-full object-contain"
                style={{ animation: 'fadeIn 0.4s ease' }}
              />
            ) : (
              <div className="absolute inset-0 bg-gray-800 animate-pulse flex items-center justify-center">
                <span className="text-sm text-gray-600">
                  {(messages.length > 0 || running) ? 'generating image…' : 'Start a debate to see AI-generated images'}
                </span>
              </div>
            )}
            {displayIndex !== null && messages[displayIndex] && PERSONAS[messages[displayIndex].persona] && (
              <div className="absolute bottom-0 left-0 right-0 px-4 py-2 bg-black/50 flex items-center gap-2">
                <div className={`w-2 h-2 rounded-full ${PERSONAS[messages[displayIndex].persona].dot}`} />
                <span className="text-xs text-white/70">
                  Turn {displayIndex + 1} · {names[messages[displayIndex].persona]}
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
        </div>
      </div>
    </div>
  )
}
