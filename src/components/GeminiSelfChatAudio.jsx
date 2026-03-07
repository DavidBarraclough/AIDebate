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
    defaultVoice: 'Puck',
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
    defaultVoice: 'Kore',
  },
}

const MALE_VOICES   = ['Puck','Charon','Fenrir','Orus','Orbit','Algieba','Achernar','Rasalased','Sadachbia','Gacrux']
const FEMALE_VOICES = ['Kore','Aoede','Zephyr','Leda','Schedar','Sulafat','Despina','Erinome','Vindemiatrix']
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
  { value: 'Orbit',      label: 'Orbit',      desc: '♂ Upbeat' },
  { value: 'Algieba',    label: 'Algieba',    desc: '♂ Smooth' },
  { value: 'Achernar',   label: 'Achernar',   desc: '♂ Soft' },
  { value: 'Rasalased',  label: 'Rasalased',  desc: '♂ Informative' },
  { value: 'Sadachbia',  label: 'Sadachbia',  desc: '♂ Lively' },
  { value: 'Gacrux',     label: 'Gacrux',     desc: '♂ Mature' },
  { value: 'Kore',       label: 'Kore',       desc: '♀ Firm' },
  { value: 'Aoede',      label: 'Aoede',      desc: '♀ Breezy' },
  { value: 'Zephyr',     label: 'Zephyr',     desc: '♀ Bright' },
  { value: 'Leda',       label: 'Leda',       desc: '♀ Youthful' },
  { value: 'Schedar',    label: 'Schedar',    desc: '♀ Even' },
  { value: 'Sulafat',    label: 'Sulafat',    desc: '♀ Warm' },
  { value: 'Despina',    label: 'Despina',    desc: '♀ Smooth' },
  { value: 'Erinome',    label: 'Erinome',    desc: '♀ Clear' },
  { value: 'Vindemiatrix', label: 'Vindemiatrix', desc: '♀ Gentle' },
]

function getSystemPrompt(name, personality, otherName) {
  return `Your name is ${name}. You are an AI with the following personality: ${personality}. You are in a lively discussion with ${otherName}, another AI. When anyone — including the human moderator — refers to you as "${name}", they are addressing you. CRITICAL: Always speak in the first person — say "I", "me", "my". Never refer to yourself in the third person (never say "${name} thinks..." or "${name} feels..."). You ARE ${name}, so always speak as "I". Let your personality shape your tone, vocabulary, and perspective. Keep each response to 2-3 sentences.`
}

const BAR_HEIGHTS = [30, 60, 45, 80, 55, 70, 35, 65, 50, 75, 40, 60]

