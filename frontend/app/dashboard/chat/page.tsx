"use client";

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { 
  Send,
  Loader2,
  Globe,
  Plus,
  Compass,
  Search,
  Check,
  Phone,
  MapPin,
  ExternalLink,
  Info,
  Trash2,
  FileDown,
  MessageSquarePlus,
  Clock,
  X
} from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { 
  Dialog, 
  DialogContent, 
  DialogTitle, 
  DialogDescription,
  DialogHeader,
  DialogFooter
} from "@/components/ui/dialog";
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import { SOCKET_URL, useApiClient } from '@/lib/api';
import type { Lead, ChatMessage, ChatSession } from '@/lib/types';
import SubscriptionModal from '@/components/SubscriptionModal';


export default function ChatPage() {
  const DEFAULT_MSG: ChatMessage[] = [
    { role: 'assistant', content: "Hello! I'm your AI Lead Discovery expert. I can search the live web for new business leads. Where should we look today?" }
  ];

  const [messages, setMessages] = useState<ChatMessage[]>(DEFAULT_MSG);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  
  const [lastScan, setLastScan] = useState<number | null>(null);
  const [timeAgoStr, setTimeAgoStr] = useState('');
  const [selectedLead, setSelectedLead] = useState<Lead | null>(null);
  const [isClearChatOpen, setIsClearChatOpen] = useState(false);
  const [pitchLoadingId, setPitchLoadingId] = useState<string | null>(null);
  const [showSubscriptionModal, setShowSubscriptionModal] = useState(false);
  const [subscriptionReason, setSubscriptionReason] = useState('SUBSCRIPTION_REQUIRED');
  const [planStatus, setPlanStatus] = useState<{ plan: string; searchesUsed: number; searchLimit: number; isActive: boolean } | null>(null);
  const { api, isLoaded, userId } = useApiClient();

  // === SESSION STATE ===
  const [sessions, setSessions] = useState<ChatSession[]>([]);
  const [activeSessionId, setActiveSessionId] = useState<string | null>(null);
  const [showSessions, setShowSessions] = useState(false);
  const saveTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Fetch plan status on mount — auto-show pricing modal for free users
  useEffect(() => {
    if (!isLoaded || !userId) return;
    api.get('/payment/status').then(res => {
      setPlanStatus(res.data);
      if (res.data.plan === 'free' && res.data.searchesUsed >= res.data.searchLimit) {
        setTimeout(() => setShowSubscriptionModal(true), 800);
      }
    }).catch(() => {});
  }, [isLoaded, userId, api]);

  // Load sessions list
  const fetchSessions = useCallback(async () => {
    if (!isLoaded || !userId) return;
    try {
      const res = await api.get('/chat/sessions');
      setSessions(res.data);
    } catch {
      console.error('Failed to fetch sessions');
    }
  }, [api, isLoaded, userId]);

  useEffect(() => {
    fetchSessions();
  }, [fetchSessions]);

  // Auto-save messages to active session (debounced)
  useEffect(() => {
    if (!activeSessionId || !isLoaded || !userId) return;
    if (messages.length <= 1) return; // Don't save just the default message

    if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current);
    saveTimeoutRef.current = setTimeout(async () => {
      try {
        // Generate title from first user message
        const firstUserMsg = messages.find(m => m.role === 'user');
        const title = firstUserMsg ? firstUserMsg.content.slice(0, 50) : 'New Chat';
        
        await api.patch(`/chat/sessions/${activeSessionId}`, {
          messages: messages.filter(m => !m.isStreaming),
          title
        });
      } catch {
        console.error('Auto-save failed');
      }
    }, 2000);

    return () => { if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current); };
  }, [messages, activeSessionId, api, isLoaded, userId]);

  // Create new session (local only — DB entry created on first message)
  const createNewSession = () => {
    setActiveSessionId(null);
    setMessages(DEFAULT_MSG);
    setLastScan(null);
    setTimeAgoStr('');
    setShowSessions(false);
  };

  // Load a session
  const loadSession = async (sessionId: string) => {
    if (!isLoaded || !userId) return;
    try {
      const res = await api.get(`/chat/sessions/${sessionId}`);
      setActiveSessionId(sessionId);
      setMessages(res.data.messages?.length > 0 ? res.data.messages : DEFAULT_MSG);
      setShowSessions(false);
    } catch {
      toast.error('Failed to load session');
    }
  };

  // Delete a session
  const deleteSession = async (sessionId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!isLoaded || !userId) return;
    try {
      await api.delete(`/chat/sessions/${sessionId}`);
      if (activeSessionId === sessionId) {
        setActiveSessionId(null);
        setMessages(DEFAULT_MSG);
      }
      fetchSessions();
      toast.success('Chat deleted');
    } catch {
      toast.error('Failed to delete session');
    }
  };

  // Auto-load most recent session on mount
  useEffect(() => {
    if (isLoaded && userId && sessions.length > 0 && !activeSessionId) {
      loadSession(sessions[0]._id);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isLoaded, userId, sessions.length]);

  const prevMsgCountRef = useRef(messages.length);
  useEffect(() => {
    // Only scroll when new messages are added, not when leads are updated
    if (messages.length > prevMsgCountRef.current && scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
    prevMsgCountRef.current = messages.length;
  }, [messages]);

  // Timer for "Last scan: X mins ago"
  useEffect(() => {
    if (!lastScan) return;
    const interval = setInterval(() => {
      const seconds = Math.floor((new Date().getTime() - lastScan) / 1000);
      if (seconds < 60) setTimeAgoStr('Just now');
      else {
        const mins = Math.floor(seconds / 60);
        setTimeAgoStr(`${mins} min${mins !== 1 ? 's' : ''} ago`);
      }
    }, 10000);
    return () => clearInterval(interval);
  }, [lastScan]);

  // WebSocket Live Streaming
  useEffect(() => {
    if (!userId) return;

    import('socket.io-client').then(({ default: io }) => {
      const socket = io(SOCKET_URL, { auth: { userId } });
      
      socket.on('lead_stream', (lead: Lead) => {
        setMessages(prev => {
          const newMsgs = [...prev];
          const lastMsg = newMsgs[newMsgs.length - 1];
          if (lastMsg && lastMsg.role === 'assistant' && lastMsg.isStreaming) {
            const exists = lastMsg.leads?.some(l => l.name === lead.name);
            if (!exists) {
              lastMsg.leads = [...(lastMsg.leads || []), lead];
            }
          }
          return newMsgs;
        });
      });

      return () => socket.disconnect();
    });
  }, [userId]);

  const clearChat = () => {
    setIsClearChatOpen(true);
  };

  const confirmClearChat = () => {
    setMessages(DEFAULT_MSG);
    setLastScan(null);
    setTimeAgoStr('');
    setIsClearChatOpen(false);
    toast.success('Chat cleared');
  };

  const exportToCSV = () => {
    let allLeads: Lead[] = [];
    messages.forEach(m => {
      if (m.leads) {
        allLeads = [...allLeads, ...m.leads];
      }
    });
    
    if (allLeads.length === 0) return toast.info('No leads found in chat to export');
    
    const headers = ['Name', 'Phone', 'Location', 'Service', 'Source URL'];
    const rows = allLeads.map(l => [
      `"${l.name.replace(/"/g, '""')}"`,
      `"${l.phone || ''}"`,
      `"${(l.location || '').replace(/"/g, '""')}"`,
      `"${(l.service || '').replace(/"/g, '""')}"`,
      `"${l.url || ''}"`
    ]);
    const csvContent = [headers, ...rows].map(e => e.join(",")).join("\n");
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement("a");
    link.setAttribute("href", URL.createObjectURL(blob));
    link.setAttribute("download", `ai_discovery_leads_${new Date().toISOString().split('T')[0]}.csv`);
    link.click();
    toast.success('Leads list exported');
  };

  const resolveNearMe = async (text: string): Promise<string> => {
    if (!/near me/i.test(text)) return text;
    try {
      const pos = await new Promise<GeolocationPosition>((res, rej) =>
        navigator.geolocation.getCurrentPosition(res, rej, { timeout: 5000 })
      );
      const { latitude, longitude } = pos.coords;
      const geo = await fetch(
        `https://nominatim.openstreetmap.org/reverse?lat=${latitude}&lon=${longitude}&format=json`
      ).then(r => r.json());
      const city = geo.address?.city || geo.address?.town || geo.address?.state_district || geo.address?.state || '';
      if (city) return text.replace(/near me/gi, city);
    } catch {
      // geolocation denied or failed — leave as-is, AI will handle
    }
    return text;
  };

  const handleSend = async () => {
    if (!input.trim() || loading) return;
    if (!isLoaded) return;
    if (!userId) {
      toast.error('Please sign in before searching leads');
      return;
    }

    const resolvedInput = await resolveNearMe(input);
    const userMsg: ChatMessage = { role: 'user', content: resolvedInput };
    const placeholderMsg: ChatMessage = { role: 'assistant', content: '', leads: [], isStreaming: true };
    setMessages(prev => [...prev, userMsg, placeholderMsg]);
    setInput('');
    setLoading(true);

    // Lazy session creation: create DB session on first message
    let sessionId = activeSessionId;
    if (!sessionId) {
      try {
        const sessionRes = await api.post('/chat/sessions', { title: resolvedInput.slice(0, 50), messages: [] });
        sessionId = sessionRes.data._id;
        setActiveSessionId(sessionId);
        fetchSessions();
      } catch {
        console.error('Failed to create session');
      }
    }

    try {
      const res = await api.post('/chat', {
        messages: [...messages, userMsg].map(m => ({ role: m.role, content: m.content }))
      });

      // The live stream populated the leads already, but backend finishes by giving final text
      setMessages(prev => {
        const newMsgs = [...prev];
        const lastMsg = newMsgs[newMsgs.length - 1];
        if (lastMsg && lastMsg.role === 'assistant' && lastMsg.isStreaming) {
          lastMsg.content = res.data.message;
          lastMsg.isStreaming = false;
        }
        return newMsgs;
      });

      setLastScan(new Date().getTime());
      setTimeAgoStr('Just now');
      // Refresh plan status so banner search count updates
      api.get('/payment/status').then(res => setPlanStatus(res.data)).catch(() => {});
    } catch (err: unknown) {
      const axiosErr = err as { response?: { status?: number; data?: { error?: string } } };
      if (axiosErr?.response?.status === 402) {
        const reason = axiosErr.response.data?.error || 'SUBSCRIPTION_REQUIRED';
        setSubscriptionReason(reason);
        setShowSubscriptionModal(true);
        // Remove the empty placeholder message
        setMessages(prev => prev.filter(m => !m.isStreaming));
      } else {
        setMessages(prev => [...prev, { role: 'assistant', content: "I'm having trouble connecting to the discovery engine. Please check your connection." } as ChatMessage]);
      }
    } finally {
      setLoading(false);
    }
  };

  const saveLead = async (msgIdx: number, leadIdx: number, lead: Lead) => {
    if (!userId) {
      toast.error('Please sign in before saving leads');
      return;
    }

    try {
      const payload = {
        name: lead.name,
        phone: lead.phone || 'N/A',
        service: lead.service || '',
        location: lead.location || '',
        email: lead.email || '',
        website: lead.website || '',
        linkedIn: lead.linkedIn || '',
        description: lead.description || '',
        source: lead.source || 'web',
        status: 'new',
        leadScore: lead.leadScore || 'Warm',
        aiScore: lead.aiScore || null,
        intentSignals: lead.intentSignals || [],
        opportunityLevel: lead.opportunityLevel || 'medium',
        reason: lead.reason || '',
        url: lead.url || '',
        notes: [{ text: `Saved via AI Discovery Hub. Source: ${lead.url || 'Web Search'}` }]
      };

      await api.post('/leads', payload);
      toast.success(`${lead.name} added to CRM`);
      
      // Update local state to show as saved
      setMessages(prev => {
        const newMsgs = [...prev];
        const msg = { ...newMsgs[msgIdx] };
        if (msg.leads) {
          const newLeads = [...msg.leads];
          newLeads[leadIdx] = { ...newLeads[leadIdx], isSaved: true, isDuplicate: true };
          msg.leads = newLeads;
        }
        newMsgs[msgIdx] = msg;
        return newMsgs;
      });
    } catch (err: unknown) {
      const errorMsg = err instanceof Error ? err.message : 'Unknown error';
      console.error('Save lead error:', errorMsg);
      toast.error('Failed to save lead');
    }
  };

  const sendWhatsAppPitch = async (lead: Lead) => {
    if (!lead.phone || lead.phone === 'N/A') return;
    
    setPitchLoadingId(lead.name);
    try {
      const res = await api.post('/chat/generate-pitch', {
        leadName: lead.name,
        service: lead.service,
        description: lead.description || lead.notes?.[0]?.text,
        location: lead.location
      });
      
      const pitch = res.data.pitch;
      const phone = lead.phone.replace(/\D/g, '');
      window.open(`https://wa.me/${phone}?text=${encodeURIComponent(pitch)}`, '_blank');
    } catch {
      toast.error('AI pitch failed. Sending generic instead.');
      const phone = lead.phone.replace(/\D/g, '');
      const generic = `Hi ${lead.name}, I discovered your business online and was extremely impressed by your work.`;
      window.open(`https://wa.me/${phone}?text=${encodeURIComponent(generic)}`, '_blank');
    } finally {
      setPitchLoadingId(null);
    }
  };

  return (
    <>
    <div className="flex h-[calc(100vh-80px)] overflow-hidden">
      {/* === SESSION SIDEBAR === */}
      <div className={cn(
        "flex flex-col border-r border-white/20 bg-white/30 backdrop-blur-sm transition-all duration-300 shrink-0 overflow-hidden",
        showSessions ? "w-72" : "w-0"
      )}>
        <div className="p-4 border-b border-slate-200/50 flex items-center justify-between">
          <h3 className="text-sm font-black text-slate-700 uppercase tracking-wider">Chat History</h3>
          <button onClick={() => setShowSessions(false)} className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-400">
            <X className="w-4 h-4" />
          </button>
        </div>
        <button
          onClick={createNewSession}
          className="m-3 h-10 rounded-xl yellow-gradient text-slate-900 font-bold text-sm flex items-center justify-center gap-2 shadow-md hover:shadow-lg transition-all"
        >
          <MessageSquarePlus className="w-4 h-4" /> New Chat
        </button>
        <div className="flex-1 overflow-y-auto px-3 pb-3 space-y-1.5">
          {sessions.map(session => (
            <div
              key={session._id}
              onClick={() => loadSession(session._id)}
              className={cn(
                "w-full text-left p-3 rounded-xl transition-all group flex items-center justify-between cursor-pointer",
                activeSessionId === session._id
                  ? "bg-yellow-400/20 border border-yellow-400/30 shadow-sm"
                  : "hover:bg-white/60 border border-transparent"
              )}
            >
              <div className="flex-1 min-w-0">
                <p className="text-sm font-bold text-slate-800 truncate">{session.title}</p>
                <p className="text-[10px] text-slate-400 font-medium flex items-center gap-1 mt-0.5">
                  <Clock className="w-3 h-3" />
                  {new Date(session.updatedAt).toLocaleDateString()}
                </p>
              </div>
              <button
                onClick={(e) => deleteSession(session._id, e)}
                className="p-1.5 rounded-lg opacity-0 group-hover:opacity-100 hover:bg-red-50 hover:text-red-500 text-slate-400 transition-all"
              >
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            </div>
          ))}
          {sessions.length === 0 && (
            <p className="text-xs text-slate-400 text-center py-8 font-medium">No previous chats</p>
          )}
        </div>
      </div>

      {/* === MAIN CHAT AREA === */}
      <div className="flex-1 overflow-hidden p-4 md:p-8 flex flex-col gap-4">

      {/* === PRICING BANNER (free users) === */}
      {planStatus?.plan === 'free' && (
        <div className="bg-gradient-to-r from-slate-900 to-slate-800 rounded-2xl px-4 py-3 flex flex-wrap items-center gap-3 shadow-lg">
          <div className="flex items-center gap-2 flex-1 min-w-0">
            <span className="text-yellow-400 text-lg">⚡</span>
            <div className="min-w-0">
              <span className="text-white font-bold text-sm">Free Plan</span>
              <span className="text-slate-400 text-xs ml-2">
                {planStatus.searchesUsed}/{planStatus.searchLimit} searches used · 3 results per search
              </span>
            </div>
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            {[
              { label: 'StreamMini', sub: '₹199 · 14 days · 7 searches' },
              { label: 'Stream', sub: '₹349 · 30 days · 14 searches', popular: true },
              { label: 'StreamMax', sub: '₹1000 · 30 days · 30 searches' },
            ].map(p => (
              <button
                key={p.label}
                onClick={() => { setSubscriptionReason('SUBSCRIPTION_REQUIRED'); setShowSubscriptionModal(true); }}
                className={cn(
                  'text-xs font-bold px-3 py-1.5 rounded-lg transition-all whitespace-nowrap',
                  p.popular
                    ? 'bg-yellow-400 text-slate-900 hover:bg-yellow-300'
                    : 'bg-white/10 text-white hover:bg-white/20 border border-white/10'
                )}
              >
                {p.label} <span className="font-normal opacity-70 hidden sm:inline">— {p.sub}</span>
              </button>
            ))}
          </div>
        </div>
      )}

      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <button
            onClick={() => setShowSessions(!showSessions)}
            className="p-2.5 rounded-xl bg-white/50 border border-white/40 text-slate-500 hover:text-yellow-600 hover:bg-white transition-all shadow-sm"
          >
            <Clock className="w-5 h-5" />
          </button>
          <div>
            <h1 className="text-3xl md:text-4xl font-extrabold text-slate-900 tracking-tight">AI Discovery Hub</h1>
            <p className="text-slate-500 mt-1 font-medium text-sm md:text-base">Real-time business intelligence and lead generation.</p>
          </div>
        </div>
        <div className="flex flex-col items-start md:items-end gap-2 text-left md:text-right w-full md:w-auto">
           <div className="flex flex-wrap items-center gap-3">
             <Button onClick={createNewSession} variant="ghost" size="sm" className="h-9 px-3 text-slate-500 hover:text-yellow-600 hover:bg-yellow-50 rounded-lg text-xs md:text-sm">
               <MessageSquarePlus className="w-4 h-4 mr-2" /> New
             </Button>
             <Button onClick={clearChat} variant="ghost" size="sm" className="h-9 px-3 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-lg text-xs md:text-sm">
               <Trash2 className="w-4 h-4 mr-2" /> Clear
             </Button>
             <Button onClick={exportToCSV} variant="outline" size="sm" className="h-9 px-3 border-slate-200 text-slate-600 bg-white shadow-sm hover:shadow-md rounded-lg text-xs md:text-sm">
               <FileDown className="w-4 h-4 mr-2" /> Export
             </Button>
             <div className="flex items-center gap-2 bg-green-500/10 px-3 md:px-4 py-2 rounded-xl border border-green-500/20 shadow-sm">
               <span className="w-2.5 h-2.5 bg-green-500 rounded-full animate-pulse shadow-[0_0_8px_rgba(34,197,94,0.6)]" />
               <span className="text-[10px] md:text-xs font-bold text-green-700 uppercase tracking-widest">Active</span>
             </div>
           </div>
           {timeAgoStr && (
             <span className="text-[10px] text-slate-400 font-bold mt-2 tracking-widest uppercase">
               Last scan: {timeAgoStr}
             </span>
           )}
        </div>
      </div>
          <div className="flex-1 glass rounded-3xl md:rounded-[2.5rem] border-none subtle-shadow flex flex-col overflow-hidden">
            <div ref={scrollRef} className="flex-1 overflow-y-auto p-4 md:p-10 space-y-8">
              {messages.map((msg, msgIdx) => (
                <div key={msgIdx} className={cn(
                  "flex flex-col gap-2 max-w-[85%]",
                  msg.role === 'user' ? "ml-auto items-end" : "mr-auto items-start"
                )}>
                  <div className={cn(
                    "p-6 text-sm font-medium leading-relaxed shadow-sm transition-all",
                    msg.role === 'user' 
                      ? "bg-yellow-400 text-slate-900 rounded-[2rem] rounded-tr-none" 
                      : "bg-white/90 text-slate-700 rounded-[2rem] rounded-tl-none border-none soft-border"
                  )}>
                    {msg.isStreaming ? (
                      <div className="flex items-center gap-3">
                        <Globe className="w-4 h-4 animate-spin text-yellow-500" />
                        <span className="text-xs font-black text-slate-400 animate-pulse uppercase tracking-widest">Searching live web...</span>
                      </div>
                    ) : (
                      msg.content
                    )}
                  </div>

                  {msg.leads && msg.leads.length > 0 && !msg.isStreaming && (
                    <div className="w-full mt-6">
                      {/* Search Result Summary Block */}
                      <div className="flex flex-col gap-3 mb-6 px-6 py-4 rounded-2xl bg-slate-50/80 border border-slate-200/50 shadow-sm">
                        <p className="text-[10px] font-bold text-emerald-600 uppercase tracking-[0.15em]">✨ AI has analyzed these leads for you</p>
                        <div className="flex flex-wrap items-center gap-4">
                          <div className="flex items-center gap-2">
                             <Search className="w-4 h-4 text-blue-500" />
                             <span className="text-sm font-bold text-slate-700">Found {msg.leads.length} businesses</span>
                          </div>
                          <div className="w-1 h-1 bg-slate-300 rounded-full" />
                          <div className="flex items-center gap-2">
                             <span className="text-sm">📧</span>
                             <span className="text-sm font-bold text-slate-700">{msg.leads.filter(l => l.email).length} with email</span>
                          </div>
                          <div className="w-1 h-1 bg-slate-300 rounded-full" />
                          <div className="flex items-center gap-2">
                             <span className="text-sm">🔥</span>
                             <span className="text-sm font-bold text-slate-700">{msg.leads.filter(l => (l.aiScore || 0) >= 8).length} hot leads</span>
                          </div>
                        </div>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 w-full">
                        {msg.leads.map((lead, leadIdx) => {
                          const isSaved = lead.isDuplicate || lead.isSaved;
                          return (
                          <Card 
                            key={leadIdx} 
                            onClick={() => setSelectedLead(lead)}
                            className="p-6 bg-white/90 border border-slate-200/60 rounded-3xl subtle-shadow group flex flex-col justify-between cursor-pointer hover:border-yellow-400/50 transition-all hover:shadow-xl duration-300"
                          >
                            <div>
                               <div className="flex items-start justify-between mb-4">
                                 <div className="flex items-center gap-4">
                                   <div className="w-12 h-12 rounded-2xl bg-slate-100 flex items-center justify-center font-black text-slate-600 text-xl group-hover:bg-yellow-100 group-hover:text-yellow-600 transition-colors shadow-sm">
                                     {lead.name.charAt(0)}
                                   </div>
                                 </div>
                                 <div className="flex items-center gap-2">
                                   {lead.aiScore && (
                                     <span className={`text-[10px] font-black px-2.5 py-1 rounded-lg shadow-sm ${
                                       lead.aiScore >= 8 ? 'bg-orange-400 text-white' :
                                       lead.aiScore >= 5 ? 'bg-yellow-400 text-slate-900' :
                                       'bg-blue-400 text-white'
                                     }`}>
                                       {lead.aiScore}/10
                                     </span>
                                   )}
                                   {lead.opportunityLevel === 'high' && (
                                     <span className="text-[10px] font-black px-2.5 py-1 rounded-lg bg-green-500 text-white shadow-sm">
                                       🔥 High Opp
                                     </span>
                                   )}
                                   {lead.url && (
                                     <a 
                                        href={lead.url} 
                                        target="_blank" 
                                        rel="noopener noreferrer"
                                        onClick={(e) => e.stopPropagation()}
                                        className="flex items-center gap-1 text-[10px] font-bold text-blue-500 bg-blue-50 hover:bg-blue-100 px-3 py-1.5 rounded-full transition-colors"
                                     >
                                        <ExternalLink className="w-3 h-3" /> Source
                                     </a>
                                   )}
                                 </div>
                               </div>
                               
                               <div className="mb-3">
                                 <p className="font-extrabold text-slate-900 uppercase tracking-tight leading-tight line-clamp-1">{lead.name}</p>
                                 <div className="flex flex-col gap-1 mt-2">
                                     <div className="flex items-center gap-2 text-xs font-bold tracking-wide">
                                       <Phone className="w-3.5 h-3.5 text-slate-400" />
                                       {(!lead.phone || lead.phone === 'N/A') ? 
                                          <span className="text-slate-400 italic font-medium">Not Available</span> : 
                                          <span className="text-slate-700">{lead.phone}</span>
                                       }
                                     </div>
                                     {lead.email && (
                                       <div className="flex items-center gap-2 text-xs font-bold tracking-wide">
                                         <span className="text-slate-400">✉</span>
                                         <span className="text-blue-600 truncate">{lead.email}</span>
                                       </div>
                                     )}
                                     {lead.linkedIn && (
                                       <a href={lead.linkedIn} target="_blank" rel="noopener noreferrer" onClick={(e) => e.stopPropagation()} className="flex items-center gap-2 text-xs font-bold tracking-wide text-blue-600 hover:underline">
                                         <span className="text-slate-400">in</span>
                                         <span className="truncate">LinkedIn</span>
                                       </a>
                                     )}
                                     <div className="flex items-center gap-2 text-xs font-bold tracking-wide">
                                       <MapPin className="w-3.5 h-3.5 text-slate-400" />
                                       {(!lead.location || lead.location === 'N/A') ? 
                                          <span className="text-slate-400 italic font-medium">Location Unknown</span> : 
                                          <span className="text-slate-700 line-clamp-1">{lead.location}</span>
                                       }
                                     </div>
                                 </div>
                               </div>

                               {/* Intent Signal Tags */}
                               {lead.intentSignals && lead.intentSignals.length > 0 && (
                                 <div className="flex flex-wrap gap-1.5 mb-3">
                                   {lead.intentSignals.map((signal, i) => (
                                     <span key={i} className="text-[9px] font-bold px-2 py-0.5 rounded-md bg-purple-50 text-purple-600 uppercase tracking-wider">
                                       {signal.replace(/_/g, ' ')}
                                     </span>
                                   ))}
                                 </div>
                               )}

                               {/* Why This Lead? */}
                               {lead.reason && (
                                 <p className="text-[10px] text-emerald-600 font-bold mb-3 bg-emerald-50 px-3 py-1.5 rounded-lg">
                                   🧠 {lead.reason}
                                 </p>
                               )}

                               <p className="text-xs text-slate-500 font-medium line-clamp-2 italic mb-4">
                                 {lead.description || lead.notes?.[0]?.text || "Potential lead detected via AI search."}
                               </p>
                            </div>

                            <div className="flex flex-col gap-3 border-t border-slate-100 pt-4 mt-auto">
                              {isSaved ? (
                                <div className="flex items-center justify-center gap-2 w-full h-[42px] rounded-xl bg-green-50 text-green-600 font-bold text-sm">
                                  <Check className="w-4 h-4" />
                                  Saved to CRM
                                </div>
                              ) : (
                                <Button 
                                  onClick={(e) => { e.stopPropagation(); saveLead(msgIdx, leadIdx, lead); }} 
                                  className="w-full h-[42px] rounded-xl yellow-gradient text-slate-900 font-bold shadow-md hover:shadow-lg transition-all gap-2"
                                >
                                  <Plus className="w-4 h-4" />
                                  Save Lead
                                </Button>
                              )}

                              {lead.phone && lead.phone !== 'N/A' && (
                                <Button 
                                  onClick={(e) => { e.stopPropagation(); sendWhatsAppPitch(lead); }} 
                                  disabled={pitchLoadingId === lead.name}
                                  className="w-full h-[42px] rounded-xl bg-[#25D366] hover:bg-[#128C7E] text-white font-bold shadow-md hover:shadow-lg transition-all gap-2"
                                >
                                  {pitchLoadingId === lead.name ? (
                                    <Loader2 className="w-4 h-4 animate-spin" />
                                  ) : (
                                    <svg className="w-4 h-4 fill-current" viewBox="0 0 24 24"><path d="M12.031 0C5.383 0 0 5.383 0 12.031c0 2.12.553 4.195 1.602 6.015L.175 23.85l6.015-1.427a11.967 11.967 0 005.841 1.517v.001c6.648 0 12.031-5.383 12.031-12.031S18.679 0 12.031 0zm0 21.936c-1.802 0-3.568-.484-5.111-1.398l-.366-.217-3.799.901.916-3.715-.238-.38A9.972 9.972 0 012.031 12.03c0-5.513 4.486-10 10-10 5.513 0 10 4.487 10 10 0 5.514-4.487 10-10 10zm5.493-7.514c-.301-.151-1.782-.879-2.059-.979-.276-.1-.477-.151-.678.151-.201.301-.778.979-.954 1.18-.176.201-.351.226-.652.076-1.503-.755-2.613-1.637-3.585-3.32-.201-.351.251-.251.828-1.503.076-.176.025-.351-.05-.502-.075-.151-.678-1.631-.928-2.233-.251-.553-.502-.678-.502h-.578c-.201 0-.527.075-.803.376-.276.301-1.054 1.029-1.054 2.509 0 1.48 1.079 2.91 1.23 3.111.151.201 2.119 3.235 5.137 4.539 1.831.787 2.545.856 3.427.675.882-.181 1.782-.728 2.033-1.431.251-.703.251-1.305.176-1.431-.075-.126-.276-.201-.577-.352z"></path></svg>
                                  )}
                                  {pitchLoadingId === lead.name ? 'Generating...' : 'Send WhatsApp'}
                                </Button>
                              )}
                            </div>
                          </Card>
                        )})}
                      </div>
                    </div>
                  )}
                </div>
              ))}
              
              {loading && !messages.some(m => m.isStreaming) && (
                <div className="flex flex-col gap-4 items-start">
                  <div className="bg-white/90 p-6 rounded-[2rem] rounded-tl-none flex items-center gap-2 shadow-sm soft-border">
                    <span className="w-2 h-2 bg-yellow-500 rounded-full animate-bounce [animation-delay:-0.3s]" />
                    <span className="w-2 h-2 bg-yellow-500 rounded-full animate-bounce [animation-delay:-0.15s]" />
                    <span className="w-2 h-2 bg-yellow-500 rounded-full animate-bounce" />
                  </div>
                  <div className="flex items-center gap-3 text-xs font-black text-slate-400 ml-4 animate-pulse uppercase tracking-widest">
                     <Globe className="w-4 h-4 animate-spin text-yellow-500" />
                     <span>Engaging outer world & searching live web...</span>
                  </div>
                </div>
              )}
            </div>

            <div className="p-8 bg-white/60 backdrop-blur-md border-t border-slate-200/50">
              <div className="max-w-4xl mx-auto relative group">
                <Compass className="absolute left-6 top-1/2 -translate-y-1/2 w-6 h-6 text-slate-400 group-focus-within:text-yellow-500 transition-colors" />
                <Input 
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleSend()}
                  placeholder="Find me custom home builders in Dallas..."
                  className="w-full pl-16 pr-20 h-16 rounded-3xl border-slate-200/60 bg-white shadow-xl focus-visible:ring-yellow-400 font-bold text-slate-900 placeholder:text-slate-300 placeholder:font-medium"
                />
                <Button 
                  onClick={handleSend} 
                  disabled={loading}
                  className="absolute right-3 top-1/2 -translate-y-1/2 w-12 h-12 yellow-gradient rounded-2xl shadow-lg shadow-yellow-500/20 hover:scale-105 transition-transform"
                >
                  {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : <Send className="w-5 h-5" />}
                </Button>
              </div>
              <p className="text-[10px] text-center text-slate-400 mt-4 font-bold tracking-[0.2em] uppercase">Built with Live Web Scraping</p>
             </div>
          </div>

      {/* View Details Modal */}
      <Dialog open={!!selectedLead} onOpenChange={(open) => !open && setSelectedLead(null)}>
        <DialogContent className="sm:max-w-[500px] glass rounded-3xl border-none p-0 overflow-hidden shadow-2xl">
          {selectedLead && (
            <>
              <div className="p-8 pb-6 bg-slate-50/80 border-b border-slate-200/50">
                 <div className="flex items-start justify-between">
                    <div className="flex items-center gap-4">
                       <div className="w-16 h-16 rounded-[1.5rem] bg-yellow-100 flex items-center justify-center font-black text-yellow-600 text-3xl shadow-sm">
                         {selectedLead.name.charAt(0)}
                       </div>
                       <div>
                          <DialogTitle className="text-2xl font-black text-slate-900 tracking-tight leading-tight uppercase">
                            {selectedLead.name}
                          </DialogTitle>
                          <p className="text-sm font-bold text-slate-400 uppercase tracking-widest mt-1">
                            {selectedLead.service || 'Business Lead'}
                          </p>
                       </div>
                    </div>
                 </div>
              </div>
              
              <div className="p-8 pt-6 space-y-6">
                 <div>
                    <h4 className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-3 flex items-center gap-2">
                       <Info className="w-3 h-3" /> About Business
                    </h4>
                    <DialogDescription className="text-sm text-slate-600 font-medium leading-relaxed italic">
                      &quot;{selectedLead.description || selectedLead.notes?.[0]?.text || "No description provided."}&quot;
                    </DialogDescription>
                 </div>

                 <div className="grid grid-cols-1 gap-4 bg-white/60 p-4 rounded-2xl border border-slate-100 shadow-sm">
                    <div className="flex items-center gap-3">
                       <div className="w-8 h-8 rounded-full bg-blue-50 flex items-center justify-center">
                          <Phone className="w-3.5 h-3.5 text-blue-500" />
                       </div>
                       <div>
                         <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest leading-none">Phone</p>
                         <p className="text-sm font-bold text-slate-700 mt-1">
                           {(!selectedLead.phone || selectedLead.phone === 'N/A') ? 'Not Available' : selectedLead.phone}
                         </p>
                       </div>
                    </div>
                    
                    <div className="w-full h-px bg-slate-100" />

                    <div className="flex items-center gap-3">
                       <div className="w-8 h-8 rounded-full bg-orange-50 flex items-center justify-center">
                          <MapPin className="w-3.5 h-3.5 text-orange-500" />
                       </div>
                       <div>
                         <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest leading-none">Location</p>
                         <p className="text-sm font-bold text-slate-700 mt-1 line-clamp-1">
                           {(!selectedLead.location || selectedLead.location === 'N/A') ? 'Location Unknown' : selectedLead.location}
                         </p>
                       </div>
                    </div>

                    {selectedLead.url && (
                      <>
                        <div className="w-full h-px bg-slate-100" />
                        <div className="flex items-center gap-3">
                           <div className="w-8 h-8 rounded-full bg-purple-50 flex items-center justify-center">
                              <ExternalLink className="w-3.5 h-3.5 text-purple-500" />
                           </div>
                           <div>
                             <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest leading-none">Source Link</p>
                             <a href={selectedLead.url} target="_blank" rel="noopener noreferrer" className="text-sm font-bold text-blue-500 mt-1 hover:underline truncate block w-[300px]">
                               {selectedLead.url}
                             </a>
                           </div>
                        </div>
                      </>
                    )}
                 </div>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>

      {/* Clear Chat Confirmation Modal */}
      <Dialog open={isClearChatOpen} onOpenChange={setIsClearChatOpen}>
        <DialogContent className="glass border-none shadow-2xl p-6 sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="text-xl font-extrabold text-slate-900">Clear Chat History</DialogTitle>
            <DialogDescription className="text-slate-500 font-medium pt-2 text-base leading-relaxed">
              Are you sure you want to clear your entire chat? All unsaved discovered leads will be lost.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="mt-6 flex flex-row gap-3 sm:justify-end">
            <Button variant="ghost" onClick={() => setIsClearChatOpen(false)} className="h-11 px-6 font-bold hover:bg-slate-100/50 rounded-xl border-none text-slate-600 bg-white shadow-sm hover:shadow-md transition-all">Cancel</Button>
            <Button variant="destructive" onClick={confirmClearChat} className="h-11 px-6 bg-red-500 hover:bg-red-600 font-bold rounded-xl shadow-md disabled:opacity-50">Clear Chat</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      </div>
    </div>

    <SubscriptionModal
      open={showSubscriptionModal}
      reason={subscriptionReason}
      onClose={() => setShowSubscriptionModal(false)}
      onSuccess={() => setShowSubscriptionModal(false)}
    />
    </>
  );
}
