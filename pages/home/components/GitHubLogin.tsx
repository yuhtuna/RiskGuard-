import React, { useState } from 'react';
import { Github, Key, Search, Loader2 } from 'lucide-react';

interface GitHubLoginProps {
  onLogin: (username: string, token: string, repos: any[]) => void;
}

export const GitHubLogin: React.FC<GitHubLoginProps> = ({ onLogin }) => {
  const [username, setUsername] = useState('');
  const [token, setToken] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const response = await fetch('/api/github/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, token }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Login failed');
      }

      onLogin(username, token, data.repos);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="w-full max-w-md mx-auto p-6 bg-slate-900/50 backdrop-blur-sm rounded-xl border border-slate-700 shadow-xl">
      <div className="flex items-center justify-center mb-6">
        <Github className="w-12 h-12 text-white" />
      </div>
      <h2 className="text-2xl font-bold text-center text-white mb-2">Connect to GitHub</h2>
      <p className="text-slate-400 text-center mb-6">Enter your credentials to access your repositories.</p>

      <form onSubmit={handleLogin} className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-slate-300 mb-1">GitHub Username</label>
          <input
            type="text"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            className="w-full px-4 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all"
            placeholder="octocat"
            required
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-slate-300 mb-1">Personal Access Token</label>
          <div className="relative">
            <Key className="absolute left-3 top-2.5 w-4 h-4 text-slate-500" />
            <input
              type="password"
              value={token}
              onChange={(e) => setToken(e.target.value)}
              className="w-full pl-10 pr-4 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all"
              placeholder="ghp_..."
              required
            />
          </div>
          <p className="text-xs text-slate-500 mt-1">Requires 'repo' scope.</p>
        </div>

        {error && (
          <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-lg text-red-400 text-sm">
            {error}
          </div>
        )}

        <button
          type="submit"
          disabled={loading}
          className="w-full py-2.5 bg-blue-600 hover:bg-blue-500 text-white font-semibold rounded-lg transition-all flex items-center justify-center space-x-2 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {loading ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" />
              <span>Connecting...</span>
            </>
          ) : (
            <span>Connect</span>
          )}
        </button>
      </form>
    </div>
  );
};
