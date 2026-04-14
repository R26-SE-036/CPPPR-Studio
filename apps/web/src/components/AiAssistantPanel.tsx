'use client';

import { useState, useRef, useEffect } from 'react';
import api from '@/lib/api';
import { AiAskResponse, AiSummaryResponse, QualityScores } from '@/types';
import { Bot, Send, Sparkles, BarChart3, FileText, Loader2 } from 'lucide-react';

interface AiMessage {
  role: 'user' | 'assistant';
  content: string;
}

interface AiAssistantPanelProps {
  sessionId: string;
}

export function AiAssistantPanel({ sessionId }: AiAssistantPanelProps) {
  const [messages, setMessages] = useState<AiMessage[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const askQuestion = async (question: string) => {
    if (!question.trim()) return;

    setMessages((prev) => [...prev, { role: 'user', content: question }]);
    setInput('');
    setLoading(true);

    try {
      const res = await api.post<AiAskResponse>('/ai/ask', {
        sessionId,
        question,
      });
      setMessages((prev) => [
        ...prev,
        { role: 'assistant', content: res.data.answer },
      ]);
    } catch {
      setMessages((prev) => [
        ...prev,
        { role: 'assistant', content: 'Sorry, I could not process your question. Please try again.' },
      ]);
    } finally {
      setLoading(false);
    }
  };

  const generateSummary = async () => {
    setMessages((prev) => [...prev, { role: 'user', content: 'Summarize our session' }]);
    setLoading(true);
    try {
      const res = await api.post<AiSummaryResponse>(`/ai/session-summary/${sessionId}`);
      setMessages((prev) => [
        ...prev,
        { role: 'assistant', content: res.data.summary },
      ]);
    } catch {
      setMessages((prev) => [
        ...prev,
        { role: 'assistant', content: 'Failed to generate summary.' },
      ]);
    } finally {
      setLoading(false);
    }
  };

  const analyzeQuality = async () => {
    setMessages((prev) => [...prev, { role: 'user', content: 'Analyze our collaboration quality' }]);
    setLoading(true);
    try {
      const res = await api.get<QualityScores>(`/ai/quality/${sessionId}`);
      const s = res.data;
      const text = [
        `📊 **Collaboration Quality Analysis**`,
        ``,
        `Communication: ${s.communicationScore}/100`,
        `Participation: ${s.participationScore}/100`,
        `Review Quality: ${s.reviewQualityScore}/100`,
        `Overall: ${s.overallCollaborationScore}/100`,
        ``,
        `**Suggestions:**`,
        ...s.suggestions.map((sg) => `• ${sg}`),
      ].join('\n');
      setMessages((prev) => [...prev, { role: 'assistant', content: text }]);
    } catch {
      setMessages((prev) => [
        ...prev,
        { role: 'assistant', content: 'Failed to analyze quality.' },
      ]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="h-full flex flex-col">
      {/* Quick actions */}
      <div className="p-3 border-b border-gray-700 flex gap-2 flex-wrap">
        <button
          onClick={generateSummary}
          disabled={loading}
          className="flex items-center gap-1.5 px-2.5 py-1.5 bg-purple-900 text-purple-200 rounded-lg text-xs hover:bg-purple-800 transition-colors disabled:opacity-50"
        >
          <FileText size={12} /> Summary
        </button>
        <button
          onClick={analyzeQuality}
          disabled={loading}
          className="flex items-center gap-1.5 px-2.5 py-1.5 bg-emerald-900 text-emerald-200 rounded-lg text-xs hover:bg-emerald-800 transition-colors disabled:opacity-50"
        >
          <BarChart3 size={12} /> Quality
        </button>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-3 space-y-3">
        {messages.length === 0 && (
          <div className="flex flex-col items-center justify-center h-full text-center px-4">
            <div className="bg-purple-900 rounded-full p-3 mb-3">
              <Sparkles className="text-purple-300" size={20} />
            </div>
            <p className="text-gray-400 text-sm">
              Ask me anything about your session, request a summary, or analyze collaboration quality.
            </p>
          </div>
        )}

        {messages.map((msg, i) => {
          const isUser = msg.role === 'user';
          return (
            <div key={i} className={`flex flex-col ${isUser ? 'items-end' : 'items-start'}`}>
              <span className="text-xs text-gray-500 mb-1 flex items-center gap-1">
                {isUser ? 'You' : <><Bot size={10} /> AI Assistant</>}
              </span>
              <div
                className={`max-w-[90%] px-3 py-2 rounded-xl text-sm leading-relaxed whitespace-pre-wrap ${
                  isUser
                    ? 'bg-purple-600 text-white rounded-tr-sm'
                    : 'bg-gray-700 text-gray-100 rounded-tl-sm'
                }`}
              >
                {msg.content}
              </div>
            </div>
          );
        })}

        {loading && (
          <div className="flex items-start gap-2">
            <span className="text-xs text-gray-500 flex items-center gap-1">
              <Bot size={10} /> AI Assistant
            </span>
            <div className="bg-gray-700 px-3 py-2 rounded-xl rounded-tl-sm">
              <Loader2 size={14} className="text-purple-400 animate-spin" />
            </div>
          </div>
        )}

        <div ref={bottomRef} />
      </div>

      {/* Input */}
      <div className="p-3 border-t border-gray-700 flex gap-2">
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && !e.shiftKey && askQuestion(input)}
          placeholder="Ask about your session..."
          disabled={loading}
          className="flex-1 bg-gray-700 text-gray-100 px-3 py-2 rounded-lg text-sm placeholder-gray-500 focus:outline-none focus:ring-1 focus:ring-purple-500 disabled:opacity-50"
        />
        <button
          onClick={() => askQuestion(input)}
          disabled={loading || !input.trim()}
          className="bg-purple-600 text-white p-2 rounded-lg hover:bg-purple-700 transition-colors disabled:opacity-50"
        >
          <Send size={16} />
        </button>
      </div>
    </div>
  );
}
