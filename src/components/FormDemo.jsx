import { useState } from 'react'

export default function FormDemo() {
  const [form, setForm] = useState({ name: '', email: '', role: 'developer' })
  const [submitted, setSubmitted] = useState(null)

  const handleChange = e => {
    setForm(f => ({ ...f, [e.target.name]: e.target.value }))
  }

  const handleSubmit = e => {
    e.preventDefault()
    setSubmitted(form)
  }

  return (
    <div className="bg-gray-900 rounded-xl p-6 space-y-4">
      <h2 className="text-lg font-semibold">Controlled Form</h2>
      <p className="text-gray-400 text-sm">Demonstrates controlled inputs and form state.</p>

      <form onSubmit={handleSubmit} className="space-y-3">
        <div>
          <label className="block text-xs text-gray-400 mb-1">Name</label>
          <input
            name="name"
            value={form.name}
            onChange={handleChange}
            required
            placeholder="Jane Smith"
            className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-indigo-500"
          />
        </div>
        <div>
          <label className="block text-xs text-gray-400 mb-1">Email</label>
          <input
            name="email"
            type="email"
            value={form.email}
            onChange={handleChange}
            required
            placeholder="jane@example.com"
            className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-indigo-500"
          />
        </div>
        <div>
          <label className="block text-xs text-gray-400 mb-1">Role</label>
          <select
            name="role"
            value={form.role}
            onChange={handleChange}
            className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-indigo-500"
          >
            <option value="developer">Developer</option>
            <option value="designer">Designer</option>
            <option value="manager">Manager</option>
          </select>
        </div>
        <button
          type="submit"
          className="w-full py-2 bg-indigo-600 hover:bg-indigo-500 rounded-lg text-sm font-medium transition-colors cursor-pointer"
        >
          Submit
        </button>
      </form>

      {submitted && (
        <div className="bg-gray-800 rounded-lg p-4 text-sm space-y-1">
          <p className="text-green-400 font-medium mb-2">Submitted!</p>
          {Object.entries(submitted).map(([k, v]) => (
            <p key={k}><span className="text-gray-400">{k}:</span> {v}</p>
          ))}
        </div>
      )}
    </div>
  )
}
