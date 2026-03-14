import { useEffect, useState, useRef, useCallback } from 'react'
import { useParams, Link } from 'react-router-dom'
import { getDebateWithMessages } from '../lib/debateDb'

const TURN_FALLBACK_MS = 5000 // per-turn delay when no audio stored

const S = {
  A:    { label: 'text-blue-400',   border: 'border-blue-800/60',   bg: 'bg-blue-950/40',   dot: 'bg-blue-400',   ring: 'ring-blue-500' },
  B:    { label: 'text-purple-400', border: 'border-purple-800/60', bg: 'bg-purple-950/40', dot: 'bg-purple-400', ring: 'ring-purple-500' },
  host: { label: 'text-amber-400',  border: 'border-amber-800/40',  bg: 'bg-amber-950/30',  dot: 'bg-amber-400',  ring: 'ring-amber-500' },
}
const style = (speaker) => S[speaker] ?? S.host

function SpeakingBars({ color }) {
  return (
    <div className="flex items-end gap-px shrink-0" style={{ height: '14px', width: '10px' }}>
      {[0, 1, 2].map(i => (
        <div key={i} className={`w-0.5 rounded-full speaking-bar ${color}`}
          style={{ height: '100%', animationDelay: `${i * 0.15}s` }} />
      ))}
    </div>
  )
}

function VerdictCard({ summary, nameA, nameB }) {
  if (!summary?.winner) return null
  const winner = summary.winner === 'draw' ? 'Draw' : summary.winner === 'A' ? nameA : nameB
  return (
    <div className="rounded-xl overflow-hidden border border-amber-700/30 bg-gradient-to-b from-amber-950/50 to-gray-900/60 verdict-reveal">
      <div className="px-4 py-2.5 bg-amber-900/20 border-b border-amber-700/20 flex items-center gap-3">
        <span className="text-amber-400 text-[10px] font-mono font-semibold tracking-widest uppercase">Verdict</span>
        <div className="flex-1 h-px bg-amber-700/20" />
        {summary.confidence && (
          <span className="text-amber-500/70 text-[10px] font-mono">{summary.confidence}% confidence</span>
        )}
      </div>
      <div className="px-4 py-4 flex flex-col gap-3">
        <div>
          <p className="text-[11px] text-gray-500 font-mono uppercase tracking-wider">{nameA} <span className="text-gray-700">vs</span> {nameB}</p>
        </div>
        <div className="flex items-baseline gap-2 flex-wrap">
          <span className="text-lg font-bold text-white">{winner}</span>
          <span className="text-amber-400/50 text-sm">{summary.winner === 'draw' ? '— no winner' : 'wins this debate'}</span>
        </div>
        {summary.confidence && (
          <div className="h-0.5 rounded-full bg-gray-800 overflow-hidden">
            <div className="h-full rounded-full bg-gradient-to-r from-amber-700 to-amber-400"
              style={{ width: `${Math.min(100, summary.confidence)}%` }} />
          </div>
        )}
        {summary.winnerArgs?.length > 0 && (
          <div className="flex flex-col gap-1.5">
            {summary.winnerArgs.map((arg, i) => (
              <div key={i} className="flex gap-2 text-sm text-gray-300 leading-snug">
                <span className="text-amber-600/70 shrink-0 font-mono text-xs mt-0.5">—</span>
                <span>{arg}</span>
              </div>
            ))}
          </div>
        )}
        {summary.analysis && (
          <p className="text-xs text-gray-500 italic leading-relaxed border-t border-white/5 pt-2.5">{summary.analysis}</p>
        )}
      </div>
    </div>
  )
}

