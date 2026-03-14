import { useState } from 'react'

const EXAMPLE_DEBATE = [
  {
    speaker: 'Einstein',
    side: 'for',
    text: "The cosmos is vast beyond imagination. To confine humanity to a single fragile rock is not wisdom — it is timidity. Mars represents our next laboratory, our next frontier. The human spirit demands we reach for it.",
  },
  {
    speaker: 'Elon Musk',
    side: 'for',
    text: "Exactly. And the technology is already within reach. Reusable rockets, in-situ resource utilisation, pressurised habitats. We're not talking about a dream — we're talking about an engineering problem with a known solution path.",
  },
  {
    speaker: 'Einstein',
    side: 'for',
    text: "Though I would caution that the greatest obstacle is not the rocket equation but the human one. Cooperation between nations, sustained will across generations — these are the harder variables.",
  },
  {
    speaker: 'Elon Musk',
    side: 'for',
    text: "Which is why private enterprise must lead. Governments optimise for election cycles. A mission to Mars requires decades. Remove the political variable and you remove the primary bottleneck.",
  },
]

const FEATURES = [
  {
    icon: '🎙️',
    title: 'Live TTS voices',
    desc: 'Each AI persona speaks in a distinct voice. Listen to the debate unfold in real time.',
  },
  {
    icon: '🖼️',
    title: 'AI-generated images',
    desc: 'Imagen generates a unique scene for each debate topic, setting the visual stage.',
  },
  {
    icon: '🔗',
    title: 'Shareable replays',
    desc: 'Every debate gets a permanent public link. Share the transcript with anyone.',
  },
  {
    icon: '📜',
    title: 'Debate history',
    desc: 'All your past debates are saved and replayable from your personal history.',
  },
  {
    icon: '🎭',
    title: '10+ debate styles',
    desc: 'Oxford, Socratic, Roast Battle, Devil\'s Advocate — pick your format.',
  },
  {
    icon: '🗂️',
    title: 'Topic categories',
    desc: 'Science, philosophy, tech, history — or go Wild Card for maximum chaos.',
  },
]

