import { useState, useRef, useEffect } from 'react'

const PERSONAS = {
  A: {
    label: 'Gemini A',
    color: 'bg-blue-900 text-blue-100',
    dot: 'bg-blue-400',
    ring: 'ring-blue-400',
    glow: 'shadow-blue-500/50',
    barColor: 'bg-blue-400',
    avatarBg: 'bg-blue-950',
    systemPrompt: 'You are in a discussion with another AI. Be curious, thoughtful, and build on what was said. Keep each response to 2-3 sentences.',
    voiceIndex: 0,
    pitch: 1.1,
    rate: 0.95,
    emoji: '🤖',
  },
  B: {
    label: 'Gemini B',
    color: 'bg-purple-900 text-purple-100',
    dot: 'bg-purple-400',
    ring: 'ring-purple-400',
    glow: 'shadow-purple-500/50',
    barColor: 'bg-purple-400',
    avatarBg: 'bg-purple-950',
    systemPrompt: 'You are in a discussion with another AI. Push back gently, offer new angles, and ask interesting questions. Keep each response to 2-3 sentences.',
    voiceIndex: 1,
    pitch: 0.85,
    rate: 1.05,
    emoji: '🧠',
  },
}

const BAR_HEIGHTS = [30, 60, 45, 80, 55, 70, 35, 65, 50, 75, 40, 60]

