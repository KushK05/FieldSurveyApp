import { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';

export function Login() {
  const { login } = useAuth();
  const [name, setName] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (name.trim()) {
      login(name.trim());
    }
  };

  return (
    <div className="min-h-screen bg-surface flex flex-col">
      {/* Hero */}
      <div className="bg-primary text-white px-6 pt-16 pb-12 rounded-b-3xl">
        <div className="flex items-center gap-3 mb-8">
          <div className="w-12 h-12 rounded-xl bg-white/20 flex items-center justify-center">
            <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M9 11l3 3L22 4" />
              <path d="M21 12v7a2 2 0 01-2 2H5a2 2 0 01-2-2V5a2 2 0 012-2h11" />
            </svg>
          </div>
          <div>
            <h1 className="text-2xl font-bold tracking-tight">FieldSurvey</h1>
            <p className="text-sm text-white/70">Offline-first data collection</p>
          </div>
        </div>
        <p className="text-white/80 text-sm leading-relaxed">
          Collect survey data in the field — even without internet.
          Your responses sync automatically when you're back online.
        </p>
      </div>

      {/* Login form */}
      <div className="flex-1 px-6 pt-8">
        <h2 className="text-lg font-semibold text-gray-800 mb-1">Get started</h2>
        <p className="text-sm text-gray-500 mb-6">Enter your name to begin collecting surveys.</p>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label htmlFor="name" className="block text-sm font-medium text-gray-700 mb-1.5">
              Your name
            </label>
            <input
              id="name"
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Enter your full name"
              className="w-full px-4 py-3.5 rounded-xl border border-gray-300 text-base focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary bg-white"
              autoFocus
              autoComplete="name"
            />
          </div>

          <button
            type="submit"
            disabled={!name.trim()}
            className="w-full py-3.5 rounded-xl bg-primary text-white font-semibold text-base active:bg-primary-dark disabled:opacity-40 transition-colors shadow-lg shadow-primary/25"
          >
            Start Collecting
          </button>
        </form>

        <p className="text-xs text-gray-400 text-center mt-8">
          All data is stored offline on your device and syncs automatically.
        </p>
      </div>
    </div>
  );
}