export default function LandingPage({
  authMode, setAuthMode,
  authEmail, setAuthEmail,
  authPassword, setAuthPassword,
  authBusy, authError, authInfo,
  handleSignIn, handleSignUp,
}) {
  const [localMode, setLocalMode] = useState(authMode || 'signup')

  const syncMode = (m) => {
    setLocalMode(m)
    setAuthMode(m)
  }

  return (
    <div className="min-h-screen bg-gray-950 text-gray-100 font-sans">

      {/* Hero */}
      <section className="relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-indigo-950 via-gray-950 to-gray-950 pointer-events-none" />
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[800px] h-[400px] bg-indigo-700/10 rounded-full blur-3xl pointer-events-none" />
        <div className="relative max-w-6xl mx-auto px-6 pt-20 pb-16 flex flex-col lg:flex-row items-center gap-12">

          {/* Left: copy */}
          <div className="flex-1 text-center lg:text-left">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-indigo-700/40 bg-indigo-950/50 text-indigo-300 text-xs font-medium mb-6">
              <span className="w-1.5 h-1.5 rounded-full bg-indigo-400 animate-pulse" />
              Powered by Gemini 2.5 · Imagen 4
            </div>
            <h1 className="text-5xl lg:text-6xl font-extrabold leading-tight text-white">
              Watch AI legends<br />
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-400 to-violet-400">debate anything</span>
            </h1>
            <p className="mt-5 text-lg text-gray-300 max-w-lg mx-auto lg:mx-0">
              Pit any two historical figures, scientists, or characters against each other.
              Live voices, AI images, and full transcripts — ready to share in seconds.
            </p>
            <a
              href="#signup"
              className="mt-8 inline-block px-7 py-3.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-semibold text-base transition-colors"
            >
              Start debating free →
            </a>
          </div>

          {/* Right: auth form */}
          <div id="signup" className="w-full max-w-sm shrink-0">
            <div className="rounded-2xl border border-gray-700/60 bg-gray-900/80 backdrop-blur p-6 shadow-2xl">
              <h2 className="text-lg font-bold text-white mb-1">
                {localMode === 'signup' ? 'Create free account' : 'Welcome back'}
              </h2>
              <p className="text-xs text-gray-400 mb-4">
                {localMode === 'signup' ? '10 free debates per day. No card required.' : 'Sign in to access your debates.'}
              </p>

              <div className="inline-flex rounded-lg border border-gray-700 bg-gray-950 p-1 mb-4">
                <button
                  onClick={() => syncMode('signup')}
                  className={`px-3 py-1.5 text-sm rounded-md transition-colors cursor-pointer ${localMode === 'signup' ? 'bg-indigo-700 text-white' : 'text-gray-300 hover:bg-gray-800'}`}
                >
                  Sign Up
                </button>
                <button
                  onClick={() => syncMode('signin')}
                  className={`px-3 py-1.5 text-sm rounded-md transition-colors cursor-pointer ${localMode === 'signin' ? 'bg-indigo-700 text-white' : 'text-gray-300 hover:bg-gray-800'}`}
                >
                  Sign In
                </button>
              </div>

              <div className="space-y-3">
                <input
                  type="email"
                  value={authEmail}
                  onChange={e => setAuthEmail(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && (localMode === 'signin' ? handleSignIn() : handleSignUp())}
                  placeholder="Email"
                  autoComplete="email"
                  className="w-full bg-gray-950 border border-gray-700 rounded-lg px-3 py-2.5 text-sm text-gray-200 focus:outline-none focus:border-indigo-500"
                />
                <input
                  type="password"
                  value={authPassword}
                  onChange={e => setAuthPassword(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && (localMode === 'signin' ? handleSignIn() : handleSignUp())}
                  placeholder="Password"
                  autoComplete={localMode === 'signin' ? 'current-password' : 'new-password'}
                  className="w-full bg-gray-950 border border-gray-700 rounded-lg px-3 py-2.5 text-sm text-gray-200 focus:outline-none focus:border-indigo-500"
                />
                <button
                  onClick={localMode === 'signin' ? handleSignIn : handleSignUp}
                  disabled={authBusy}
                  className="w-full px-3 py-2.5 rounded-lg bg-indigo-700 hover:bg-indigo-600 disabled:bg-gray-700 disabled:text-gray-400 disabled:cursor-not-allowed text-sm font-semibold transition-colors cursor-pointer"
                >
                  {authBusy ? 'Working...' : localMode === 'signin' ? 'Sign In' : 'Create Account'}
                </button>
              </div>

              {authError && <p className="mt-3 text-xs text-red-300">{authError}</p>}
              {authInfo && <p className="mt-3 text-xs text-green-300">{authInfo}</p>}
            </div>
          </div>
        </div>
      </section>

      {/* Example debate */}
      <section className="max-w-4xl mx-auto px-6 py-16">
        <div className="text-center mb-10">
          <p className="text-xs font-semibold uppercase tracking-widest text-indigo-400 mb-2">Example debate</p>
          <h2 className="text-3xl font-bold text-white">Einstein vs Elon Musk</h2>
          <p className="mt-2 text-gray-400">Topic: Should humans colonise Mars?</p>
        </div>

        <div className="space-y-4">
          {EXAMPLE_DEBATE.map((turn, i) => (
            <div
              key={i}
              className={`flex gap-4 ${turn.speaker === 'Elon Musk' ? 'flex-row-reverse' : ''}`}
            >
              <div className={`w-10 h-10 shrink-0 rounded-full flex items-center justify-center text-lg font-bold ${turn.speaker === 'Einstein' ? 'bg-indigo-800 text-indigo-200' : 'bg-violet-800 text-violet-200'}`}>
                {turn.speaker[0]}
              </div>
              <div className={`max-w-xl rounded-2xl px-4 py-3 text-sm leading-relaxed ${turn.speaker === 'Einstein' ? 'bg-indigo-950/70 border border-indigo-800/30 text-indigo-100 rounded-tl-sm' : 'bg-violet-950/70 border border-violet-800/30 text-violet-100 rounded-tr-sm'}`}>
                <p className={`text-xs font-semibold mb-1 ${turn.speaker === 'Einstein' ? 'text-indigo-400' : 'text-violet-400'}`}>{turn.speaker}</p>
                {turn.text}
              </div>
            </div>
          ))}
        </div>

        <div className="mt-8 text-center">
          <a href="#signup" className="inline-block px-6 py-3 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-semibold text-sm transition-colors">
            Create your own →
          </a>
        </div>
      </section>

      {/* Features */}
      <section className="border-t border-gray-800/60 bg-gray-900/30">
        <div className="max-w-5xl mx-auto px-6 py-16">
          <div className="text-center mb-12">
            <p className="text-xs font-semibold uppercase tracking-widest text-indigo-400 mb-2">Features</p>
            <h2 className="text-3xl font-bold text-white">Everything you need for the perfect debate</h2>
          </div>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {FEATURES.map(f => (
              <div key={f.title} className="rounded-xl border border-gray-700/40 bg-gray-900/60 p-5">
                <div className="text-3xl mb-3">{f.icon}</div>
                <h3 className="font-semibold text-white text-sm mb-1">{f.title}</h3>
                <p className="text-xs text-gray-400 leading-relaxed">{f.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Free vs Pro */}
      <section className="max-w-3xl mx-auto px-6 py-16">
        <div className="text-center mb-10">
          <p className="text-xs font-semibold uppercase tracking-widest text-indigo-400 mb-2">Pricing</p>
          <h2 className="text-3xl font-bold text-white">Simple, fair pricing</h2>
        </div>
        <div className="grid sm:grid-cols-2 gap-5">
          <div className="rounded-2xl border border-gray-700/40 bg-gray-900/60 p-6">
            <h3 className="text-lg font-bold text-white mb-1">Free</h3>
            <p className="text-3xl font-extrabold text-white mb-4">£0<span className="text-sm font-normal text-gray-400">/mo</span></p>
            <ul className="space-y-2 text-sm text-gray-300">
              <li className="flex gap-2"><span className="text-green-400">✓</span> 10 debates per day</li>
              <li className="flex gap-2"><span className="text-green-400">✓</span> 4-turn debates</li>
              <li className="flex gap-2"><span className="text-green-400">✓</span> Start image</li>
              <li className="flex gap-2"><span className="text-green-400">✓</span> Shareable links</li>
              <li className="flex gap-2"><span className="text-green-400">✓</span> Debate history</li>
            </ul>
          </div>
          <div className="rounded-2xl border border-indigo-600/50 bg-indigo-950/30 p-6 relative">
            <div className="absolute top-4 right-4 text-xs font-semibold text-indigo-300 bg-indigo-800/50 px-2 py-0.5 rounded-full">Pro</div>
            <h3 className="text-lg font-bold text-white mb-1">Pro</h3>
            <p className="text-3xl font-extrabold text-white mb-4">£8<span className="text-sm font-normal text-gray-400">/mo</span></p>
            <ul className="space-y-2 text-sm text-gray-300">
              <li className="flex gap-2"><span className="text-green-400">✓</span> Everything in Free</li>
              <li className="flex gap-2"><span className="text-green-400">✓</span> Full 10-minute debates</li>
              <li className="flex gap-2"><span className="text-green-400">✓</span> Start + end images</li>
              <li className="flex gap-2"><span className="text-indigo-400">✓</span> All debate categories</li>
              <li className="flex gap-2"><span className="text-indigo-400">✓</span> All debate styles</li>
            </ul>
          </div>
        </div>
      </section>

      {/* Footer CTA */}
      <section className="border-t border-gray-800/60 text-center py-16 px-6">
        <h2 className="text-3xl font-bold text-white mb-4">Ready to start?</h2>
        <p className="text-gray-400 mb-8 max-w-md mx-auto">Free to use, no card required. Your first debate is one click away.</p>
        <a href="#signup" className="inline-block px-8 py-4 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-base transition-colors">
          Start debating free →
        </a>
        <p className="mt-6 text-xs text-gray-600">AI Debate Studio · Built with Gemini 2.5 &amp; Imagen 4</p>
      </section>
    </div>
  )
}
