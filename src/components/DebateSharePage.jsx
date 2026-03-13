import { useEffect, useState } from 'react'
import { useParams, Link } from 'react-router-dom'
import { getDebateWithMessages } from '../lib/debateDb'

const STYLE_LABELS = {
  ai: 'AI Future', rhyme: 'Rhyme Battle', rap: 'Rap Battle',
  shakespeare: 'Shakespearean', pirate: 'Pirate Speak', eli5: 'ELI5',
  roast: 'Roast Battle', conspiracy: 'Conspiracy', haiku: 'Haiku',
  french: 'French', spanish: 'Spanish', german: 'German', japanese: 'Japanese',
}

function setMeta(property, content) {
  let el = document.querySelector(`meta[property="${property}"]`)
    || document.querySelector(`meta[name="${property}"]`)
  if (!el) {
    el = document.createElement('meta')
    el.setAttribute(property.startsWith('og:') || property.startsWith('twitter:') ? 'property' : 'name', property)
    document.head.appendChild(el)
  }
  el.setAttribute('content', content)
}

function updateOgTags({ title, description }) {
  document.title = title
  setMeta('og:title', title)
  setMeta('og:description', description)
  setMeta('og:url', window.location.href)
  setMeta('twitter:title', title)
  setMeta('twitter:description', description)
}

function SpeakerLabel({ speaker, nameA, nameB }) {
  if (speaker === 'host')    return <span className="text-xs font-semibold text-amber-400 uppercase tracking-wide">Host</span>
  if (speaker === 'user')    return <span className="text-xs font-semibold text-green-400 uppercase tracking-wide">Moderator</span>
  if (speaker === 'A')       return <span className="text-xs font-semibold text-blue-400 uppercase tracking-wide">{nameA}</span>
  if (speaker === 'B')       return <span className="text-xs font-semibold text-purple-400 uppercase tracking-wide">{nameB}</span>
  return <span className="text-xs font-semibold text-gray-400 uppercase tracking-wide">{speaker}</span>
}

function WinnerBadge({ summary, nameA, nameB }) {
  if (!summary?.winner) return null
  const label = summary.winner === 'draw' ? 'Draw'
    : summary.winner === 'A' ? nameA
    : nameB
  return (
    <div className="rounded-xl border border-indigo-700/60 bg-indigo-950/60 p-4">
      <p className="text-xs font-semibold text-indigo-300 uppercase tracking-wide mb-1">AI Verdict</p>
      <p className="text-lg font-bold text-white">Winner: {label}</p>
      {summary.winnerReasoning && (
        <p className="mt-1 text-sm text-gray-300">{summary.winnerReasoning}</p>
      )}
      {summary.keyArgumentsA && (
        <div className="mt-3 grid sm:grid-cols-2 gap-3">
          <div>
            <p className="text-xs text-blue-400 font-medium mb-1">{nameA}'s strongest argument</p>
            <p className="text-xs text-gray-300">{summary.keyArgumentsA}</p>
          </div>
          <div>
            <p className="text-xs text-purple-400 font-medium mb-1">{nameB}'s strongest argument</p>
            <p className="text-xs text-gray-300">{summary.keyArgumentsB}</p>
          </div>
        </div>
      )}
    </div>
  )
}

