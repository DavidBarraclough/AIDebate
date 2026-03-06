import { useState } from 'react'
import Counter from './components/Counter'
import FetchDemo from './components/FetchDemo'
import FormDemo from './components/FormDemo'

const tabs = ['Counter', 'Fetch', 'Form']

export default function App() {
  const [activeTab, setActiveTab] = useState('Counter')

  return (
    <div className="min-h-screen bg-gray-950 text-gray-100 font-sans">
      {/* Header */}
      <header className="border-b border-gray-800 px-4 py-4">
        <h1 className="text-xl font-bold text-white">React Demo</h1>
        <p className="text-xs text-gray-400 mt-0.5">React 19 · Tailwind v4 · Vite</p>
      </header>

      {/* Tabs */}
      <nav className="flex gap-1 px-4 pt-4">
        {tabs.map(tab => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors cursor-pointer
              ${activeTab === tab
                ? 'bg-indigo-600 text-white'
                : 'text-gray-400 hover:text-white hover:bg-gray-800'
              }`}
          >
            {tab}
          </button>
        ))}
      </nav>

      {/* Content */}
      <main className="p-4 max-w-2xl mx-auto mt-4">
        {activeTab === 'Counter' && <Counter />}
        {activeTab === 'Fetch' && <FetchDemo />}
        {activeTab === 'Form' && <FormDemo />}
      </main>
    </div>
  )
}
