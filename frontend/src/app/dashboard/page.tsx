'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import api from '@/lib/api'
import type { User, Topic, Question, PairSession } from '@/types'

export default function DashboardPage() {
  const [user, setUser] = useState<User | null>(null)
  const [topics, setTopics] = useState<Topic[]>([])
  const [selectedTopic, setSelectedTopic] = useState<string>('')
  const [questions, setQuestions] = useState<Question[]>([])
  const [selectedQuestion, setSelectedQuestion] = useState<string>('')
  const [sessions, setSessions] = useState<PairSession[]>([])
  const [joinCode, setJoinCode] = useState('')
  const [creating, setCreating] = useState(false)
  const [joining, setJoining] = useState(false)
  const [error, setError] = useState('')
  const router = useRouter()

  useEffect(() => {
    const token = localStorage.getItem('token')
    const userData = localStorage.getItem('user')
    if (!token) { router.push('/login'); return }
    if (userData) setUser(JSON.parse(userData))
    fetchTopics()
  }, [router])

  const fetchTopics = async () => {
    try {
      const { data } = await api.get('/topics')
      setTopics(data)
    } catch (err) { console.error('Failed to fetch topics:', err) }
  }

  const handleTopicChange = async (topicId: string) => {
    setSelectedTopic(topicId)
    setSelectedQuestion('')
    if (!topicId) { setQuestions([]); return }
    try {
      const { data } = await api.get(`/questions/topic/${topicId}`)
      setQuestions(data)
    } catch (err) { console.error('Failed to fetch questions:', err) }
  }

  const handleCreateSession = async () => {
    if (!selectedQuestion) { setError('Please select a topic and question first'); return }
    setCreating(true); setError('')
    try {
      const { data } = await api.post('/sessions', { questionId: selectedQuestion })
      router.push(`/pair/${data.id}`)
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to create session')
    } finally { setCreating(false) }
  }

  const handleJoinSession = async () => {
    if (!joinCode.trim()) { setError('Please enter a join code'); return }
    setJoining(true); setError('')
    try {
      const { data } = await api.post('/sessions/join', { joinCode: joinCode.trim().toUpperCase() })
      router.push(`/pair/${data.id}`)
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to join session')
    } finally { setJoining(false) }
  }

  const handleLogout = () => {
    localStorage.removeItem('token')
    localStorage.removeItem('refreshToken')
    localStorage.removeItem('user')
    router.push('/login')
  }

  return (
    <div className="min-h-screen bg-surface-950">
      {/* Navbar */}
      <nav className="bg-surface-900 border-b border-surface-700">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16">
            <div className="flex items-center">
              <h1 className="text-xl font-bold text-white">PairPath</h1>
            </div>
            <div className="flex items-center space-x-4">
              <span className="text-sm text-surface-300">
                Welcome, <span className="text-primary-400 font-medium">{user?.firstName || 'Loading...'}</span>
              </span>
              <button onClick={handleLogout}
                className="px-3 py-1.5 bg-surface-800 hover:bg-surface-700 text-surface-300 rounded-lg text-sm transition-colors border border-surface-600">
                Logout
              </button>
            </div>
          </div>
        </div>
      </nav>

      <main className="max-w-7xl mx-auto py-8 px-4 sm:px-6 lg:px-8">
        {error && (
          <div className="mb-6 bg-red-500/10 border border-red-500/30 text-red-400 px-4 py-3 rounded-lg text-sm animate-fade-in">
            {error}
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
          {/* Create Session */}
          <div className="bg-surface-900 border border-surface-700 rounded-2xl p-6">
            <div className="flex items-center mb-5">
              <div className="w-10 h-10 bg-primary-600/20 rounded-xl flex items-center justify-center mr-3">
                <svg className="w-5 h-5 text-primary-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" /></svg>
              </div>
              <div>
                <h3 className="text-lg font-semibold text-white">Create Session</h3>
                <p className="text-sm text-surface-400">Start a new pair programming session</p>
              </div>
            </div>

            <div className="space-y-4">
              <div>
                <label htmlFor="topic-select" className="block text-sm font-medium text-surface-300 mb-1.5">Select Topic</label>
                <select id="topic-select" value={selectedTopic} onChange={(e) => handleTopicChange(e.target.value)}
                  className="w-full px-4 py-2.5 bg-surface-800 border border-surface-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent transition-all">
                  <option value="">Choose a topic...</option>
                  {topics.map((t) => (<option key={t.id} value={t.id}>{t.name}</option>))}
                </select>
              </div>

              {questions.length > 0 && (
                <div className="animate-fade-in">
                  <label htmlFor="question-select" className="block text-sm font-medium text-surface-300 mb-1.5">Select Question</label>
                  <select id="question-select" value={selectedQuestion} onChange={(e) => setSelectedQuestion(e.target.value)}
                    className="w-full px-4 py-2.5 bg-surface-800 border border-surface-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent transition-all">
                    <option value="">Choose a question...</option>
                    {questions.map((q) => (
                      <option key={q.id} value={q.id}>{q.title} ({q.difficulty})</option>
                    ))}
                  </select>
                </div>
              )}

              {selectedQuestion && (
                <div className="animate-fade-in bg-surface-800 rounded-lg p-4 border border-surface-600">
                  <p className="text-sm text-surface-300">{questions.find(q => q.id === selectedQuestion)?.description}</p>
                </div>
              )}

              <button onClick={handleCreateSession} disabled={creating || !selectedQuestion}
                className="w-full py-2.5 px-4 bg-primary-600 hover:bg-primary-700 text-white font-medium rounded-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed">
                {creating ? 'Creating...' : 'Create New Session'}
              </button>
            </div>
          </div>

          {/* Join Session */}
          <div className="bg-surface-900 border border-surface-700 rounded-2xl p-6">
            <div className="flex items-center mb-5">
              <div className="w-10 h-10 bg-accent-600/20 rounded-xl flex items-center justify-center mr-3">
                <svg className="w-5 h-5 text-accent-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
              </div>
              <div>
                <h3 className="text-lg font-semibold text-white">Join Session</h3>
                <p className="text-sm text-surface-400">Enter a 6-digit code to join</p>
              </div>
            </div>

            <div className="space-y-4">
              <div>
                <label htmlFor="join-code-input" className="block text-sm font-medium text-surface-300 mb-1.5">Join Code</label>
                <input id="join-code-input" type="text" placeholder="e.g. ABC123" value={joinCode} maxLength={6}
                  onChange={(e) => setJoinCode(e.target.value.toUpperCase())}
                  onKeyDown={(e) => { if (e.key === 'Enter') handleJoinSession() }}
                  className="w-full px-4 py-2.5 bg-surface-800 border border-surface-600 rounded-lg text-white text-center text-2xl tracking-[0.3em] font-mono placeholder-surface-500 focus:outline-none focus:ring-2 focus:ring-accent-500 focus:border-transparent transition-all uppercase" />
              </div>
              <button onClick={handleJoinSession} disabled={joining || !joinCode.trim()}
                className="w-full py-2.5 px-4 bg-accent-600 hover:bg-accent-700 text-white font-medium rounded-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed">
                {joining ? 'Joining...' : 'Join Session'}
              </button>
            </div>
          </div>
        </div>
      </main>
    </div>
  )
}
