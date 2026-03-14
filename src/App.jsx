import GeminiSelfChatAudio from './components/GeminiSelfChatAudio'
import FeaturesHelpPage from './components/FeaturesHelpPage'
import DebateHistory from './components/DebateHistory'
import LandingPage from './components/LandingPage'
import { useEffect, useState, useCallback } from 'react'
import { isSupabaseConfigured, supabase } from './lib/supabaseClient'

const API_BASE = (import.meta.env.VITE_API_BASE_URL || '').trim() || (import.meta.env.DEV ? 'http://localhost:3001' : '')

const GEMINI_KEY_STORAGE_KEY = 'gemini-user-api-key'

function getStoredGeminiKey() {
  try {
    return (localStorage.getItem(GEMINI_KEY_STORAGE_KEY) || '').trim()
  } catch (_err) {
    return ''
  }
}

export default function App() {
  const initialUserKey = getStoredGeminiKey()
  const [activeView, setActiveView] = useState('studio')
  const [apiKeyInput, setApiKeyInput] = useState(initialUserKey)
  const [userApiKey, setUserApiKey] = useState(initialUserKey)
  const [showApiKeyPanel, setShowApiKeyPanel] = useState(!initialUserKey)
  const [authMode, setAuthMode] = useState('signin')
  const [authEmail, setAuthEmail] = useState('')
  const [authPassword, setAuthPassword] = useState('')
  const [authBusy, setAuthBusy] = useState(false)
  const [authError, setAuthError] = useState('')
  const [authInfo, setAuthInfo] = useState('')
  const [authLoading, setAuthLoading] = useState(isSupabaseConfigured)
  const [user, setUser] = useState(null)
  const [isPro, setIsPro] = useState(false)
  const [proLoading, setProLoading] = useState(false)
  const [upgrading, setUpgrading] = useState(false)
  const [proActivating, setProActivating] = useState(false)
  const [proActivationError, setProActivationError] = useState('')

  useEffect(() => {
    if (!isSupabaseConfigured || !supabase) return

    let ignore = false

    const initializeAuth = async () => {
      const { data, error } = await supabase.auth.getSession()
      if (error && !ignore) setAuthError(error.message || 'Unable to read auth session.')
      if (!ignore) {
        setUser(data?.session?.user || null)
        setAuthLoading(false)
      }
    }

    initializeAuth()

    const { data } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user || null)
      setAuthLoading(false)
    })

    return () => {
      ignore = true
      data?.subscription?.unsubscribe()
    }
  }, [])

  const fetchProStatus = useCallback(async (currentUser) => {
    if (!currentUser || !supabase) return
    setProLoading(true)
    try {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session?.access_token) return
      const res = await fetch(`${API_BASE}/api/subscription/status`, {
        headers: { Authorization: `Bearer ${session.access_token}` },
      })
      if (res.ok) {
        const data = await res.json()
        setIsPro(data.isPro || false)
      }
    } catch (err) {
      console.error('Failed to fetch pro status:', err)
    } finally {
      setProLoading(false)
    }
  }, [])

  // Check pro status when user signs in
  useEffect(() => {
    if (user) fetchProStatus(user)
    else setIsPro(false)
  }, [user, fetchProStatus])

  // Handle return from Stripe Checkout (confirm payment + write subscription to Supabase)
  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    const sessionId = params.get('session_id')
    if (!sessionId || !user || !supabase) return

    // Clean URL immediately so a refresh doesn't re-trigger this
    window.history.replaceState({}, '', window.location.pathname)

    const confirmPayment = async () => {
      setProActivating(true)
      setProActivationError('')
      try {
        const { data: { session } } = await supabase.auth.getSession()
        if (!session?.access_token) {
          setProActivationError('Session expired — please sign in again.')
          return
        }

        const res = await fetch(`${API_BASE}/api/stripe/confirm`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${session.access_token}` },
          body: JSON.stringify({ sessionId }),
        })
        if (!res.ok) {
          const err = await res.json().catch(() => ({}))
          setProActivationError(err.error || 'Payment confirmation failed. Please refresh the page.')
          return
        }

        const sub = await res.json()

        // Write subscription to Supabase using the user's own JWT (RLS allows this)
        const { error: upsertError } = await supabase.from('subscriptions').upsert({
          user_id:                user.id,
          stripe_customer_id:     sub.stripeCustomerId,
          stripe_subscription_id: sub.stripeSubscriptionId,
          status:                 sub.status,
          current_period_end:     sub.currentPeriodEnd,
          updated_at:             new Date().toISOString(),
        }, { onConflict: 'user_id' })

        if (upsertError) {
          console.error('Subscription upsert failed:', upsertError.message)
          setProActivationError('Pro activated but failed to save locally. Please refresh.')
          return
        }

        // Re-fetch from DB to confirm write landed
        await fetchProStatus(user)
      } catch (err) {
        console.error('Failed to confirm payment:', err)
        setProActivationError('Something went wrong activating Pro. Please refresh the page.')
      } finally {
        setProActivating(false)
      }
    }

    confirmPayment()
  }, [user, fetchProStatus])

  const handleUpgrade = async () => {
    if (!supabase || upgrading) return
    setUpgrading(true)
    try {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session?.access_token) return
      const origin = window.location.origin
      const res = await fetch(`${API_BASE}/api/stripe/checkout`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${session.access_token}` },
        body: JSON.stringify({ successUrl: origin, cancelUrl: origin }),
      })
      const data = await res.json()
      if (data.url) window.location.href = data.url
    } catch (err) {
      console.error('Failed to start checkout:', err)
    } finally {
      setUpgrading(false)
    }
  }

  const saveUserApiKey = () => {
    const trimmed = apiKeyInput.trim()
    if (!trimmed) return
    try {
      localStorage.setItem(GEMINI_KEY_STORAGE_KEY, trimmed)
    } catch (err) {
      console.error('Could not save Gemini key locally:', err)
    }
    setUserApiKey(trimmed)
    setShowApiKeyPanel(false)
  }

  const clearUserApiKey = () => {
    try {
      localStorage.removeItem(GEMINI_KEY_STORAGE_KEY)
    } catch (err) {
      console.error('Could not clear Gemini key locally:', err)
    }
    setUserApiKey('')
    setApiKeyInput('')
    setShowApiKeyPanel(true)
  }

  const handleSignIn = async () => {
    if (!supabase) return
    if (!authEmail.trim() || !authPassword) {
      setAuthError('Email and password are required.')
      return
    }

    setAuthBusy(true)
    setAuthError('')
    setAuthInfo('')
    const { error } = await supabase.auth.signInWithPassword({
      email: authEmail.trim(),
      password: authPassword,
    })
    if (error) setAuthError(error.message || 'Sign in failed.')
    setAuthBusy(false)
  }

  const handleSignUp = async () => {
    if (!supabase) return
    if (!authEmail.trim() || !authPassword) {
      setAuthError('Email and password are required.')
      return
    }

    setAuthBusy(true)
    setAuthError('')
    setAuthInfo('')
    const { error } = await supabase.auth.signUp({
      email: authEmail.trim(),
      password: authPassword,
    })
    if (error) {
      setAuthError(error.message || 'Sign up failed.')
    } else {
      setAuthInfo('Account created. If email confirmation is enabled, verify your inbox before signing in.')
      setAuthMode('signin')
    }
    setAuthBusy(false)
  }

  const handleSignOut = async () => {
    if (!supabase) return
    setAuthBusy(true)
    const { error } = await supabase.auth.signOut()
    if (error) setAuthError(error.message || 'Sign out failed.')
    setAuthBusy(false)
  }

  if (!isSupabaseConfigured) {
    return (
      <div className="min-h-screen bg-gray-950 text-gray-100 flex items-center justify-center p-6">
        <div className="w-full max-w-xl rounded-xl border border-amber-700/70 bg-gray-900 p-6">
          <h1 className="text-2xl font-bold text-white">Auth Setup Needed</h1>
          <p className="mt-2 text-sm text-gray-300">
            Day 1 authentication is enabled, but Supabase environment variables are missing.
          </p>
          <p className="mt-3 text-sm text-amber-200">
            Add VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY to your .env file, then restart Vite.
          </p>
          <p className="mt-4 text-xs text-gray-400">See .env.example for the exact variable names.</p>
        </div>
      </div>
    )
  }

  if (authLoading) {
    return (
      <div className="min-h-screen bg-gray-950 text-gray-100 flex items-center justify-center p-6">
        <div className="w-full max-w-md rounded-xl border border-gray-700 bg-gray-900 p-6">
          <p className="text-sm text-gray-300">Loading authentication session...</p>
        </div>
      </div>
    )
  }

  if (!user) {
    return (
      <LandingPage
        authMode={authMode} setAuthMode={setAuthMode}
        authEmail={authEmail} setAuthEmail={setAuthEmail}
        authPassword={authPassword} setAuthPassword={setAuthPassword}
        authBusy={authBusy} authError={authError} authInfo={authInfo}
        handleSignIn={handleSignIn} handleSignUp={handleSignUp}
      />
    )
  }

  return (
    <div className="min-h-screen h-dvh flex flex-col bg-gray-950 text-gray-100 font-sans overflow-hidden" style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}>
      {proActivating && (
        <div className="shrink-0 bg-indigo-900/60 border-b border-indigo-700/40 px-4 py-2 text-center text-sm text-indigo-200">
          Activating Pro account...
        </div>
      )}
      {proActivationError && (
        <div className="shrink-0 bg-red-900/60 border-b border-red-700/40 px-4 py-2 text-center text-sm text-red-200">
          {proActivationError}
        </div>
      )}
      <header className="shrink-0 border-b border-gray-800 px-4 sm:px-6 py-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div>
            <h1 className="text-xl font-bold text-white">AI Debate Studio</h1>
            <p className="text-xs text-gray-400 mt-0.5">Structured voice debates with live visual context.</p>
            <p className="text-[11px] text-gray-500 mt-0.5">Signed in as {user.email || user.id}</p>
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
                onClick={() => setActiveView('history')}
                className={`px-3 py-1.5 text-sm rounded-md transition-colors cursor-pointer ${activeView === 'history' ? 'bg-indigo-700 text-white' : 'text-gray-300 hover:bg-gray-800'}`}
              >
                History
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
            {!proLoading && !isPro && (
              <button
                onClick={handleUpgrade}
                disabled={upgrading}
                className="px-3 py-1.5 rounded-lg border border-amber-600/60 bg-amber-950/40 text-xs font-medium text-amber-300 hover:bg-amber-900/40 disabled:opacity-50 disabled:cursor-not-allowed transition-colors cursor-pointer"
              >
                {upgrading ? 'Opening...' : 'Upgrade to Pro · £8/mo'}
              </button>
            )}
            {isPro && (
              <span className="px-2.5 py-1 rounded-full text-xs font-semibold bg-indigo-900/60 text-indigo-300 border border-indigo-700/40">
                Pro
              </span>
            )}
            <button
              onClick={handleSignOut}
              disabled={authBusy}
              className="px-3 py-1.5 rounded-lg border border-gray-700 bg-gray-900 text-xs font-medium text-gray-200 hover:bg-gray-800 disabled:bg-gray-700 disabled:text-gray-500 disabled:cursor-not-allowed transition-colors cursor-pointer"
            >
              {authBusy ? 'Signing out...' : 'Log Out'}
            </button>
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
        {activeView === 'studio' && <GeminiSelfChatAudio userApiKey={userApiKey} user={user} isPro={isPro} onUpgrade={handleUpgrade} />}
        {activeView === 'history' && <DebateHistory user={user} />}
        {activeView === 'help' && <FeaturesHelpPage />}
      </main>
    </div>
  )
}
