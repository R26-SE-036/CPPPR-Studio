'use client';

import { useState } from 'react';
import api from '@/lib/api';
import { AiImproveResponse } from '@/types';
import { Sparkles, Check, X, Loader2 } from 'lucide-react';

interface AiReviewHelperProps {
  sessionId: string;
  comment: string;
  onAccept: (improved: string) => void;
}

export function AiReviewHelper({ sessionId, comment, onAccept }: AiReviewHelperProps) {
  const [loading, setLoading] = useState(false);
  const [improved, setImproved] = useState<string | null>(null);
  const [error, setError] = useState('');

  const handleImprove = async () => {
    if (!comment.trim() || comment.trim().length < 2) return;
    setLoading(true);
    setError('');
    setImproved(null);

    try {
      const res = await api.post<AiImproveResponse>('/ai/improve-review', {
        sessionId,
        comment,
      });
      setImproved(res.data.improved);
    } catch {
      setError('Could not improve comment.');
    } finally {
      setLoading(false);
    }
  };

  if (improved) {
    return (
      <div className="bg-purple-900/30 border border-purple-700 rounded-lg p-3 mt-2 space-y-2">
        <p className="text-xs text-purple-300 font-medium flex items-center gap-1">
          <Sparkles size={12} /> AI Suggestion
        </p>
        <p className="text-sm text-gray-200 leading-relaxed">{improved}</p>
        <div className="flex gap-2">
          <button
            onClick={() => {
              onAccept(improved);
              setImproved(null);
            }}
            className="flex items-center gap-1 px-3 py-1 bg-green-700 text-green-100 rounded text-xs hover:bg-green-600 transition-colors"
          >
            <Check size={12} /> Accept
          </button>
          <button
            onClick={() => setImproved(null)}
            className="flex items-center gap-1 px-3 py-1 bg-gray-700 text-gray-300 rounded text-xs hover:bg-gray-600 transition-colors"
          >
            <X size={12} /> Dismiss
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="mt-1">
      <button
        onClick={handleImprove}
        disabled={loading || !comment.trim() || comment.trim().length < 2}
        className="flex items-center gap-1 text-xs text-purple-400 hover:text-purple-300 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
      >
        {loading ? (
          <Loader2 size={12} className="animate-spin" />
        ) : (
          <Sparkles size={12} />
        )}
        {loading ? 'Improving...' : '✨ Improve with AI'}
      </button>
      {error && <p className="text-xs text-red-400 mt-1">{error}</p>}
    </div>
  );
}
