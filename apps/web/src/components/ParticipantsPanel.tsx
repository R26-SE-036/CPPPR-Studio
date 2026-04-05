'use client';

import { SessionParticipant } from '@/types';
import { User, Wifi, WifiOff } from 'lucide-react';

interface ParticipantsPanelProps {
  participants: SessionParticipant[];
  currentUserId: string;
}

export function ParticipantsPanel({ participants, currentUserId }: ParticipantsPanelProps) {
  return (
    <div className="p-4 space-y-3">
      <p className="text-xs text-gray-500 uppercase tracking-wide font-medium">
        {participants.length} participant{participants.length !== 1 ? 's' : ''}
      </p>

      {participants.map((p) => (
        <div
          key={p.id}
          className="bg-gray-700 rounded-xl p-3 flex items-center gap-3"
        >
          <div className="bg-gray-600 rounded-full p-2">
            <User size={16} className="text-gray-300" />
          </div>

          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <span className="text-sm font-medium text-white truncate">
                {p.user.username}
              </span>
              {p.userId === currentUserId && (
                <span className="text-xs text-blue-400">(you)</span>
              )}
            </div>
            <div className="flex items-center gap-2 mt-0.5">
              <span className={`text-xs px-1.5 py-0.5 rounded font-medium ${
                p.pairRole === 'DRIVER'
                  ? 'bg-blue-900 text-blue-300'
                  : p.pairRole === 'NAVIGATOR'
                  ? 'bg-purple-900 text-purple-300'
                  : 'bg-gray-600 text-gray-400'
              }`}>
                {p.pairRole}
              </span>
            </div>
          </div>

          {/* Online status */}
          <div className="text-gray-400">
            {p.isOnline ? (
              <Wifi size={14} className="text-green-400" />
            ) : (
              <WifiOff size={14} className="text-gray-600" />
            )}
          </div>
        </div>
      ))}

      {/* Activity stats */}
      {participants.length > 0 && (
        <div className="mt-4 pt-4 border-t border-gray-700">
          <p className="text-xs text-gray-500 mb-3 uppercase tracking-wide font-medium">
            Activity
          </p>
          {participants.map((p) => {
            const totalEdits = participants.reduce((s, x) => s + x.editCount, 0);
            const pct = totalEdits > 0 ? Math.round((p.editCount / totalEdits) * 100) : 0;
            return (
              <div key={p.id} className="mb-2">
                <div className="flex justify-between text-xs text-gray-400 mb-1">
                  <span>{p.user.username}</span>
                  <span>{pct}% edits</span>
                </div>
                <div className="bg-gray-600 rounded-full h-1.5">
                  <div
                    className="bg-blue-500 h-1.5 rounded-full transition-all"
                    style={{ width: `${pct}%` }}
                  />
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}