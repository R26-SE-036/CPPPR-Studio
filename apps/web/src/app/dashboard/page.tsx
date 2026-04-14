'use client';

import { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth-context';
import api from '@/lib/api';
import { Session } from '@/types';
import { Plus, LogIn, LogOut, Code2, RefreshCw } from 'lucide-react';

export default function DashboardPage() {
  const { user, logout, loading } = useAuth();
  const router = useRouter();
  const [sessions, setSessions] = useState<Session[]>([]);
  const [createForm, setCreateForm] = useState({ title: '' });
  const [joinCode, setJoinCode] = useState('');
  const [creating, setCreating] = useState(false);
  const [joining, setJoining] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!loading && !user) router.push('/login');
  }, [user, loading, router]);

  const fetchSessions = useCallback(() => {
    if (user) {
      api.get('/sessions/mine').then((res) => setSessions(res.data));
    }
  }, [user]);

  useEffect(() => {
    fetchSessions();
  }, [fetchSessions]);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setCreating(true);
    try {
      const res = await api.post('/sessions', {
        title: createForm.title,
        language: 'java', // locked to Java
      });
      router.push(`/session/${res.data.id}`);
    } catch {
      setError('Failed to create session');
    } finally {
      setCreating(false);
    }
  };

  const handleJoin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setJoining(true);
    try {
      const res = await api.post('/sessions/join', {
        roomCode: joinCode.toUpperCase(),
      });
      router.push(`/session/${res.data.id}`);
    } catch {
      setError('Session not found. Check the room code.');
    } finally {
      setJoining(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        Loading...
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Nav */}
      <nav className="bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Code2 className="text-blue-600" size={22} />
          <span className="font-bold text-gray-900">CPPPR Studio</span>
        </div>
        <div className="flex items-center gap-4">
          <span className="text-sm text-gray-600">
            {user?.username}{' '}
            <span className="text-gray-400">({user?.role})</span>
          </span>
          <button
            onClick={() => {
              logout();
              router.push('/login');
            }}
            className="flex items-center gap-1 text-sm text-gray-500 hover:text-gray-800"
          >
            <LogOut size={16} /> Sign out
          </button>
        </div>
      </nav>

      <div className="max-w-5xl mx-auto px-6 py-8 space-y-8">
        {/* Actions row */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Create session */}
          <div className="bg-white rounded-xl border border-gray-200 p-6">
            <h2 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
              <Plus size={18} /> New session
            </h2>
            <form onSubmit={handleCreate} className="space-y-3">
              <input
                placeholder="Session title"
                value={createForm.title}
                onChange={(e) =>
                  setCreateForm({ title: e.target.value })
                }
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                required
              />
              {/* Language is locked to Java */}
              <div className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm bg-gray-50 text-gray-700">
                Language: <span className="font-semibold">Java</span>
              </div>
              <button
                type="submit"
                disabled={creating}
                className="w-full bg-blue-600 text-white py-2 rounded-lg text-sm font-medium hover:bg-blue-700 disabled:opacity-50 transition-colors"
              >
                {creating ? 'Creating...' : 'Create session'}
              </button>
            </form>
          </div>

          {/* Join session */}
          <div className="bg-white rounded-xl border border-gray-200 p-6">
            <h2 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
              <LogIn size={18} /> Join session
            </h2>
            <form onSubmit={handleJoin} className="space-y-3">
              <input
                placeholder="Room code (e.g. ABC123)"
                value={joinCode}
                onChange={(e) =>
                  setJoinCode(e.target.value.toUpperCase())
                }
                maxLength={6}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm font-mono tracking-widest focus:outline-none focus:ring-2 focus:ring-blue-500"
                required
              />
              <button
                type="submit"
                disabled={joining}
                className="w-full bg-green-600 text-white py-2 rounded-lg text-sm font-medium hover:bg-green-700 disabled:opacity-50 transition-colors"
              >
                {joining ? 'Joining...' : 'Join session'}
              </button>
            </form>
          </div>
        </div>

        {error && (
          <div className="bg-red-50 text-red-700 px-4 py-3 rounded-lg text-sm">
            {error}
          </div>
        )}

        {/* Session list */}
        <div>
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-semibold text-gray-900">Your sessions</h2>
            <button
              onClick={fetchSessions}
              className="flex items-center gap-1 text-sm text-gray-500 hover:text-gray-800 transition-colors"
            >
              <RefreshCw size={14} /> Refresh
            </button>
          </div>
          {sessions.length === 0 ? (
            <p className="text-gray-500 text-sm">
              No sessions yet. Create or join one above.
            </p>
          ) : (
            <div className="space-y-3">
              {sessions.map((s) => (
                <div
                  key={s.id}
                  onClick={() => router.push(`/session/${s.id}`)}
                  className="bg-white border border-gray-200 rounded-xl px-5 py-4 flex items-center justify-between cursor-pointer hover:border-blue-400 transition-colors"
                >
                  <div>
                    <p className="font-medium text-gray-900">{s.title}</p>
                    <p className="text-sm text-gray-500 mt-0.5">
                      Code:{' '}
                      <span className="font-mono font-bold">
                        {s.roomCode}
                      </span>{' '}
                      · {s.language}
                    </p>
                  </div>
                  <span
                    className={`text-xs px-2 py-1 rounded-full font-medium ${
                      s.status === 'ACTIVE'
                        ? 'bg-green-100 text-green-700'
                        : s.status === 'WAITING'
                          ? 'bg-yellow-100 text-yellow-700'
                          : 'bg-gray-100 text-gray-500'
                    }`}
                  >
                    {s.status}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}