import { useState } from 'react'

export default function KeyGate({ onUnlock }) {
  const [key, setKey] = useState('')

  const submit = (e) => {
    e.preventDefault()
    const trimmed = key.trim()
    if (trimmed) onUnlock(trimmed)
  }

  return (
    <main className="min-h-screen bg-[#f5f5f0] flex items-center justify-center p-4">
      <form onSubmit={submit} className="bg-white rounded-lg shadow p-8 max-w-sm w-full text-center">
        <h1 className="text-2xl font-bold text-primary">Exercise App</h1>
        <p className="mt-2 text-sm text-gray-600">Enter your key to continue.</p>
        <input
          type="password"
          value={key}
          onChange={e => setKey(e.target.value)}
          placeholder="Key"
          aria-label="Key"
          autoFocus
          className="mt-4 w-full border border-gray-300 rounded px-3 py-2"
        />
        <button
          type="submit"
          disabled={!key.trim()}
          className="mt-4 w-full bg-primary text-white rounded py-2 font-semibold hover:opacity-90 disabled:opacity-50"
        >
          Unlock
        </button>
        <p className="mt-3 text-xs text-gray-400">
          You can also put the key in the URL: <code>/…/&lt;key&gt;/</code>
        </p>
      </form>
    </main>
  )
}