export default function DebateReplayPage() {
  const { debateId } = useParams()
  const [debate, setDebate] = useState(null)
  const [messages, setMessages] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [status, setStatus] = useState('ready') // ready | playing | paused | ended
  const [activeTurn, setActiveTurn] = useState(-1)
  const [shownCount, setShownCount] = useState(0)
  const [currentImage, setCurrentImage] = useState(null)
  const [copied, setCopied] = useState(false)

  const stopRef = useRef(false)
  const pauseRef = useRef(false)
  const activeTurnRef = useRef(-1)
  const messagesRef = useRef([])
  const audioRef = useRef(null)
  const bottomRef = useRef(null)

  useEffect(() => {
    getDebateWithMessages(debateId)
      .then(({ debate, messages }) => {
        setDebate(debate)
        setMessages(messages)
        messagesRef.current = messages
        // Pre-load the first image if available
        const firstImg = messages.find(m => m.image_url)
        if (firstImg) setCurrentImage(firstImg.image_url)
      })
      .catch(err => setError(err.message))
      .finally(() => setLoading(false))
  }, [debateId])

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [shownCount])

  const stopAudio = () => {
    if (audioRef.current) {
      audioRef.current.pause()
      audioRef.current.src = ''
      audioRef.current = null
    }
  }

  const playAudioUrl = (url) => new Promise((resolve) => {
    stopAudio()
    const audio = new Audio(url)
    audioRef.current = audio
    audio.onended = resolve
    audio.onerror = resolve  // fall through on error
    audio.play().catch(resolve)
  })

  const sleep = (ms) => new Promise((resolve) => {
    const id = setInterval(() => {
      if (stopRef.current || !pauseRef.current) {
        clearInterval(id)
        resolve()
      }
    }, 100)
    setTimeout(() => { clearInterval(id); resolve() }, ms)
  })

  const waitWhilePaused = () => new Promise((resolve) => {
    const id = setInterval(() => {
      if (stopRef.current || !pauseRef.current) {
        clearInterval(id)
        resolve()
      }
    }, 100)
  })

  const runPlayback = useCallback(async (msgs, startIndex) => {
    for (let i = startIndex; i < msgs.length; i++) {
      if (stopRef.current) break

      // Wait if paused
      if (pauseRef.current) await waitWhilePaused()
      if (stopRef.current) break

      activeTurnRef.current = i
      setActiveTurn(i)
      setShownCount(i + 1)

      const msg = msgs[i]
      if (msg.image_url) setCurrentImage(msg.image_url)

      if (msg.audio_url) {
        await playAudioUrl(msg.audio_url)
      } else {
        await sleep(TURN_FALLBACK_MS)
      }

      if (stopRef.current) break
      if (pauseRef.current) await waitWhilePaused()
    }

    if (!stopRef.current) {
      setStatus('ended')
      setActiveTurn(-1)
    }
  }, [])

  const handlePlay = () => {
    const msgs = messagesRef.current
    if (!msgs.length) return
    stopRef.current = false
    pauseRef.current = false

    if (status === 'ended') {
      // Restart
      activeTurnRef.current = -1
      setActiveTurn(-1)
      setShownCount(0)
      setCurrentImage(msgs.find(m => m.image_url)?.image_url ?? null)
      setStatus('playing')
      runPlayback(msgs, 0)
    } else if (status === 'paused') {
      pauseRef.current = false
      setStatus('playing')
    } else {
      // Fresh start from current position
      const start = Math.max(0, activeTurnRef.current + (status === 'ready' ? 0 : 1))
      setStatus('playing')
      runPlayback(msgs, start === messagesRef.current.length ? 0 : start)
    }
  }

  const handlePause = () => {
    pauseRef.current = true
    stopAudio()
    setStatus('paused')
  }

  const handleStop = () => {
    stopRef.current = true
    pauseRef.current = false
    stopAudio()
    setStatus('ready')
    setActiveTurn(-1)
    setShownCount(0)
    setCurrentImage(messagesRef.current.find(m => m.image_url)?.image_url ?? null)
    activeTurnRef.current = -1
  }

  const handleCopy = () => {
    navigator.clipboard.writeText(window.location.href).then(() => {
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    })
  }

  // Cleanup on unmount
  useEffect(() => () => { stopRef.current = true; stopAudio() }, [])

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-950 text-gray-100 flex items-center justify-center">
        <div className="flex items-center gap-2 text-gray-400 text-sm">
          <span className="w-4 h-4 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin" />
          Loading debate…
        </div>
      </div>
    )
  }

  if (error || !debate) {
    return (
      <div className="min-h-screen bg-gray-950 text-gray-100 flex items-center justify-center p-6">
        <div className="max-w-md text-center space-y-3">
          <p className="text-lg font-semibold text-white">Debate not found</p>
          <p className="text-sm text-gray-400">{error || 'This debate may have been deleted or the link is invalid.'}</p>
          <Link to="/" className="inline-block mt-2 px-4 py-2 rounded-lg bg-indigo-700 hover:bg-indigo-600 text-sm font-medium transition-colors">
            Go to AI Debate Studio
          </Link>
        </div>
      </div>
    )
  }

  const nameA = debate.name_a || 'Debater A'
  const nameB = debate.name_b || 'Debater B'
  const visibleMessages = messages.slice(0, shownCount || (status === 'ready' ? 0 : undefined))
  const totalTurns = messages.length
  const hasAudio = messages.some(m => m.audio_url)

  return (
    <div className="min-h-screen bg-gray-950 text-gray-100 flex flex-col font-sans">

      {/* Header */}
      <header className="shrink-0 border-b border-white/6 px-4 sm:px-6 py-3 flex items-center gap-3 bg-gray-950/90 backdrop-blur sticky top-0 z-10">
        <Link to="/" className="text-sm text-indigo-300 hover:text-indigo-200 transition-colors shrink-0">
          ← Studio
        </Link>
        <div className="flex-1 min-w-0">
          <p className="text-xs text-gray-500 font-mono uppercase tracking-wider truncate">
            {nameA} <span className="text-gray-700">vs</span> {nameB}
          </p>
        </div>
        {/* Status badge */}
        {status === 'playing' && (
          <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-red-950/50 border border-red-800/40 shrink-0">
            <span className="w-1.5 h-1.5 rounded-full bg-red-500 live-dot" />
            <span className="text-red-400 text-[10px] font-mono font-semibold tracking-widest uppercase">Replay</span>
          </div>
        )}
        <button onClick={handleCopy}
          className="shrink-0 px-3 py-1.5 rounded-lg border border-gray-700 bg-gray-900 text-xs font-medium text-gray-300 hover:bg-gray-800 transition-colors cursor-pointer">
          {copied ? 'Copied!' : 'Share'}
        </button>
      </header>

      {/* Debate title */}
      <div className="shrink-0 px-4 sm:px-6 py-4 border-b border-white/4">
        <h1 className="text-base sm:text-lg font-bold text-white leading-tight">{debate.topic}</h1>
        <p className="mt-0.5 text-sm text-gray-500">
          <span className="text-blue-400 font-medium">{nameA}</span>
          <span className="text-gray-700"> vs </span>
          <span className="text-purple-400 font-medium">{nameB}</span>
          {debate.created_at && (
            <span className="ml-2 text-gray-600 text-xs">· {new Date(debate.created_at).toLocaleDateString(undefined, { dateStyle: 'medium' })}</span>
          )}
        </p>
      </div>

      {/* Main area */}
      <div className="flex-1 flex flex-col lg:flex-row min-h-0">

        {/* Left: transcript */}
        <div className="flex-1 flex flex-col min-h-0 lg:border-r lg:border-white/5">

          {/* Transcript scroll area */}
          <div className="flex-1 overflow-y-auto px-4 sm:px-6 py-4 space-y-3">

            {status === 'ready' && messages.length > 0 && (
              <div className="flex flex-col items-center justify-center py-12 gap-4">
                <div className="w-12 h-12 rounded-full bg-indigo-700/20 border border-indigo-600/30 flex items-center justify-center">
                  <svg className="w-5 h-5 text-indigo-400 ml-0.5" fill="currentColor" viewBox="0 0 24 24">
                    <polygon points="5,3 19,12 5,21" />
                  </svg>
                </div>
                <p className="text-sm text-gray-500 text-center max-w-xs">
                  {hasAudio ? 'Press play to watch this debate with audio.' : 'Press play to read through this debate.'}
                </p>
              </div>
            )}

            {visibleMessages.map((msg, i) => {
              const s = style(msg.speaker)
              const isActive = i === activeTurn
              const speakerName = msg.speaker === 'A' ? nameA : msg.speaker === 'B' ? nameB : 'Host'
              return (
                <div key={msg.id}
                  className={`rounded-xl border overflow-hidden transition-all duration-300 ${s.border} ${s.bg}
                    ${isActive ? 'ring-1 ring-white/10 shadow-lg shadow-black/30' : 'opacity-80'}`}>
                  <div className="px-3 py-2.5">
                    <div className="flex items-center gap-2 mb-1.5">
                      {isActive ? (
                        <SpeakingBars color={s.dot} />
                      ) : (
                        <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${s.dot}`} />
                      )}
                      <span className={`text-xs font-semibold uppercase tracking-wide font-mono ${s.label}`}>
                        {speakerName}
                      </span>
                    </div>
                    <p className="text-sm text-gray-200 leading-relaxed">{msg.text}</p>
                  </div>
                </div>
              )
            })}

            {status === 'ended' && debate.summary && (
              <div className="pt-2">
                <VerdictCard summary={debate.summary} nameA={nameA} nameB={nameB} />
              </div>
            )}

            {status === 'ended' && (
              <div className="rounded-2xl border border-gray-700/60 bg-gray-900/80 p-5 text-center space-y-3 mt-2">
                <p className="text-sm font-semibold text-white">Create your own AI debate</p>
                <p className="text-xs text-gray-400">Pick any two figures, any topic.</p>
                <a href="/#signup"
                  className="inline-block px-5 py-2.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-sm font-semibold text-white transition-colors">
                  Start free →
                </a>
              </div>
            )}

            <div ref={bottomRef} />
          </div>

          {/* Controls bar */}
          <div className="shrink-0 border-t border-white/6 px-4 sm:px-6 py-3 bg-gray-950/80 backdrop-blur">
            <div className="flex items-center gap-3">

              {/* Play / Pause / Restart */}
              {status === 'playing' ? (
                <button onClick={handlePause}
                  className="flex items-center justify-center w-10 h-10 rounded-full bg-yellow-900/40 hover:bg-yellow-900/60 border border-yellow-700/40 text-yellow-300 transition-colors cursor-pointer shrink-0">
                  <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                    <rect x="6" y="4" width="4" height="16"/><rect x="14" y="4" width="4" height="16"/>
                  </svg>
                </button>
              ) : (
                <button onClick={handlePlay}
                  className="flex items-center justify-center w-10 h-10 rounded-full bg-indigo-700 hover:bg-indigo-600 text-white transition-colors cursor-pointer shrink-0">
                  <svg className="w-4 h-4 ml-0.5" fill="currentColor" viewBox="0 0 24 24">
                    <polygon points="5,3 19,12 5,21" />
                  </svg>
                </button>
              )}

              {/* Progress */}
              <div className="flex-1 flex flex-col gap-1.5 min-w-0">
                <div className="h-1 rounded-full bg-gray-800 overflow-hidden">
                  <div className="h-full rounded-full bg-indigo-600 transition-all duration-500"
                    style={{ width: totalTurns > 0 ? `${((shownCount) / totalTurns) * 100}%` : '0%' }} />
                </div>
                <p className="text-[10px] text-gray-600 font-mono">
                  {status === 'ready' ? `${totalTurns} turns` :
                   status === 'ended' ? 'Ended' :
                   `Turn ${shownCount} of ${totalTurns}`}
                </p>
              </div>

              {/* Stop / reset — only when active */}
              {(status === 'playing' || status === 'paused') && (
                <button onClick={handleStop}
                  className="flex items-center justify-center w-8 h-8 rounded-lg bg-gray-800/60 hover:bg-gray-800 border border-white/8 text-gray-500 hover:text-gray-300 transition-colors cursor-pointer shrink-0">
                  <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 24 24">
                    <rect x="4" y="4" width="16" height="16" rx="1"/>
                  </svg>
                </button>
              )}

              {status === 'ended' && (
                <button onClick={handlePlay}
                  className="px-3 py-1.5 rounded-lg text-xs font-medium border border-white/8 text-gray-400 hover:text-gray-200 hover:border-white/15 transition-colors cursor-pointer shrink-0">
                  Replay
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Right: image panel — hidden on mobile, visible on lg+ */}
        {currentImage && (
          <div className="hidden lg:flex lg:w-80 xl:w-96 shrink-0 flex-col bg-gray-900/50">
            <div className="flex-1 flex items-center justify-center p-4">
              <img
                src={currentImage}
                alt=""
                className="w-full rounded-xl object-cover shadow-2xl shadow-black/50 transition-opacity duration-500"
              />
            </div>
            {activeTurn >= 0 && messages[activeTurn] && (
              <div className="px-4 pb-4">
                <div className={`flex items-center gap-2 px-3 py-2 rounded-lg border ${style(messages[activeTurn].speaker).border} ${style(messages[activeTurn].speaker).bg}`}>
                  <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${style(messages[activeTurn].speaker).dot}`} />
                  <span className={`text-xs font-mono font-semibold uppercase tracking-wide ${style(messages[activeTurn].speaker).label}`}>
                    {messages[activeTurn].speaker === 'A' ? nameA : messages[activeTurn].speaker === 'B' ? nameB : 'Host'}
                  </span>
                </div>
              </div>
            )}
          </div>
        )}

      </div>

      {/* Mobile image strip — shown below controls when playing */}
      {currentImage && (status === 'playing' || status === 'paused') && (
        <div className="lg:hidden shrink-0 border-t border-white/5">
          <img src={currentImage} alt="" className="w-full max-h-48 object-cover" />
        </div>
      )}

    </div>
  )
}
