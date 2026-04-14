'use client';

import { useState } from 'react';
import api from '@/lib/api';
import { QualityScores } from '@/types';
import { BarChart3, Loader2, AlertTriangle, CheckCircle, Lightbulb } from 'lucide-react';

interface CollaborationInsightsProps {
  sessionId: string;
}

function ScoreBar({ label, score }: { label: string; score: number }) {
  const color =
    score >= 70 ? 'bg-green-500' : score >= 40 ? 'bg-yellow-500' : 'bg-red-500';
  const textColor =
    score >= 70
      ? 'text-green-400'
      : score >= 40
        ? 'text-yellow-400'
        : 'text-red-400';

  return (
    <div className="mb-3">
      <div className="flex justify-between text-xs mb-1">
        <span className="text-gray-400">{label}</span>
        <span className={textColor}>{score}/100</span>
      </div>
      <div className="bg-gray-600 rounded-full h-2">
        <div
          className={`${color} h-2 rounded-full transition-all duration-500`}
          style={{ width: `${score}%` }}
        />
      </div>
    </div>
  );
}

export function CollaborationInsights({ sessionId }: CollaborationInsightsProps) {
  const [scores, setScores] = useState<QualityScores | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const analyze = async () => {
    setLoading(true);
    setError('');
    try {
      const res = await api.get<QualityScores>(`/ai/quality/${sessionId}`);
      setScores(res.data);
    } catch {
      setError('Failed to analyze collaboration quality.');
    } finally {
      setLoading(false);
    }
  };

  if (!scores && !loading) {
    return (
      <div className="p-4 flex flex-col items-center justify-center h-full text-center">
        <div className="bg-emerald-900 rounded-full p-3 mb-3">
          <BarChart3 className="text-emerald-300" size={20} />
        </div>
        <p className="text-gray-400 text-sm mb-4">
          Analyze your collaboration quality with AI-powered insights.
        </p>
        <button
          onClick={analyze}
          className="px-4 py-2 bg-emerald-700 text-emerald-100 rounded-lg text-sm font-medium hover:bg-emerald-600 transition-colors"
        >
          Analyze quality
        </button>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="p-4 flex flex-col items-center justify-center h-full">
        <Loader2 size={24} className="text-emerald-400 animate-spin mb-3" />
        <p className="text-gray-400 text-sm">Analyzing collaboration...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-4 text-center">
        <AlertTriangle className="text-red-400 mx-auto mb-2" size={20} />
        <p className="text-red-400 text-sm">{error}</p>
        <button
          onClick={analyze}
          className="mt-3 text-sm text-gray-400 hover:text-white"
        >
          Retry
        </button>
      </div>
    );
  }

  if (!scores) return null;

  const overallIcon =
    scores.overallCollaborationScore >= 70 ? (
      <CheckCircle className="text-green-400" size={16} />
    ) : (
      <AlertTriangle className="text-yellow-400" size={16} />
    );

  return (
    <div className="h-full overflow-y-auto p-4 space-y-4">
      {/* Overall score header */}
      <div className="bg-gray-700 rounded-xl p-4 text-center">
        <div className="flex items-center justify-center gap-2 mb-1">
          {overallIcon}
          <span className="text-white font-semibold">Overall Score</span>
        </div>
        <div className="text-3xl font-bold text-white">
          {scores.overallCollaborationScore}
          <span className="text-lg text-gray-400">/100</span>
        </div>
      </div>

      {/* Individual scores */}
      <div>
        <ScoreBar label="Communication" score={scores.communicationScore} />
        <ScoreBar label="Participation" score={scores.participationScore} />
        <ScoreBar label="Review Quality" score={scores.reviewQualityScore} />
      </div>

      {/* Suggestions */}
      {scores.suggestions.length > 0 && (
        <div>
          <p className="text-xs text-gray-500 uppercase tracking-wide font-medium mb-2 flex items-center gap-1">
            <Lightbulb size={12} /> Suggestions
          </p>
          <div className="space-y-2">
            {scores.suggestions.map((s, i) => (
              <div
                key={i}
                className="bg-gray-700 rounded-lg p-3 text-xs text-gray-300 leading-relaxed"
              >
                {s}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Refresh */}
      <button
        onClick={analyze}
        className="w-full py-2 text-xs text-gray-500 hover:text-gray-300 transition-colors"
      >
        Re-analyze
      </button>
    </div>
  );
}
