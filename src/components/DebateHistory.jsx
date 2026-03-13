import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { getUserDebates } from '../lib/debateDb'

const STYLE_LABELS = {
  ai: 'AI Future', rhyme: 'Rhyme Battle', rap: 'Rap Battle',
  shakespeare: 'Shakespearean', pirate: 'Pirate Speak', eli5: 'ELI5',
  roast: 'Roast Battle', conspiracy: 'Conspiracy', haiku: 'Haiku',
  french: 'French', spanish: 'Spanish', german: 'German', japanese: 'Japanese',
}

function formatDate(iso) {
  return new Date(iso).toLocaleString(undefined, {
    dateStyle: 'medium',
    timeStyle: 'short',
  })
}

function CopyLinkButton({ debateId }) {
  const [copied, setCopied] = useState(false)
  const url = `${window.location.origin}/debate/${debateId}`

  const handleCopy = () => {
    navigator.clipboard.writeText(url).then(() => {
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    })
  }

  return (
    <button
      onClick={handleCopy}
      className="px-2.5 py-1 rounded-lg border border-gray-700 bg-gray-800 text-xs text-gray-300 hover:bg-gray-700 transition-colors cursor-pointer"
    >
      {copied ? 'Copied!' : 'Copy Link'}
    </button>
  )
}

export default function DebateHistory({ user }) {
  const [debates, setDebates] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    if (!user?.id) return
    setLoading(true)
    getUserDebates(user.id)
      .then(setDebates)
      .catch(err => setError(err.message))
      .finally(() => setLoading(false))
  }, [user?.id])

  if (loading) {
    return (
      <div className="flex items-center justify-center py-16 text-sm text-gray-400">
        Loading debate history...
      </div>
    )
  }

  if (error) {
    return (
      <div className="flex items-center justify-center py-16 text-sm text-red-400">
        Failed to load history: {error}
      </div>
    )
  }

  if (debates.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-center gap-2">
        <p className="text-gray-300 font-medium">No debates yet</p>
        <p className="text-sm text-gray-500">Start a debate in the Studio tab — it will appear here.</p>
      </div>
    )
  }

  return (
    <div className="max-w-3xl mx-auto space-y-3 py-2">
      <h2 className="text-lg font-semibold text-white">Your Debates</h2>
      <ul className="space-y-2">
        {debates.map(d => (
          <li key={d.id} className="rounded-xl border border-gray-700 bg-gray-900 p-4">
            <div className="flex flex-wrap items-start justify-between gap-2">
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-white truncate">{d.topic}</p>
                <div className="mt-1 flex flex-wrap gap-x-3 gap-y-0.5 text-xs text-gray-400">
                  {d.style && (
                    <span className="text-indigo-300">{STYLE_LABELS[d.style] ?? d.style}</span>
                  )}
                  <span>{formatDate(d.created_at)}</span>
                </div>
              </div>
              {d.summary?.winner && (
                <span className="shrink-0 px-2 py-0.5 rounded-full text-xs font-medium bg-indigo-900 text-indigo-200">
                  Winner: {d.summary.winner === 'draw' ? 'Draw' : d.summary.winner}
                </span>
              )}
            </div>
            {d.summary?.winnerReasoning && (
              <p className="mt-2 text-xs text-gray-400 line-clamp-2">{d.summary.winnerReasoning}</p>
            )}
            <div className="mt-3 flex gap-2">
              <Link
                to={`/debate/${d.id}`}
                className="px-2.5 py-1 rounded-lg border border-indigo-700/60 bg-indigo-950/40 text-xs text-indigo-300 hover:bg-indigo-900/40 transition-colors"
              >
                View
              </Link>
              <CopyLinkButton debateId={d.id} />
            </div>
          </li>
        ))}
      </ul>
    </div>
  )
}
