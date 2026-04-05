'use client';

import { Prompt } from '@/types';
import { Lightbulb, X } from 'lucide-react';

interface PromptBannerProps {
  prompt: Prompt;
  onDismiss: () => void;
}

const promptColors: Record<string, string> = {
  PARTICIPATION_IMBALANCE: 'bg-amber-900 border-amber-600 text-amber-100',
  WEAK_COMMUNICATION: 'bg-blue-900 border-blue-600 text-blue-100',
  WEAK_REVIEW_EXPLANATION: 'bg-purple-900 border-purple-600 text-purple-100',
  ROLE_SWITCH_REMINDER: 'bg-green-900 border-green-600 text-green-100',
  ENCOURAGEMENT: 'bg-teal-900 border-teal-600 text-teal-100',
};

export function PromptBanner({ prompt, onDismiss }: PromptBannerProps) {
  const colorClass = promptColors[prompt.type] || 'bg-gray-800 border-gray-600 text-gray-100';

  return (
    <div className={`border-b px-4 py-3 flex items-start gap-3 ${colorClass}`}>
      <Lightbulb size={18} className="flex-shrink-0 mt-0.5" />
      <p className="flex-1 text-sm leading-relaxed">{prompt.message}</p>
      <button onClick={onDismiss} className="flex-shrink-0 opacity-70 hover:opacity-100">
        <X size={16} />
      </button>
    </div>
  );
}