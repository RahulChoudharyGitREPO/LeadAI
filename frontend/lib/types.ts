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
  status?: LeadStatus;
  leadScore?: LeadScore;
  source?: string;
  description?: string;
  notes?: LeadNote[];
  createdAt?: string;
};

export type ChatMessage = {
  role: 'assistant' | 'user';
  content: string;
  leads?: Lead[] | null;
};

export type ChatToolResult = {
  content: string;
};
