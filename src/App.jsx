import GeminiSelfChatAudio from './components/GeminiSelfChatAudio'

export default function App() {
  return (
    <div className="min-h-screen h-dvh flex flex-col bg-gray-950 text-gray-100 font-sans overflow-hidden">
      <header className="shrink-0 border-b border-gray-800 px-4 sm:px-6 py-3">
        <h1 className="text-xl font-bold text-white">Gemini AI Debate</h1>
        <p className="text-xs text-gray-400 mt-0.5">Two AIs · Live voice · Imagen 4</p>
      </header>
      <main className="flex-1 overflow-auto p-3 sm:p-4">
        <GeminiSelfChatAudio />
      </main>
    </div>
  )
}
