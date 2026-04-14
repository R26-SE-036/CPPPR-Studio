export type Role = 'STUDENT' | 'INSTRUCTOR';
export type PairRole = 'DRIVER' | 'NAVIGATOR' | 'OBSERVER';
export type SessionStatus = 'WAITING' | 'ACTIVE' | 'COMPLETED' | 'CANCELLED';
export type PromptType =
  | 'PARTICIPATION_IMBALANCE'
  | 'WEAK_COMMUNICATION'
  | 'WEAK_REVIEW_EXPLANATION'
  | 'ROLE_SWITCH_REMINDER'
  | 'ENCOURAGEMENT';

export interface User {
  id: string;
  email: string;
  username: string;
  role: Role;
}

export interface SessionParticipant {
  id: string;
  userId: string;
  pairRole: PairRole;
  isOnline: boolean;
  editCount: number;
  chatCount: number;
  user: { id: string; username: string };
}

export interface Session {
  id: string;
  title: string;
  description?: string;
  roomCode: string;
  status: SessionStatus;
  language: string;
  currentCode: string;
  createdAt: string;
  creator: { id: string; username: string };
  participants: SessionParticipant[];
}

export interface ChatMessage {
  id: string;
  content: string;
  createdAt: string;
  user: { id: string; username: string };
}

export interface Prompt {
  type: PromptType;
  message: string;
}

export interface ReviewComment {
  lineNumber: number;
  content: string;
}

// ─── AI Types ────────────────────────────────────────────────

export interface AiMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  createdAt: string;
}

export interface AiAskResponse {
  answer: string;
  conversationId: string;
}

export interface AiExplanationResponse {
  explanation: string;
}

export interface AiImproveResponse {
  original: string;
  improved: string;
}

export interface AiSummaryResponse {
  summary: string;
}

export interface QualityScores {
  communicationScore: number;
  participationScore: number;
  reviewQualityScore: number;
  overallCollaborationScore: number;
  suggestions: string[];
  rawMetrics: Record<string, unknown>;
}