function AIAvatar({ persona, isSpeaking, lastMessage }) {
  const p = PERSONAS[persona]
  return (
    <div className={`flex-1 rounded-2xl p-5 ${p.avatarBg} flex flex-col items-center gap-3 transition-all duration-300
      ${isSpeaking ? `ring-2 ${p.ring} shadow-xl ${p.glow}` : 'ring-1 ring-white/10'}`}>

      {/* Face */}
      <div className={`w-20 h-20 rounded-full flex items-center justify-center text-4xl
        ${p.avatarBg} ring-2 ${isSpeaking ? p.ring : 'ring-white/20'}
        transition-all duration-300 ${isSpeaking ? 'scale-110' : 'scale-100'}`}>
        {p.emoji}
      </div>

      <span className="text-sm font-semibold text-white/80">{p.label}</span>

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

async function speak(text, personaKey, muted, currentAudioRef) {
  if (muted) return
  const res = await fetch('http://localhost:3001/api/tts', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ text, persona: personaKey }),
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

export default function GeminiSelfChatAudio() {
  const [topic, setTopic] = useState('')
  const [turns, setTurns] = useState(6)
  const [messages, setMessages] = useState([])
  const [images, setImages] = useState({})  // index -> data URL
  const [viewIndex, setViewIndex] = useState(null)
  const [running, setRunning] = useState(false)
  const [muted, setMuted] = useState(false)
  const [error, setError] = useState(null)
  const currentAudioRef = useRef(null)
  const [speaking, setSpeaking] = useState(null)
  const [lastMessages, setLastMessages] = useState({ A: '', B: '' })
  const bottomRef = useRef(null)
  const stopRef = useRef(false)

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

  const callTurn = async (persona, history, message) => {
    const res = await fetch('http://localhost:3001/api/self-chat-turn', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ systemPrompt: PERSONAS[persona].systemPrompt, history, message }),
    })
    const data = await res.json()
    if (data.error) throw new Error(data.error)
    return data.reply
  }

  const start = async () => {
    if (!topic.trim() || running) return
    setMessages([])
    setImages({})
    setViewIndex(null)
    setLastMessages({ A: '', B: '' })
    setError(null)
    setRunning(true)
    stopRef.current = false
    try { if (currentAudioRef.current) currentAudioRef.current.stop() } catch {}

    const historyA = []
    const historyB = []
    let lastMessage = `Let's discuss: ${topic.trim()}`
    let currentTurn = 'A'

    try {
      for (let i = 0; i < turns; i++) {
        if (stopRef.current) break

        const reply = await callTurn(currentTurn, currentTurn === 'A' ? historyA : historyB, lastMessage)

        const activeHistory = currentTurn === 'A' ? historyA : historyB
        activeHistory.push({ role: 'user', content: lastMessage })
        activeHistory.push({ role: 'model', content: reply })

        const msgIndex = i
        setMessages(prev => [...prev, { persona: currentTurn, content: reply }])
        setLastMessages(prev => ({ ...prev, [currentTurn]: reply }))

        // Generate image in parallel with speech
        const imagePrompt = `Cinematic conceptual illustration representing this idea: "${reply.slice(0, 200)}". Topic: ${topic}. Dramatic lighting, digital art style.`
        const imagePromise = fetch('http://localhost:3001/api/image', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ prompt: imagePrompt }),
        }).then(r => r.json()).then(data => {
          if (data.error) {
            console.error('Image API error:', data.error)
          } else if (data.imageData) {
            setImages(prev => ({ ...prev, [msgIndex]: `data:${data.mimeType};base64,${data.imageData}` }))
          }
        }).catch(err => console.error('Image fetch error:', err))

        setSpeaking(currentTurn)
        await Promise.all([
          speak(reply, currentTurn, muted, currentAudioRef),
          imagePromise,
        ])
        setSpeaking(null)

        if (stopRef.current) break

        lastMessage = reply
        currentTurn = currentTurn === 'A' ? 'B' : 'A'
      }
    } catch (err) {
      setError(err.message)
    } finally {
      setRunning(false)
      setSpeaking(null)
    }
  }

  const stop = () => {
    stopRef.current = true
    try { if (currentAudioRef.current) currentAudioRef.current.stop() } catch {}
    setSpeaking(null)
  }

  const reset = () => {
    try { if (currentAudioRef.current) currentAudioRef.current.stop() } catch {}
    setMessages([])
    setImages({})
    setViewIndex(null)
    setLastMessages({ A: '', B: '' })
    setError(null)
    setTopic('')
    setSpeaking(null)
  }

  return (
    <div className="h-full flex flex-col gap-3">
      <style>{`
        @keyframes soundBar {
          from { transform: scaleY(0.3); }
          to { transform: scaleY(1); }
        }
        @keyframes fadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }
      `}</style>

      {/* Avatar stage */}
      <div className="flex gap-4 shrink-0">
        <AIAvatar persona="A" isSpeaking={speaking === 'A'} lastMessage={lastMessages.A} />
        <div className="flex flex-col items-center justify-center gap-2 px-2">
          <div className="text-gray-600 text-xs font-medium">VS</div>
          {running && speaking && (
            <div className="flex gap-0.5">
              {[0,1,2].map(i => (
                <span key={i} className="w-1 h-1 bg-gray-500 rounded-full animate-bounce" style={{ animationDelay: `${i * 150}ms` }} />
              ))}
            </div>
          )}
        </div>
        <AIAvatar persona="B" isSpeaking={speaking === 'B'} lastMessage={lastMessages.B} />
      </div>

      {/* Main area — fills remaining height */}
      <div className="flex-1 flex gap-4 min-h-0">

        {/* Left: controls + transcript */}
        <div className="w-[420px] shrink-0 bg-gray-900 rounded-xl p-4 flex flex-col gap-3 min-h-0">
          <div className="flex gap-2 shrink-0">
            <input
              value={topic}
              onChange={e => setTopic(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && start()}
              placeholder="Give them a topic…"
              disabled={running}
              className="flex-1 bg-gray-800 border border-gray-700 rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-indigo-500 placeholder-gray-500 disabled:opacity-50"
            />
            <select
              value={turns}
              onChange={e => setTurns(Number(e.target.value))}
              disabled={running}
              className="bg-gray-800 border border-gray-700 rounded-xl px-3 py-2 text-sm focus:outline-none disabled:opacity-50"
            >
              {[4, 6, 8, 10].map(n => (
                <option key={n} value={n}>{n} turns</option>
              ))}
            </select>
            <button
              onClick={() => { setMuted(m => !m); if (!muted && currentAudioRef.current) currentAudioRef.current.pause() }}
              className={`px-3 py-2 rounded-xl text-sm transition-colors cursor-pointer ${muted ? 'bg-gray-700 text-gray-400' : 'bg-green-900 text-green-300'}`}
            >
              {muted ? '🔇' : '🔊'}
            </button>
            {running ? (
              <button onClick={stop} className="px-4 py-2 bg-red-700 hover:bg-red-600 rounded-xl text-sm font-medium transition-colors cursor-pointer shrink-0">
                Stop
              </button>
            ) : (
              <button onClick={start} disabled={!topic.trim()} className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-40 rounded-xl text-sm font-medium transition-colors cursor-pointer shrink-0">
                Start
              </button>
            )}
            {messages.length > 0 && !running && (
              <button onClick={reset} className="px-4 py-2 bg-gray-700 hover:bg-gray-600 rounded-xl text-sm transition-colors cursor-pointer shrink-0">
                Reset
              </button>
            )}
          </div>

          {/* Conversation transcript — scrolls within panel */}
          {messages.length > 0 && (
            <div className="flex-1 overflow-y-auto space-y-3 pr-1 min-h-0">
              {messages.map((msg, i) => {
                const p = PERSONAS[msg.persona]
                const isActive = speaking === msg.persona && i === messages.length - 1
                return (
                  <div key={i} className="flex gap-3">
                    <div className={`w-2 rounded-full shrink-0 mt-1 ${p.dot} ${isActive ? 'animate-pulse' : ''}`} style={{ minHeight: '1rem' }} />
                    <div className={`rounded-2xl px-4 py-2.5 text-sm flex-1 ${p.color} ${isActive ? `ring-1 ${p.ring}` : ''}`}>
                      <span className="text-xs font-semibold opacity-60 block mb-1">{p.label}</span>
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

        {/* Right: image panel — fills all remaining space */}
        <div className="flex-1 flex flex-col gap-3 min-w-0 min-h-0">

          {/* Main image — fills height */}
          <div className="flex-1 bg-gray-900 rounded-xl overflow-hidden relative min-h-0">
            {displayImage ? (
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
            {displayIndex !== null && messages[displayIndex] && (
              <div className="absolute bottom-0 left-0 right-0 px-4 py-2 bg-black/50 flex items-center gap-2">
                <div className={`w-2 h-2 rounded-full ${PERSONAS[messages[displayIndex].persona].dot}`} />
                <span className="text-xs text-white/70">
                  Turn {displayIndex + 1} · {PERSONAS[messages[displayIndex].persona].label}
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
