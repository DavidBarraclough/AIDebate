import GeminiSelfChatAudio from './components/GeminiSelfChatAudio'
import FeaturesHelpPage from './components/FeaturesHelpPage'
import { useEffect, useState } from 'react'

const GEMINI_KEY_STORAGE_KEY = 'gemini-user-api-key'

export default function App() {
  const [activeView, setActiveView] = useState('studio')
  const [apiKeyInput, setApiKeyInput] = useState('')
  const [userApiKey, setUserApiKey] = useState('')
  const [showApiKeyPanel, setShowApiKeyPanel] = useState(true)

  useEffect(() => {
    try {
      const stored = localStorage.getItem(GEMINI_KEY_STORAGE_KEY) || ''
      const trimmed = stored.trim()
      if (trimmed) {
        setUserApiKey(trimmed)
        setApiKeyInput(trimmed)
        setShowApiKeyPanel(false)
      } else {
        setShowApiKeyPanel(true)
      }
    } catch {
      setShowApiKeyPanel(true)
    }
  }, [])

  const saveUserApiKey = () => {
    const trimmed = apiKeyInput.trim()
    if (!trimmed) return
    try {
      localStorage.setItem(GEMINI_KEY_STORAGE_KEY, trimmed)
    } catch {}
    setUserApiKey(trimmed)
    setShowApiKeyPanel(false)
  }

  const clearUserApiKey = () => {
    try {
      localStorage.removeItem(GEMINI_KEY_STORAGE_KEY)
    } catch {}
    setUserApiKey('')
    setApiKeyInput('')
    setShowApiKeyPanel(true)
  }

  return (
    <div className="min-h-screen h-dvh flex flex-col bg-gray-950 text-gray-100 font-sans overflow-hidden">
      <header className="shrink-0 border-b border-gray-800 px-4 sm:px-6 py-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div>
            <h1 className="text-xl font-bold text-white">AI Debate Studio</h1>
            <p className="text-xs text-gray-400 mt-0.5">Structured voice debates with live visual context.</p>
          </div>
          <div className="flex items-center gap-2">
            <div className="inline-flex rounded-lg border border-gray-700 bg-gray-900 p-1">
              <button
                onClick={() => setActiveView('studio')}
                className={`px-3 py-1.5 text-sm rounded-md transition-colors cursor-pointer ${activeView === 'studio' ? 'bg-indigo-700 text-white' : 'text-gray-300 hover:bg-gray-800'}`}
              >
                Studio
              </button>
              <button
                onClick={() => setActiveView('help')}
                className={`px-3 py-1.5 text-sm rounded-md transition-colors cursor-pointer ${activeView === 'help' ? 'bg-indigo-700 text-white' : 'text-gray-300 hover:bg-gray-800'}`}
              >
                Features and Help
              </button>
            </div>
            {activeView === 'studio' && (
              <button
                onClick={() => setShowApiKeyPanel(v => !v)}
                className="px-3 py-1.5 rounded-lg border border-gray-700 bg-gray-900 text-xs font-medium text-gray-200 hover:bg-gray-800 transition-colors cursor-pointer"
              >
                {showApiKeyPanel ? 'Hide API Key' : 'Open API Key Setup'}
              </button>
            )}
          </div>
        </div>

        {activeView === 'studio' && showApiKeyPanel && (
          <div className="mt-3 rounded-xl border border-gray-700 bg-gray-900/80 p-3">
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-sm font-semibold text-gray-200">Studio Features</span>
              <span className={userApiKey ? 'text-xs text-green-300' : 'text-xs text-amber-300'}>
                {userApiKey ? 'Personal key active' : 'No personal key'}
              </span>
            </div>
            <p className="mt-2 text-xs text-gray-300 leading-relaxed">
              This is your personal Gemini API key. It lets the app call Gemini using your own quota/billing, which is useful when the shared server key is missing, rate-limited, or exhausted.
            </p>
            <div className="mt-2 flex flex-wrap items-center gap-2">
              <input
                type="password"
                value={apiKeyInput}
                onChange={e => setApiKeyInput(e.target.value)}
                placeholder="Gemini API key (optional)"
                className="flex-1 min-w-[220px] bg-gray-950 border border-gray-700 rounded-lg px-3 py-2 text-sm text-gray-200 focus:outline-none focus:border-indigo-500"
              />
              <button
                onClick={saveUserApiKey}
                disabled={!apiKeyInput.trim()}
                className="px-3 py-2 rounded-lg bg-indigo-700 hover:bg-indigo-600 disabled:bg-gray-700 disabled:text-gray-400 disabled:cursor-not-allowed text-sm font-medium transition-colors cursor-pointer"
              >
                Save Key
              </button>
              <button
                onClick={clearUserApiKey}
                disabled={!userApiKey}
                className="px-3 py-2 rounded-lg bg-gray-700 hover:bg-gray-600 disabled:bg-gray-700 disabled:text-gray-500 disabled:cursor-not-allowed text-sm transition-colors cursor-pointer"
              >
                Clear
              </button>
            </div>
            <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs">
              <span className={userApiKey ? 'text-green-300' : 'text-gray-400'}>
                {userApiKey ? 'Using personal key' : 'Using server default key'}
              </span>
              <span className="text-gray-500">Stored locally in your browser only.</span>
              <a
                href="https://aistudio.google.com/app/apikey"
                target="_blank"
                rel="noreferrer"
                className="text-indigo-300 hover:text-indigo-200 underline"
              >
                Get Gemini API key
              </a>
            </div>
          </div>
        )}
      </header>
      <main className="flex-1 overflow-auto p-3 sm:p-4">
        {activeView === 'studio' ? <GeminiSelfChatAudio userApiKey={userApiKey} /> : <FeaturesHelpPage />}
      </main>
    </div>
  )
}
