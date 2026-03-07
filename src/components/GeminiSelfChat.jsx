import { useState, useRef, useEffect } from 'react'

const PERSONAS = {
  A: {
    label: 'Gemini A',
    color: 'bg-blue-900 text-blue-100',
    dot: 'bg-blue-400',
    systemPrompt: 'You are in a discussion with another AI. Be curious, thoughtful, and build on what was said. Keep each response to 2-3 sentences.',
  },
  B: {
    label: 'Gemini B',
    color: 'bg-purple-900 text-purple-100',
    dot: 'bg-purple-400',
    systemPrompt: 'You are in a discussion with another AI. Push back gently, offer new angles, and ask interesting questions. Keep each response to 2-3 sentences.',
  },
}

export default function GeminiSelfChat() {
  const [topic, setTopic] = useState('')
  const [turns, setTurns] = useState(6)
  const [messages, setMessages] = useState([])
  const [running, setRunning] = useState(false)
  const [error, setError] = useState(null)
  const bottomRef = useRef(null)
  const stopRef = useRef(false)

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  const callTurn = async (persona, history, message) => {
    const res = await fetch('http://localhost:3001/api/self-chat-turn', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        systemPrompt: PERSONAS[persona].systemPrompt,
        history,
        message,
      }),
    })
    const data = await res.json()
    if (data.error) throw new Error(data.error)
    return data.reply
  }

  const start = async () => {
    if (!topic.trim() || running) return
    setMessages([])
    setError(null)
    setRunning(true)
    stopRef.current = false

    // Each side maintains its own history
    const historyA = []
    const historyB = []
    let lastMessage = `Let's discuss: ${topic.trim()}`
    let currentTurn = 'A'

    try {
      for (let i = 0; i < turns; i++) {
        if (stopRef.current) break

        const reply = await callTurn(currentTurn, currentTurn === 'A' ? historyA : historyB, lastMessage)

        // Update that side's history
        const activeHistory = currentTurn === 'A' ? historyA : historyB
        activeHistory.push({ role: 'user', content: lastMessage })
        activeHistory.push({ role: 'model', content: reply })

        setMessages(prev => [...prev, { persona: currentTurn, content: reply }])

        lastMessage = reply
        currentTurn = currentTurn === 'A' ? 'B' : 'A'

        // Small pause so it feels like a real conversation
        await new Promise(r => setTimeout(r, 400))
      }
    } catch (err) {
      setError(err.message)
    } finally {
      setRunning(false)
    }
  }

  const stop = () => { stopRef.current = true }

  const reset = () => {
    setMessages([])
    setError(null)
    setTopic('')
  }

  return (
    <div className="bg-gray-900 rounded-xl flex flex-col gap-4 p-4">
      <div>
        <h2 className="text-lg font-semibold">Gemini vs Gemini</h2>
        <p className="text-gray-400 text-sm mt-0.5">Two Gemini instances discuss a topic with each other.</p>
      </div>

      {/* Controls */}
      <div className="flex gap-2">
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

      {/* Conversation */}
      {messages.length > 0 && (
        <div className="space-y-3 max-h-[800px] overflow-y-auto pr-1">
          {messages.map((msg, i) => {
            const p = PERSONAS[msg.persona]
            return (
              <div key={i} className="flex gap-3">
                <div className={`w-2 rounded-full shrink-0 mt-1 ${p.dot}`} style={{ minHeight: '1rem' }} />
                <div className={`rounded-2xl px-4 py-2.5 text-sm flex-1 ${p.color}`}>
                  <span className="text-xs font-semibold opacity-60 block mb-1">{p.label}</span>
                  {msg.content}
                </div>
              </div>
            )
          })}

          {running && (
            <div className="flex gap-3">
              <div className="w-2 rounded-full shrink-0 mt-1 bg-gray-600" style={{ minHeight: '1rem' }} />
              <div className="bg-gray-800 rounded-2xl px-4 py-3">
                <div className="flex gap-1">
                  <span className="w-1.5 h-1.5 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                  <span className="w-1.5 h-1.5 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                  <span className="w-1.5 h-1.5 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                </div>
              </div>
            </div>
          )}

          <div ref={bottomRef} />
        </div>
      )}

      {error && <p className="text-red-400 text-xs">{error}</p>}
    </div>
  )
}