function AIAvatar({ persona, isSpeaking, lastMessage, avatarImage, avatarLoading, name, onNameChange, personality, onPersonalityChange, voice, onVoiceChange, running }) {
  const p = PERSONAS[persona]
  const voiceLabel = VOICE_OPTIONS.find(v => v.value === voice)
  return (
    <div className={`flex-1 rounded-2xl p-4 ${p.avatarBg} flex flex-col items-center gap-2 transition-all duration-300
      ${isSpeaking ? `ring-2 ${p.ring} shadow-xl ${p.glow}` : 'ring-1 ring-white/10'}`}>

      {/* Avatar */}
      <div className={`relative w-28 h-28 rounded-full overflow-hidden ring-4 transition-all duration-300
        ${isSpeaking ? p.ring : 'ring-white/20'}`}
        style={isSpeaking ? { animation: 'talking 0.18s ease-in-out infinite alternate' } : {}}>
        {avatarImage ? (
          <img src={avatarImage} alt={name} className="w-full h-full object-cover" style={{ animation: 'fadeIn 0.6s ease' }} />
        ) : (
          <div className={`w-full h-full flex items-center justify-center ${p.avatarBg} text-5xl font-black
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

      {/* Name — editable before debate, display-only during */}
      {running ? (
        <span className={`text-sm font-semibold ${p.barColor.replace('bg-', 'text-')}`}>{name}</span>
      ) : (
        <input
          value={name}
          onChange={e => onNameChange(e.target.value)}
          placeholder="Name…"
          className="w-full bg-black/40 border border-white/15 rounded-lg px-2 py-1 text-sm font-semibold text-white/90
            focus:outline-none focus:border-white/40 placeholder-white/20 text-center"
        />
      )}

      {/* Personality — editable before debate, display-only during */}
      {running ? (
        <span className="text-[11px] text-white/40 italic px-2 text-center line-clamp-1 min-h-[1rem]">
          {personality}
        </span>
      ) : (
        <input
          value={personality}
          onChange={e => onPersonalityChange(e.target.value)}
          placeholder="Personality…"
          className="w-full bg-black/30 border border-white/10 rounded-lg px-2 py-1 text-[11px] text-white/70
            focus:outline-none focus:border-white/30 placeholder-white/20 text-center"
        />
      )}

      {/* Voice picker — editable before debate, label during */}
      {running ? (
        <span className="text-[10px] text-white/25 text-center">
          {voiceLabel ? `${voiceLabel.label} · ${voiceLabel.desc}` : voice}
        </span>
      ) : (
        <select
          value={voice}
          onChange={e => onVoiceChange(e.target.value)}
          className="w-full bg-black/30 border border-white/10 rounded-lg px-2 py-1 text-[11px] text-white/60
            focus:outline-none focus:border-white/30 cursor-pointer"
        >
          {VOICE_OPTIONS.map(v => (
            <option key={v.value} value={v.value}>{v.label} · {v.desc}</option>
          ))}
        </select>
      )}

      {/* Sound wave bars */}
      <div className="flex items-end gap-0.5 h-10">
        {BAR_HEIGHTS.map((h, i) => (
          <div
            key={i}
            className={`w-1.5 rounded-full transition-all ${p.barColor}`}
            style={{
              height: isSpeaking ? `${h}%` : '15%',
              opacity: isSpeaking ? 0.9 : 0.25,
              animation: isSpeaking ? `soundBar ${0.5 + (i % 4) * 0.15}s ease-in-out infinite alternate` : 'none',
              animationDelay: `${i * 0.05}s`,
            }}
          />
        ))}
      </div>

      {/* Status */}
      <div className="h-4 text-xs text-center">
        {isSpeaking
          ? <span className={`${p.barColor.replace('bg-', 'text-')} animate-pulse font-medium`}>speaking…</span>
          : <span className="text-white/30">idle</span>
        }
      </div>

      {/* Last message snippet */}
      {lastMessage && (
        <p className="text-xs text-white/40 text-center line-clamp-2 px-2">{lastMessage}</p>
      )}
    </div>
  )
}

let audioCtx = null

function getAudioContext() {
  if (!audioCtx || audioCtx.state === 'closed') {
    audioCtx = new (window.AudioContext || window.webkitAudioContext)()
  }
  if (audioCtx.state === 'suspended') audioCtx.resume()
  return audioCtx
}

async function speak(text, personaKey, voice, muted, currentAudioRef) {
  if (muted) return
  const res = await fetch('http://localhost:3001/api/tts', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ text, persona: personaKey, voice }),
  })
  const data = await res.json()
  if (data.error) throw new Error(data.error)

  const ctx = getAudioContext()
  const wavBytes = Uint8Array.from(atob(data.audioContent), c => c.charCodeAt(0)).buffer
  const audioBuffer = await ctx.decodeAudioData(wavBytes)

  return new Promise(resolve => {
    const source = ctx.createBufferSource()
    source.buffer = audioBuffer
    source.connect(ctx.destination)
    currentAudioRef.current = source
    source.onended = resolve
    source.start(0)
  })
}

const DEFAULT_PERSONALITIES = { A: PERSONAS.A.defaultPersonality, B: PERSONAS.B.defaultPersonality }
const DEFAULT_NAMES = { A: PERSONAS.A.defaultName, B: PERSONAS.B.defaultName }

export default function GeminiSelfChatAudio() {
  const [topic, setTopic] = useState('')
  const [inputMode, setInputMode] = useState('type') // 'type' | 'voice'
  const [messages, setMessages] = useState([])
  const [images, setImages] = useState({})  // index -> data URL
  const [viewIndex, setViewIndex] = useState(null)
  const [running, setRunning] = useState(false)
  const [muted, setMuted] = useState(false)
  const [imagesEnabled, setImagesEnabled] = useState(true)
  const [error, setError] = useState(null)
  const currentAudioRef = useRef(null)
  const [speaking, setSpeaking] = useState(null)
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
  const [elapsed, setElapsed] = useState(0)
  const [splitPercent, setSplitPercent] = useState(50)
  const [draggingSplit, setDraggingSplit] = useState(false)
  const [paused, setPaused] = useState(false)
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
    return () => { try { if (currentAudioRef.current) currentAudioRef.current.stop() } catch {} }
  }, [])

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

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
      const res = await fetch('http://localhost:3001/api/generate-setup', { method: 'POST' })
      const setup = await res.json()
      if (setup.error) throw new Error(setup.error)
      updateName('A', setup.A.name)
      updateName('B', setup.B.name)
      updatePersonality('A', setup.A.personality)
      updatePersonality('B', setup.B.personality)
      updateVoice('A', pickVoice(setup.A.gender))
      updateVoice('B', pickVoice(setup.B.gender))
      setTopic(setup.topic)
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
      if (text) {
        setMessages(prev => [...prev, { persona: 'user', content: text }])

        // Check if this is a personality update
        const classification = await classifyInterrupt(text)

        if (classification.isPersonalityUpdate && classification.target && classification.newPersonality) {
          const targets = classification.target === 'both' ? ['A', 'B'] : [classification.target]
          targets.forEach(p => {
            updatePersonality(p, classification.newPersonality)
            // Regenerate avatar to reflect new personality (fire and forget)
            generateSelfPortrait(p)
          })
        }

        userInterruptRef.current = text
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
        ),
        history,
        message: augmentedMessage,
      }),
    })
    const data = await res.json()
    if (data.error) throw new Error(data.error)
    return data.reply
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
      setError(null)
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
    stopRef.current = false
    startTimeRef.current = Date.now()
    try { if (currentAudioRef.current) currentAudioRef.current.stop() } catch {}

    try {
      while (true) {
        if (stopRef.current) break
        const totalElapsed = elapsedBeforePauseRef.current + (Date.now() - startTimeRef.current)
        if (totalElapsed >= MAX_DURATION_MS) break

        const turn = currentTurnRef.current
        const reply = await callTurn(turn, turn === 'A' ? historyARef.current : historyBRef.current, lastMessageRef.current)

        const activeHistory = turn === 'A' ? historyARef.current : historyBRef.current
        activeHistory.push({ role: 'user', content: lastMessageRef.current })
        activeHistory.push({ role: 'model', content: reply })

        let msgIndex = -1
        setMessages(prev => {
          msgIndex = prev.length
          return [...prev, { persona: turn, content: reply }]
        })
        setLastMessages(prev => ({ ...prev, [turn]: reply }))

        const imagePrompt = `Cinematic photorealistic illustration of "${topic}". Dramatic lighting, high quality digital art. Absolutely no text, words, letters, numbers, or writing visible anywhere in the image.`
        const imagePromise = imagesEnabled
          ? fetch('http://localhost:3001/api/image', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ prompt: imagePrompt }),
            }).then(r => r.json()).then(data => {
              if (data.error) {
                if (data.error.toLowerCase().includes('quota')) {
                  setImagesEnabled(false)
                  setError('Image quota reached — images auto-disabled. They reset daily.')
                } else {
                  console.error('Image API error:', data.error)
                }
              } else if (data.imageData) {
                setImages(prev => ({ ...prev, [msgIndex]: `data:${data.mimeType};base64,${data.imageData}` }))
              }
            }).catch(err => console.error('Image fetch error:', err))
          : Promise.resolve()

        setSpeaking(turn)
        await Promise.all([
          speak(reply, turn, voicesRef.current[turn], muted, currentAudioRef),
          imagePromise,
        ])
        setSpeaking(null)

        while (pauseDebateRef.current && !stopRef.current) {
          await new Promise(r => setTimeout(r, 100))
        }
        if (stopRef.current) break

        if (userInterruptRef.current) {
          const interrupt = userInterruptRef.current
          userInterruptRef.current = null
          lastMessageRef.current = `The human moderator says: "${interrupt}". Briefly acknowledge this direction and redirect your response accordingly.`
        } else {
          lastMessageRef.current = reply
        }
        currentTurnRef.current = turn === 'A' ? 'B' : 'A'
      }
    } catch (err) {
      setError(err.message)
    } finally {
      elapsedBeforePauseRef.current += Date.now() - startTimeRef.current
      setRunning(false)
      setSpeaking(null)
      if (!stopRef.current) {
        // Finished naturally (time limit) — not paused
        setPaused(false)
      }
    }
  }

  const pause = () => {
    stopRef.current = true
    setPaused(true)
    pauseDebateRef.current = false
    recognitionRef.current?.abort()
    try { if (currentAudioRef.current) currentAudioRef.current.stop() } catch {}
    setSpeaking(null)
  }

  const handleDividerMouseDown = (e) => {
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
    try { if (currentAudioRef.current) currentAudioRef.current.stop() } catch {}
    setMessages([])
    setImages({})
    setViewIndex(null)
    setLastMessages({ A: '', B: '' })
    setAvatarImages({ A: null, B: null })
    setAvatarLoading({ A: false, B: false })
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
    setTopic('')
    setSpeaking(null)
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
    <div className={`h-full flex flex-col gap-3 ${draggingSplit ? 'dragging-split' : ''}`}>
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
        .dragging-split * { user-select: none !important; cursor: col-resize !important; }
      `}</style>

      {/* Avatar stage */}
      <div className="flex gap-4 shrink-0">
        <AIAvatar
          persona="A"
          isSpeaking={speaking === 'A'}
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
        />
        <div className="flex flex-col items-center justify-center gap-2 px-2">
          {!running && <div className="text-gray-600 text-xs font-medium">VS</div>}
          {running && (
            <button
              onClick={handleInterrupt}
              title={listening ? 'Cancel listening' : 'Interrupt & redirect'}
              className={`rounded-full flex flex-col items-center justify-center gap-1 transition-all cursor-pointer font-medium
                ${inputMode === 'voice' ? 'w-16 h-16 text-xl' : 'w-10 h-10 text-base'}
                ${listening
                  ? 'bg-red-600 animate-pulse text-white ring-2 ring-red-400 shadow-lg shadow-red-900'
                  : inputMode === 'voice'
                    ? 'bg-indigo-700 hover:bg-indigo-600 text-white ring-2 ring-indigo-500 shadow-lg shadow-indigo-900'
                    : 'bg-gray-700 hover:bg-gray-500 text-gray-300'}`}
            >
              <span>{listening ? '⏹' : '🎤'}</span>
              {inputMode === 'voice' && !listening && <span className="text-[9px] font-semibold tracking-wide opacity-70">SPEAK</span>}
            </button>
          )}
          {listening && interimText && (
            <p className="text-xs text-green-400 text-center max-w-[72px] italic leading-tight line-clamp-3">{interimText}</p>
          )}
          {running && speaking && !listening && (
            <div className="flex gap-0.5">
              {[0,1,2].map(i => (
                <span key={i} className="w-1 h-1 bg-gray-500 rounded-full animate-bounce" style={{ animationDelay: `${i * 150}ms` }} />
              ))}
            </div>
          )}
        </div>
        <AIAvatar
          persona="B"
          isSpeaking={speaking === 'B'}
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
        />
      </div>

      {/* Main area — fills remaining height */}
      <div className="flex-1 flex min-h-0" ref={mainAreaRef}>

        {/* Left: controls + transcript */}
        <div style={{ width: `${splitPercent}%` }} className="shrink-0 bg-gray-900 rounded-xl p-4 flex flex-col gap-3 min-h-0">
          <div className="flex gap-2 shrink-0">
            {/* Type / Voice toggle */}
            <button
              onClick={() => setInputMode(m => m === 'type' ? 'voice' : 'type')}
              disabled={running}
              title={inputMode === 'type' ? 'Switch to voice input' : 'Switch to text input'}
              className={`px-3 py-2 rounded-xl text-sm font-medium transition-colors cursor-pointer disabled:opacity-40 shrink-0
                ${inputMode === 'voice' ? 'bg-indigo-700 text-white' : 'bg-gray-700 text-gray-400 hover:bg-gray-600'}`}
            >{inputMode === 'voice' ? '🎤 Voice' : '⌨️ Type'}</button>

            {/* Topic input — text or voice */}
            {inputMode === 'type' ? (
              <input
                value={topic}
                onChange={e => setTopic(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && start()}
                placeholder="Give them a topic…"
                disabled={running}
                className="flex-1 bg-gray-800 border border-gray-700 rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-indigo-500 placeholder-gray-500 disabled:opacity-50"
              />
            ) : (
              <button
                onClick={() => !running && startListening(text => setTopic(text))}
                disabled={running}
                className={`flex-1 rounded-xl px-3 py-2 text-sm text-left transition-all cursor-pointer disabled:opacity-50
                  ${listening && !running
                    ? 'bg-red-900 border border-red-600 text-red-300 animate-pulse'
                    : topic
                      ? 'bg-gray-800 border border-indigo-600 text-white hover:border-indigo-400'
                      : 'bg-gray-800 border border-dashed border-gray-600 text-gray-500 hover:border-gray-400'}`}
              >
                {listening && !running
                  ? (interimText || 'Listening…')
                  : topic || 'Tap to speak your topic…'}
              </button>
            )}

            {running ? (
              <div className="flex items-center gap-1.5 px-3 py-2 bg-gray-800 border border-gray-700 rounded-xl text-sm shrink-0">
                <span className="w-1.5 h-1.5 bg-green-400 rounded-full animate-pulse" />
                <span className="text-gray-300 font-mono">{formatTime(elapsed)}</span>
                <span className="text-gray-600">/</span>
                <span className="text-gray-500 font-mono">60:00</span>
              </div>
            ) : paused ? (
              <div className="flex items-center gap-1.5 px-3 py-2 bg-gray-800 border border-yellow-700 rounded-xl text-sm shrink-0">
                <span className="w-1.5 h-1.5 bg-yellow-400 rounded-full" />
                <span className="text-yellow-300 font-mono">{formatTime(elapsed)}</span>
                <span className="text-gray-600">/</span>
                <span className="text-gray-500 font-mono">60:00</span>
              </div>
            ) : (
              <div className="flex items-center gap-1.5 px-3 py-2 bg-gray-800 border border-gray-700 rounded-xl text-sm shrink-0 text-gray-500">
                <span>⏱</span>
                <span>up to 60 min</span>
              </div>
            )}
            <button
              onClick={() => { setMuted(m => !m); if (!muted && currentAudioRef.current) currentAudioRef.current.pause() }}
              title={muted ? 'Unmute' : 'Mute'}
              className={`px-3 py-2 rounded-xl text-sm transition-colors cursor-pointer ${muted ? 'bg-gray-700 text-gray-400' : 'bg-green-900 text-green-300'}`}
            >
              {muted ? '🔇' : '🔊'}
            </button>
            <button
              onClick={() => setImagesEnabled(m => !m)}
              title={imagesEnabled ? 'Disable image generation' : 'Enable image generation'}
              className={`px-3 py-2 rounded-xl text-sm transition-colors cursor-pointer ${imagesEnabled ? 'bg-violet-900 text-violet-300' : 'bg-gray-700 text-gray-500 line-through'}`}
            >
              🖼️
            </button>
            {!running && !paused && (
              <button
                onClick={randomise}
                disabled={randomising}
                title="Randomise characters and topic"
                className="px-3 py-2 bg-amber-700 hover:bg-amber-600 disabled:opacity-40 rounded-xl text-sm font-medium transition-colors cursor-pointer shrink-0"
              >
                {randomising ? '⏳' : '🎲'}
              </button>
            )}
            {running ? (
              <button onClick={pause} className="px-4 py-2 bg-yellow-700 hover:bg-yellow-600 rounded-xl text-sm font-medium transition-colors cursor-pointer shrink-0">
                Pause
              </button>
            ) : (
              <button onClick={start} disabled={!topic.trim()} className={`px-4 py-2 rounded-xl text-sm font-medium transition-colors cursor-pointer shrink-0 disabled:opacity-40
                ${paused ? 'bg-green-700 hover:bg-green-600' : 'bg-indigo-600 hover:bg-indigo-500'}`}>
                {paused ? 'Resume' : 'Start'}
              </button>
            )}
            {(messages.length > 0 || paused) && !running && (
              <button onClick={reset} className="px-4 py-2 bg-gray-700 hover:bg-gray-600 rounded-xl text-sm transition-colors cursor-pointer shrink-0">
                Reset
              </button>
            )}
          </div>

          {/* Conversation transcript — scrolls within panel */}
          {messages.length > 0 && (
            <div className="flex-1 overflow-y-auto space-y-3 pr-1 min-h-0">
              {messages.map((msg, i) => {
                if (msg.persona === 'user') {
                  return (
                    <div key={i} className="flex gap-3">
                      <div className="w-2 rounded-full shrink-0 mt-1 bg-green-400" style={{ minHeight: '1rem' }} />
                      <div className="rounded-2xl px-4 py-2.5 text-sm flex-1 bg-green-950 text-green-100 ring-1 ring-green-700">
                        <span className="text-xs font-semibold opacity-60 block mb-1">You (redirecting)</span>
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
                    <div className={`rounded-2xl px-4 py-2.5 text-sm flex-1 ${p.color} ${isActive ? `ring-1 ${p.ring}` : ''}`}>
                      <span className="text-xs font-semibold opacity-60 block mb-1">{names[msg.persona]}</span>
                      {msg.content}
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
              <div ref={bottomRef} />
            </div>
          )}

          {error && <p className="text-red-400 text-xs shrink-0">{error}</p>}
        </div>

        {/* Drag divider */}
        <div
          className="flex items-center justify-center cursor-col-resize shrink-0 select-none group px-1"
          style={{ width: '12px' }}
          onMouseDown={handleDividerMouseDown}
        >
          <div className="w-1 h-full rounded-full bg-gray-700 group-hover:bg-indigo-500 transition-colors duration-150" />
        </div>

        {/* Right: image panel — fills all remaining space */}
        <div className="flex-1 flex flex-col gap-3 min-w-0 min-h-0">

          {/* Main image — fills height */}
          <div className="flex-1 bg-gray-900 rounded-xl overflow-hidden relative min-h-0">
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
