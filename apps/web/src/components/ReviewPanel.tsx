'use client';

import { useState } from 'react';
import api from '@/lib/api';
import { SessionParticipant } from '@/types';
import { Star, Send, Plus, Trash2 } from 'lucide-react';

interface ReviewPanelProps {
  sessionId: string;
  participants: SessionParticipant[];
  currentUserId: string;
  code: string;
}

interface LineComment {
  lineNumber: number;
  content: string;
}

const RUBRIC = [
  { key: 'codeQuality', label: 'Code quality' },
  { key: 'communication', label: 'Communication' },
  { key: 'problemSolving', label: 'Problem solving' },
  { key: 'collaboration', label: 'Collaboration' },
];

export function ReviewPanel({ sessionId, participants, currentUserId, code }: ReviewPanelProps) {
  const peers = participants.filter((p) => p.userId !== currentUserId);
  const [revieweeId, setRevieweeId] = useState(peers[0]?.userId || '');
  const [overallScore, setOverallScore] = useState(3);
  const [explanation, setExplanation] = useState('');
  const [rubricScores, setRubricScores] = useState<Record<string, number>>({});
  const [comments, setComments] = useState<LineComment[]>([]);
  const [newComment, setNewComment] = useState({ lineNumber: 1, content: '' });
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [reviewId, setReviewId] = useState<string | null>(null);

  const handleSaveDraft = async () => {
    const res = await api.post('/peer-review', {
      sessionId,
      revieweeId,
      overallScore,
      explanation,
      rubricScores,
      comments,
    });
    setReviewId(res.data.id);
  };

  const handleSubmit = async () => {
    setSubmitting(true);
    try {
      // Save draft first if no ID yet
      let id = reviewId;
      if (!id) {
        const res = await api.post('/peer-review', {
          sessionId,
          revieweeId,
          overallScore,
          explanation,
          rubricScores,
          comments,
        });
        id = res.data.id;
      }
      await api.patch(`/peer-review/${id}/submit`);
      setSubmitted(true);
    } finally {
      setSubmitting(false);
    }
  };

  const addComment = () => {
    if (!newComment.content.trim()) return;
    setComments((prev) => [...prev, { ...newComment }]);
    setNewComment({ lineNumber: 1, content: '' });
  };

  const removeComment = (i: number) => {
    setComments((prev) => prev.filter((_, idx) => idx !== i));
  };

  if (submitted) {
    return (
      <div className="p-6 flex flex-col items-center justify-center h-full text-center">
        <div className="bg-green-800 rounded-full p-3 mb-3">
          <Star className="text-green-300" size={24} />
        </div>
        <p className="text-green-300 font-medium">Review submitted!</p>
        <p className="text-gray-500 text-sm mt-2">Your feedback has been recorded.</p>
      </div>
    );
  }

  return (
    <div className="h-full overflow-y-auto p-4 space-y-4">
      {/* Reviewee selector */}
      {peers.length > 1 && (
        <div>
          <label className="text-xs text-gray-400 block mb-1">Reviewing</label>
          <select
            value={revieweeId}
            onChange={(e) => setRevieweeId(e.target.value)}
            className="w-full bg-gray-700 text-gray-100 px-3 py-2 rounded-lg text-sm focus:outline-none"
          >
            {peers.map((p) => (
              <option key={p.userId} value={p.userId}>
                {p.user.username}
              </option>
            ))}
          </select>
        </div>
      )}

      {/* Overall score */}
      <div>
        <label className="text-xs text-gray-400 block mb-2">Overall score</label>
        <div className="flex gap-2">
          {[1, 2, 3, 4, 5].map((n) => (
            <button
              key={n}
              onClick={() => setOverallScore(n)}
              className={`flex-1 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                overallScore >= n
                  ? 'bg-yellow-500 text-black'
                  : 'bg-gray-700 text-gray-400'
              }`}
            >
              {n}
            </button>
          ))}
        </div>
      </div>

      {/* Rubric */}
      <div>
        <label className="text-xs text-gray-400 block mb-2">Rubric scores (1–5)</label>
        <div className="space-y-2">
          {RUBRIC.map(({ key, label }) => (
            <div key={key} className="flex items-center gap-3">
              <span className="text-xs text-gray-400 w-28 flex-shrink-0">{label}</span>
              <input
                type="range"
                min={1}
                max={5}
                value={rubricScores[key] || 3}
                onChange={(e) =>
                  setRubricScores({ ...rubricScores, [key]: Number(e.target.value) })
                }
                className="flex-1 accent-blue-500"
              />
              <span className="text-xs text-gray-300 w-4">
                {rubricScores[key] || 3}
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* Explanation */}
      <div>
        <label className="text-xs text-gray-400 block mb-1">Explanation</label>
        <textarea
          value={explanation}
          onChange={(e) => setExplanation(e.target.value)}
          placeholder="Describe what went well, what could improve, and any specific observations..."
          rows={4}
          className="w-full bg-gray-700 text-gray-100 px-3 py-2 rounded-lg text-sm resize-none focus:outline-none focus:ring-1 focus:ring-blue-500 placeholder-gray-500"
        />
      </div>

      {/* Line comments */}
      <div>
        <label className="text-xs text-gray-400 block mb-2">Line comments</label>
        {comments.map((c, i) => (
          <div key={i} className="flex items-start gap-2 mb-2 bg-gray-700 rounded-lg p-2">
            <span className="text-xs font-mono text-blue-400 mt-0.5 flex-shrink-0">L{c.lineNumber}</span>
            <span className="text-xs text-gray-200 flex-1">{c.content}</span>
            <button onClick={() => removeComment(i)} className="text-gray-500 hover:text-red-400">
              <Trash2 size={12} />
            </button>
          </div>
        ))}

        <div className="flex gap-2">
          <input
            type="number"
            min={1}
            value={newComment.lineNumber}
            onChange={(e) => setNewComment({ ...newComment, lineNumber: Number(e.target.value) })}
            className="w-16 bg-gray-700 text-gray-100 px-2 py-1.5 rounded-lg text-xs font-mono focus:outline-none"
            placeholder="Line"
          />
          <input
            value={newComment.content}
            onChange={(e) => setNewComment({ ...newComment, content: e.target.value })}
            onKeyDown={(e) => e.key === 'Enter' && addComment()}
            placeholder="Comment on this line..."
            className="flex-1 bg-gray-700 text-gray-100 px-3 py-1.5 rounded-lg text-xs focus:outline-none placeholder-gray-500"
          />
          <button onClick={addComment} className="bg-gray-600 text-gray-200 p-1.5 rounded-lg hover:bg-gray-500">
            <Plus size={14} />
          </button>
        </div>
      </div>

      {/* Actions */}
      <div className="flex gap-2 pt-2">
        <button
          onClick={handleSaveDraft}
          className="flex-1 bg-gray-700 text-gray-300 py-2 rounded-lg text-sm hover:bg-gray-600 transition-colors"
        >
          Save draft
        </button>
        <button
          onClick={handleSubmit}
          disabled={submitting}
          className="flex-1 bg-blue-600 text-white py-2 rounded-lg text-sm font-medium hover:bg-blue-700 disabled:opacity-50 transition-colors flex items-center justify-center gap-1.5"
        >
          <Send size={14} />
          {submitting ? 'Submitting...' : 'Submit'}
        </button>
      </div>
    </div>
  );
}