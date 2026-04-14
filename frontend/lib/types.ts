export type LeadStatus = 'new' | 'contacted' | 'booked' | 'closed';

export type LeadScore = 'Hot' | 'Warm' | 'Cold';

export type LeadNote = {
  text: string;
  createdAt?: string;
};

export type Lead = {
  _id?: string;
  name: string;
  phone: string;
  service?: string;
  date?: string;
  location?: string;
  email?: string;
  website?: string;
  linkedIn?: string;
  status?: LeadStatus;
  leadScore?: LeadScore;
  aiScore?: number;
  intentSignals?: string[];
  opportunityLevel?: 'high' | 'medium' | 'low';
  reason?: string;
  source?: string;
  description?: string;
  notes?: LeadNote[];
  createdAt?: string;
  userId?: string;
  url?: string;
  isSaved?: boolean;
  isDuplicate?: boolean;
};

export type ChatMessage = {
  role: 'assistant' | 'user';
  content: string;
  leads?: Lead[] | null;
  isStreaming?: boolean;
};

export type ChatToolResult = {
  content: string;
};

export type ChatSession = {
  _id: string;
  title: string;
  messages: ChatMessage[];
  updatedAt: string;
  createdAt: string;
};
