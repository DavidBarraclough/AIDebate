const FEATURE_SECTIONS = [
  {
    title: 'Debate Setup',
    items: [
      'Type your own debate prompt manually.',
      'Manually edit both personas: name, personality, and voice.',
      'Pick a category and style theme before starting.',
      'Use Randomize to auto-generate topic + persona setup.',
    ],
  },
  {
    title: 'Live Session Controls',
    items: [
      'Pause and resume any session mid-debate.',
      'Use REDIRECT (mic) to interrupt and steer the debate.',
      'Mute/unmute generated voice at any time.',
      'Enable or disable generated visuals at any time.',
    ],
  },
  {
    title: 'Analysis and Summary',
    items: [
      'Generate a winner summary while paused.',
      'See key arguments for both sides plus final analysis.',
      'Hear a concise spoken summary (winner + reason) when unmuted.',
    ],
  },
  {
    title: 'Personal API Key',
    items: [
      'Optionally save your own Gemini API key in the app.',
      'Why this matters: it uses your own Gemini quota if a shared server key is unavailable or out of quota.',
      'Switch between personal key and server default automatically.',
      'Clear the saved key any time from controls (stored locally in your browser).',
    ],
  },
  {
    title: 'Usage Visibility',
    items: [
      'Track estimated session cost in real time.',
      'See API call, turn, voice, image, and failure counts.',
      'Quota alerts explain when voice or visuals are auto-disabled.',
    ],
  },
]

const QUICK_START = [
  'Set category/style, then enter a debate question (or randomize).',
  'Adjust personas and voice profiles if desired.',
  'Click Begin Session and monitor transcript + visuals.',
  'Use REDIRECT to intervene, then pause for summary when ready.',
]

export default function FeaturesHelpPage() {
  return (
    <div className="w-full rounded-xl border border-gray-800 bg-gray-900/80 p-4 sm:p-6">
      <div className="mb-6 rounded-xl border border-indigo-700/40 bg-indigo-950/40 p-4">
        <h2 className="text-lg sm:text-xl font-bold text-indigo-100">Features and Help</h2>
        <p className="mt-1 text-sm text-indigo-200/80">
          Everything you can do in AI Debate Studio, including manual controls, random setup, live redirects, and summary tools.
        </p>
      </div>

      <section className="mb-6">
        <h3 className="text-sm font-semibold uppercase tracking-wide text-amber-300">Quick Start</h3>
        <ol className="mt-2 space-y-1 text-sm text-gray-200 list-decimal list-inside">
          {QUICK_START.map((step) => (
            <li key={step}>{step}</li>
          ))}
        </ol>
      </section>

      <section className="grid grid-cols-1 lg:grid-cols-2 gap-3">
        {FEATURE_SECTIONS.map((section) => (
          <article key={section.title} className="rounded-xl border border-gray-700/80 bg-gray-900 p-4">
            <h4 className="text-base font-semibold text-white">{section.title}</h4>
            <ul className="mt-2 space-y-1.5 text-sm text-gray-300">
              {section.items.map((item) => (
                <li key={item} className="flex gap-2">
                  <span className="mt-1 h-1.5 w-1.5 shrink-0 rounded-full bg-indigo-400" />
                  <span>{item}</span>
                </li>
              ))}
            </ul>
          </article>
        ))}
      </section>
    </div>
  )
}
