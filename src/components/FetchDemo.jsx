import { useState, useEffect } from 'react'

export default function FetchDemo() {
  const [users, setUsers] = useState([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)

  const fetchUsers = async () => {
    setLoading(true)
    setError(null)
    try {
      const res = await fetch('https://jsonplaceholder.typicode.com/users?_limit=5')
      const data = await res.json()
      setUsers(data)
    } catch {
      setError('Failed to fetch users.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchUsers()
  }, [])

  return (
    <div className="bg-gray-900 rounded-xl p-6 space-y-4">
      <h2 className="text-lg font-semibold">useEffect + Fetch</h2>
      <p className="text-gray-400 text-sm">Fetches data from a public API on mount.</p>

      <button
        onClick={fetchUsers}
        disabled={loading}
        className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 rounded-lg text-sm font-medium transition-colors cursor-pointer"
      >
        {loading ? 'Loading...' : 'Reload'}
      </button>

      {error && <p className="text-red-400 text-sm">{error}</p>}

      <ul className="space-y-2">
        {users.map(user => (
          <li key={user.id} className="flex items-center gap-3 bg-gray-800 rounded-lg px-4 py-3">
            <div className="w-8 h-8 rounded-full bg-indigo-600 flex items-center justify-center text-sm font-bold shrink-0">
              {user.name[0]}
            </div>
            <div>
              <p className="text-sm font-medium">{user.name}</p>
              <p className="text-xs text-gray-400">{user.email}</p>
            </div>
          </li>
        ))}
      </ul>
    </div>
  )
}
