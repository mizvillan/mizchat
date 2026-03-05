import React, { useState } from 'react';
import { useAuth } from '../../context/AuthContext';

export const LoginModal = () => {
  const { login } = useAuth();
  const [isRegister, setIsRegister] = useState(false);
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    const endpoint = isRegister ? '/api/register' : '/api/login';
    const body = isRegister ? { username, password, displayName } : { username, password };

    try {
      const res = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Something went wrong');
      
      login(data);
    } catch (err: any) {
      setError(err.message);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
      <div className="bg-slate-900/90 w-full max-w-md rounded-2xl shadow-2xl border border-white/10 overflow-hidden relative">
        {/* Decorative background */}
        <div className="absolute inset-0 bg-gradient-to-br from-indigo-500/10 via-purple-500/5 to-zinc-900 pointer-events-none"></div>
        
        <div className="p-8 relative z-10">
          <div className="text-center mb-8">
            <h1 className="text-3xl font-bold text-white tracking-tight mb-2 text-glow">Welcome to Discord Clone</h1>
            <p className="text-zinc-400">A real-time chat app</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            {error && (
              <div className="bg-red-500/10 border border-red-500/20 text-red-400 text-sm p-3 rounded-md">
                {error}
              </div>
            )}

            <div>
              <label className="block text-xs font-bold text-zinc-400 uppercase mb-1">Username</label>
              <input
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                className="w-full bg-zinc-950 border border-zinc-800 rounded-md px-3 py-2 text-white focus:outline-none focus:border-indigo-500 transition-colors"
                required
              />
            </div>

            {isRegister && (
              <div>
                <label className="block text-xs font-bold text-zinc-400 uppercase mb-1">Display Name</label>
                <input
                  type="text"
                  value={displayName}
                  onChange={(e) => setDisplayName(e.target.value)}
                  className="w-full bg-zinc-950 border border-zinc-800 rounded-md px-3 py-2 text-white focus:outline-none focus:border-indigo-500 transition-colors"
                />
              </div>
            )}

            <div>
              <label className="block text-xs font-bold text-zinc-400 uppercase mb-1">Password</label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full bg-zinc-950 border border-zinc-800 rounded-md px-3 py-2 text-white focus:outline-none focus:border-indigo-500 transition-colors"
                required
              />
            </div>

            <button
              type="submit"
              className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-2.5 rounded-md transition-all transform hover:scale-[1.02] active:scale-[0.98] shadow-lg shadow-indigo-500/20"
            >
              {isRegister ? 'Register' : 'Login'}
            </button>
          </form>

          <div className="mt-6 text-center text-sm text-zinc-400">
            {isRegister ? 'Already have an account?' : "Don't have an account?"}{' '}
            <button
              onClick={() => setIsRegister(!isRegister)}
              className="text-indigo-400 hover:text-indigo-300 font-medium hover:underline"
            >
              {isRegister ? 'Login' : 'Register'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
