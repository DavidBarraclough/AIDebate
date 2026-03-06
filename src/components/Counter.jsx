import { useState } from 'react'

export default function Counter() {
  const [count, setCount] = useState(0)

  const color = count > 0 ? 'text-green-400' : count < 0 ? 'text-red-400' : 'text-gray-100'

  return (
    <div className="bg-gray-900 rounded-xl p-6 space-y-4">
      <h2 className="text-lg font-semibold">useState — Counter</h2>
      <p className="text-gray-400 text-sm">Demonstrates local state with useState.</p>

      <div className={`text-6xl font-bold text-center py-6 ${color}`}>
        {count}
      </div>

      <div className="flex gap-3 justify-center">
        <button
          onClick={() => setCount(c => c - 1)}
          className="px-6 py-2 bg-gray-800 hover:bg-gray-700 rounded-lg text-lg font-bold transition-colors cursor-pointer"
        >
          −
        </button>
        <button
          onClick={() => setCount(0)}
          className="px-6 py-2 bg-gray-800 hover:bg-gray-700 rounded-lg text-sm transition-colors cursor-pointer"
        >
          Reset
        </button>
        <button
          onClick={() => setCount(c => c + 1)}
          className="px-6 py-2 bg-indigo-600 hover:bg-indigo-500 rounded-lg text-lg font-bold transition-colors cursor-pointer"
        >
          +
        </button>
      </div>
    </div>
  )
}