export default function DebateSharePage() {
  const { debateId } = useParams()
  const [debate, setDebate] = useState(null)
  const [messages, setMessages] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [copied, setCopied] = useState(false)

  useEffect(() => {
    getDebateWithMessages(debateId)
      .then(({ debate, messages }) => {
        setDebate(debate)
        setMessages(messages)
        const nameA = debate.name_a || 'Debater A'
        const nameB = debate.name_b || 'Debater B'
        const winner = debate.summary?.winner
        const winnerName = winner === 'draw' ? 'Draw' : winner === 'A' ? nameA : winner === 'B' ? nameB : null
        const title = `${nameA} vs ${nameB}: "${debate.topic}" — AI Debate Studio`
        const description = winnerName
          ? `${winnerName} won the debate on "${debate.topic}". See the full transcript and AI verdict.`
          : `${nameA} and ${nameB} debate "${debate.topic}". Read the full transcript.`
        updateOgTags({ title, description })
      })
      .catch(err => setError(err.message))
      .finally(() => setLoading(false))
  }, [debateId])

  const handleCopyLink = () => {
    navigator.clipboard.writeText(window.location.href).then(() => {
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    })
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-950 text-gray-100 flex items-center justify-center">
        <p className="text-sm text-gray-400">Loading debate...</p>
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
  const styleLabel = STYLE_LABELS[debate.style] ?? debate.style

  return (
    <div className="min-h-screen bg-gray-950 text-gray-100 font-sans">
      {/* Header */}
      <header className="border-b border-gray-800 px-4 sm:px-6 py-3 flex items-center justify-between gap-3">
        <Link to="/" className="text-sm font-semibold text-indigo-300 hover:text-indigo-200 transition-colors">
          ← AI Debate Studio
        </Link>
        <button
          onClick={handleCopyLink}
          className="px-3 py-1.5 rounded-lg border border-gray-700 bg-gray-900 text-xs font-medium text-gray-200 hover:bg-gray-800 transition-colors cursor-pointer"
        >
          {copied ? 'Copied!' : 'Copy Link'}
        </button>
      </header>

      <main className="max-w-2xl mx-auto px-4 sm:px-6 py-6 space-y-6">
        {/* Debate header */}
        <div>
          <div className="flex flex-wrap gap-2 mb-2">
            {styleLabel && (
              <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-indigo-900/60 text-indigo-300 border border-indigo-700/40">
                {styleLabel}
              </span>
            )}
            <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-gray-800 text-gray-400">
              {new Date(debate.created_at).toLocaleDateString(undefined, { dateStyle: 'medium' })}
            </span>
          </div>
          <h1 className="text-xl sm:text-2xl font-bold text-white leading-tight">{debate.topic}</h1>
          <p className="mt-1 text-sm text-gray-400">
            <span className="text-blue-400 font-medium">{nameA}</span>
            {' vs '}
            <span className="text-purple-400 font-medium">{nameB}</span>
          </p>
        </div>

        {/* Verdict */}
        {debate.summary && (
          <WinnerBadge summary={debate.summary} nameA={nameA} nameB={nameB} />
        )}

        {/* Transcript */}
        <div>
          <h2 className="text-sm font-semibold text-gray-400 uppercase tracking-wide mb-3">Transcript</h2>
          <div className="space-y-3">
            {messages.map((msg) => (
              <div
                key={msg.id}
                className={`rounded-xl p-3 border ${
                  msg.speaker === 'A'    ? 'border-blue-900/50 bg-blue-950/30' :
                  msg.speaker === 'B'    ? 'border-purple-900/50 bg-purple-950/30' :
                  msg.speaker === 'host' ? 'border-amber-900/40 bg-amber-950/20' :
                                           'border-green-900/40 bg-green-950/20'
                }`}
              >
                <SpeakerLabel speaker={msg.speaker} nameA={nameA} nameB={nameB} />
                <p className="mt-1 text-sm text-gray-200 leading-relaxed">{msg.text}</p>
              </div>
            ))}
          </div>
        </div>

        {/* CTA */}
        <div className="rounded-xl border border-gray-700 bg-gray-900 p-4 text-center space-y-2">
          <p className="text-sm font-medium text-gray-200">Want to run your own debate?</p>
          <Link
            to="/"
            className="inline-block px-4 py-2 rounded-lg bg-indigo-700 hover:bg-indigo-600 text-sm font-medium transition-colors"
          >
            Start a Debate
          </Link>
        </div>
      </main>
    </div>
  )
}
