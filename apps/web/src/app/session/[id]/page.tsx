'use client';

import { useEffect, useState, useRef, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth-context';
import api from '@/lib/api';
import { Session, ChatMessage, Prompt, PairRole } from '@/types';
import { io, Socket } from 'socket.io-client';
import dynamic from 'next/dynamic';
import { PromptBanner } from '@/components/PromptBanner';
import { ChatPanel } from '@/components/ChatPanel';
import { ParticipantsPanel } from '@/components/ParticipantsPanel';
import { ReviewPanel } from '@/components/ReviewPanel';
import { AiAssistantPanel } from '@/components/AiAssistantPanel';
import { CollaborationInsights } from '@/components/CollaborationInsights';
import {
  ArrowLeftRight,
  MessageSquare,
  Users,
  Star,
  Code2,
  Bot,
  BarChart3,
} from 'lucide-react';

// Monaco must be dynamically imported (browser-only)
const MonacoEditor = dynamic(() => import('@/components/CodeEditor'), {
  ssr: false,
});

const WS_URL = process.env.NEXT_PUBLIC_WS_URL || 'http://localhost:4000';

export default function SessionPage() {
  const params = useParams();
  const router = useRouter();
  const { user, token } = useAuth();
  const sessionId = params.id as string;

  const [session, setSession] = useState<Session | null>(null);
  const [code, setCode] = useState('// Start coding here...');
  const [myRole, setMyRole] = useState<PairRole>('OBSERVER');
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [activePanel, setActivePanel] = useState<
    'chat' | 'participants' | 'review' | 'ai' | 'insights'
  >('chat');
  const [prompt, setPrompt] = useState<Prompt | null>(null);
  const [loading, setLoading] = useState(true);

  const collabSocket = useRef<Socket | null>(null);
  const chatSocket = useRef<Socket | null>(null);

  /**
   * Helper: extract current user's role from a session object.
   * This is the SINGLE source of truth for role state on the frontend.
   */
  const extractMyRole = useCallback(
    (sessionData: Session): PairRole => {
      const me = sessionData.participants.find(
        (p) => p.userId === user?.id,
      );
      return me ? me.pairRole : 'OBSERVER';
    },
    [user],
  );

  /**
   * Helper: fetch fresh session from API and update BOTH session + myRole.
   * Used after join/leave events to always be authoritative from backend.
   */
  const refreshSession = useCallback(() => {
    api.get(`/sessions/${sessionId}`).then((res) => {
      const sessionData = res.data as Session;
      setSession(sessionData);
      setMyRole(extractMyRole(sessionData));
    });
  }, [sessionId, extractMyRole]);

  // Fetch initial session data
  useEffect(() => {
    if (!sessionId || !user) return;
    api.get(`/sessions/${sessionId}`).then((res) => {
      const sessionData = res.data as Session;
      setSession(sessionData);
      setCode(sessionData.currentCode || '// Start coding here...');
      setMyRole(extractMyRole(sessionData));
      setLoading(false);
    });
  }, [sessionId, user, extractMyRole]);

  // Setup WebSocket connections
  useEffect(() => {
    if (!token || !sessionId || !user) return;

    // Collab socket
    collabSocket.current = io(`${WS_URL}/collab`, {
      auth: { token },
      transports: ['websocket'],
    });

    collabSocket.current.emit('session:join', { sessionId });

    // session:state — initial state from gateway; set code AND role
    collabSocket.current.on(
      'session:state',
      (data: {
        code: string;
        language: string;
        participants: Array<{ userId: string; pairRole: PairRole }>;
      }) => {
        setCode(data.code);
        const me = data.participants.find((p) => p.userId === user.id);
        if (me) setMyRole(me.pairRole);
      },
    );

    collabSocket.current.on('code:update', (data: { code: string }) => {
      setCode(data.code);
    });

    // role:updated — authoritative role update from backend
    collabSocket.current.on(
      'role:updated',
      (
        participants: Array<{
          userId: string;
          username: string;
          pairRole: PairRole;
        }>,
      ) => {
        const me = participants.find((p) => p.userId === user.id);
        if (me) setMyRole(me.pairRole);
        setSession((prev) =>
          prev
            ? {
                ...prev,
                participants: prev.participants.map((p) => {
                  const updated = participants.find(
                    (u) => u.userId === p.userId,
                  );
                  return updated
                    ? { ...p, pairRole: updated.pairRole }
                    : p;
                }),
              }
            : prev,
        );
      },
    );

    // participant:joined — refetch full session to get accurate participant list + roles
    collabSocket.current.on('participant:joined', () => {
      refreshSession();
    });

    // participant:left — refetch full session to get accurate state
    collabSocket.current.on('participant:left', () => {
      refreshSession();
    });

    collabSocket.current.on('prompt:new', (p: Prompt) => {
      setPrompt(p);
    });

    // Chat socket
    chatSocket.current = io(`${WS_URL}/chat`, {
      auth: { token },
      transports: ['websocket'],
    });

    chatSocket.current.emit('chat:join', { sessionId });

    chatSocket.current.on('chat:history', (history: ChatMessage[]) => {
      setMessages(history);
    });

    chatSocket.current.on('chat:message', (msg: ChatMessage) => {
      setMessages((prev) => [...prev, msg]);
    });

    return () => {
      collabSocket.current?.disconnect();
      chatSocket.current?.disconnect();
    };
  }, [token, sessionId, user, refreshSession]);

  const handleCodeChange = useCallback(
    (value: string | undefined) => {
      if (!value || myRole !== 'DRIVER') return;
      setCode(value);
      collabSocket.current?.emit('code:change', {
        code: value,
        sessionId,
      });
    },
    [myRole, sessionId],
  );

  const handleRoleSwitch = () => {
    collabSocket.current?.emit('role:switch', { sessionId });
  };

  const handleSendMessage = (content: string) => {
    chatSocket.current?.emit('chat:message', { sessionId, content });
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center text-gray-500">
        Loading session...
      </div>
    );
  }

  if (!session) {
    return (
      <div className="min-h-screen flex items-center justify-center text-red-500">
        Session not found
      </div>
    );
  }

  const isDriver = myRole === 'DRIVER';

  // Role badge color: DRIVER=blue, NAVIGATOR=purple, OBSERVER=gray
  const roleBadgeClass =
    myRole === 'DRIVER'
      ? 'bg-blue-600 text-white'
      : myRole === 'NAVIGATOR'
        ? 'bg-purple-600 text-white'
        : 'bg-gray-600 text-gray-200';

  return (
    <div className="h-screen flex flex-col bg-gray-900">
      {/* Header */}
      <header className="bg-gray-800 border-b border-gray-700 px-4 py-3 flex items-center justify-between flex-shrink-0">
        <div className="flex items-center gap-3">
          <button
            onClick={() => router.push('/dashboard')}
            className="text-gray-400 hover:text-white"
          >
            <Code2 size={20} />
          </button>
          <span className="text-white font-medium">{session.title}</span>
          <span className="text-gray-500 font-mono text-sm">
            {session.roomCode}
          </span>
        </div>

        <div className="flex items-center gap-3">
          {/* Role badge — uses distinct colors for all 3 roles */}
          <span
            className={`px-3 py-1 rounded-full text-xs font-bold ${roleBadgeClass}`}
          >
            {myRole}
          </span>

          {/* Role switch button — only show for DRIVER/NAVIGATOR */}
          {(myRole === 'DRIVER' || myRole === 'NAVIGATOR') && (
            <button
              onClick={handleRoleSwitch}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-gray-700 text-gray-200 rounded-lg text-sm hover:bg-gray-600 transition-colors"
            >
              <ArrowLeftRight size={14} /> Switch role
            </button>
          )}
        </div>
      </header>

      {/* Prompt banner */}
      {prompt && (
        <PromptBanner prompt={prompt} onDismiss={() => setPrompt(null)} />
      )}

      {/* Main layout */}
      <div className="flex flex-1 overflow-hidden">
        {/* Code editor (left/main area) */}
        <div className="flex-1 overflow-hidden">
          <MonacoEditor
            code={code}
            language={session.language}
            onChange={handleCodeChange}
            readOnly={!isDriver}
          />
        </div>

        {/* Right sidebar */}
        <div className="w-80 bg-gray-800 border-l border-gray-700 flex flex-col">
          {/* Tab bar */}
          <div className="flex border-b border-gray-700">
            {[
              { key: 'chat', icon: MessageSquare, label: 'Chat' },
              { key: 'participants', icon: Users, label: 'People' },
              { key: 'review', icon: Star, label: 'Review' },
              { key: 'ai', icon: Bot, label: 'AI' },
              { key: 'insights', icon: BarChart3, label: 'Insights' },
            ].map(({ key, icon: Icon, label }) => (
              <button
                key={key}
                onClick={() =>
                  setActivePanel(key as typeof activePanel)
                }
                className={`flex-1 flex flex-col items-center gap-1 py-2.5 text-xs transition-colors ${
                  activePanel === key
                    ? 'text-blue-400 border-b-2 border-blue-400'
                    : 'text-gray-500 hover:text-gray-300'
                }`}
              >
                <Icon size={16} />
                {label}
              </button>
            ))}
          </div>

          {/* Panel content */}
          <div className="flex-1 overflow-hidden">
            {activePanel === 'chat' && (
              <ChatPanel
                messages={messages}
                currentUserId={user?.id || ''}
                onSend={handleSendMessage}
              />
            )}
            {activePanel === 'participants' && (
              <ParticipantsPanel
                participants={session.participants}
                currentUserId={user?.id || ''}
              />
            )}
            {activePanel === 'review' && (
              <ReviewPanel
                sessionId={sessionId}
                participants={session.participants}
                currentUserId={user?.id || ''}
                code={code}
              />
            )}
            {activePanel === 'ai' && (
              <AiAssistantPanel sessionId={sessionId} />
            )}
            {activePanel === 'insights' && (
              <CollaborationInsights sessionId={sessionId} />
            )}
          </div>
        </div>
      </div>
    </div>
  );
}