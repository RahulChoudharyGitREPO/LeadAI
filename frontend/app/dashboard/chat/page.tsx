"use client";

import React, { useState, useEffect, useRef } from 'react';
import Sidebar from '@/components/Sidebar';
import Navbar from '@/components/Navbar';
import { 
  Send, 
  Loader2,
  Globe,
  Database,
  Plus,
  Compass,
  Search,
  Check,
  AlertTriangle,
  Phone,
  MapPin,
  ExternalLink,
  Info,
  Trash2,
  FileDown
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
import type { Lead, ChatMessage } from '@/lib/types';


export default function ChatPage() {
  const [messages, setMessages] = useState<ChatMessage[]>([
    { role: 'assistant', content: "Hello! I'm your AI Lead Discovery expert. I can search the live web for new business leads. Where should we look today?" }
  ]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  
  const [lastScan, setLastScan] = useState<number | null>(null);
  const [timeAgoStr, setTimeAgoStr] = useState('');
  const [selectedLead, setSelectedLead] = useState<Lead | null>(null);
  const [isClearChatOpen, setIsClearChatOpen] = useState(false);
  const [pitchLoadingId, setPitchLoadingId] = useState<string | null>(null);
  const { api, isLoaded, userId } = useApiClient();
  const chatStorageKey = userId ? `aiChatMessages:${userId}` : null;

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
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
            // deduplicate live stream if necessary based on name
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

  const [isInitialized, setIsInitialized] = useState(false);

  // Load from session storage on mount
  useEffect(() => {
    if (!chatStorageKey) return;

    const savedMsg = sessionStorage.getItem(chatStorageKey);
    if (savedMsg) {
      try { 
        const parsed = JSON.parse(savedMsg);
        if (parsed && parsed.length > 0) {
          setMessages(parsed); 
        }
      } catch {}
    }
    setIsInitialized(true);
  }, [chatStorageKey]);

  // Save to session storage when messages change, but ONLY after initialization
  useEffect(() => {
    if (isInitialized && chatStorageKey) {
      sessionStorage.setItem(chatStorageKey, JSON.stringify(messages));
    }
  }, [messages, isInitialized, chatStorageKey]);

  const clearChat = () => {
    setIsClearChatOpen(true);
  };

  const confirmClearChat = () => {
    const defaultMsg: ChatMessage[] = [{ role: 'assistant', content: "Hello! I'm your AI Lead Discovery expert. I can search the live web for new business leads. Where should we look today?" }];
    setMessages(defaultMsg);
    if (chatStorageKey) sessionStorage.removeItem(chatStorageKey);
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

  const handleSend = async () => {
    if (!input.trim() || loading) return;
    if (!isLoaded) return;
    if (!userId) {
      toast.error('Please sign in before searching leads');
      return;
    }

    const userMsg: ChatMessage = { role: 'user', content: input };
    const placeholderMsg: ChatMessage = { role: 'assistant', content: 'Searching...', leads: [], isStreaming: true };
    setMessages(prev => [...prev, userMsg, placeholderMsg]);
    setInput('');
    setLoading(true);

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
    } catch {
      setMessages(prev => [...prev, { role: 'assistant', content: "I'm having trouble connecting to the discovery engine. Please check your connection." } as ChatMessage]);
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
      await api.post('/leads', {
        ...lead,
        notes: [{ text: `Saved via AI Discovery Hub. Source: ${lead.url || 'Web Search'}` }]
      });
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
    } catch {
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
    <div className="min-h-screen flex bg-slate-100/50 soft-yellow-bg">
      <Sidebar />
      <main className="flex-1 ml-64 min-h-screen flex flex-col h-screen">
        <Navbar />
        
        <div className="flex-1 overflow-hidden p-8 flex flex-col gap-6">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <h1 className="text-4xl font-extrabold text-slate-900 tracking-tight">AI Discovery Hub</h1>
              <p className="text-slate-500 mt-1 font-medium">Real-time business intelligence and lead generation.</p>
            </div>
            <div className="flex flex-col items-end gap-2 text-right">
               <div className="flex items-center gap-3">
                 <Button onClick={clearChat} variant="ghost" size="sm" className="h-9 px-3 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-lg">
                   <Trash2 className="w-4 h-4 mr-2" /> Clear Note
                 </Button>
                 <Button onClick={exportToCSV} variant="outline" size="sm" className="h-9 px-3 border-slate-200 text-slate-600 bg-white shadow-sm hover:shadow-md rounded-lg">
                   <FileDown className="w-4 h-4 mr-2" /> Export Discovered
                 </Button>
                 <div className="flex items-center gap-2 bg-green-500/10 px-4 py-2 rounded-xl border border-green-500/20 shadow-sm ml-2">
                   <span className="w-2.5 h-2.5 bg-green-500 rounded-full animate-pulse shadow-[0_0_8px_rgba(34,197,94,0.6)]" />
                   <span className="text-xs font-bold text-green-700 uppercase tracking-widest">Discovery Engine Active</span>
                 </div>
               </div>
               {timeAgoStr && (
                 <span className="text-[10px] text-slate-400 font-bold mt-2 tracking-widest uppercase">
                   Last scan: {timeAgoStr}
                 </span>
               )}
            </div>
          </div>

          <div className="flex-1 glass rounded-[2.5rem] border-none subtle-shadow flex flex-col overflow-hidden">
            <div ref={scrollRef} className="flex-1 overflow-y-auto p-10 space-y-8">
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
                    {msg.content}
                  </div>

                  {msg.leads && (
                    <div className="w-full mt-6">
                      {/* Search Result Summary Block */}
                      <div className="flex flex-wrap items-center gap-4 mb-6 px-6 py-4 rounded-2xl bg-slate-50/80 border border-slate-200/50 shadow-sm">
                        <div className="flex items-center gap-2">
                           <Search className="w-4 h-4 text-blue-500" />
                           <span className="text-sm font-bold text-slate-700">Found {msg.leads.length} businesses</span>
                        </div>
                        <div className="w-1 h-1 bg-slate-300 rounded-full" />
                        <div className="flex items-center gap-2">
                           <Database className="w-4 h-4 text-green-500" />
                           <span className="text-sm font-bold text-slate-700">Saved {msg.leads.filter(l => l.isSaved && !l.isDuplicate).length} new leads</span>
                        </div>
                        <div className="w-1 h-1 bg-slate-300 rounded-full" />
                        <div className="flex items-center gap-2">
                           <AlertTriangle className="w-4 h-4 text-orange-400" />
                           <span className="text-sm font-bold text-slate-700">Skipped {msg.leads.filter(l => l.isDuplicate && !l.isSaved).length} duplicates</span>
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
                                 {lead.url && (
                                   <a 
                                      href={lead.url} 
                                      target="_blank" 
                                      rel="noopener noreferrer"
                                      onClick={(e) => e.stopPropagation()}
                                      className="flex items-center gap-1 text-[10px] font-bold text-blue-500 bg-blue-50 hover:bg-blue-100 px-3 py-1.5 rounded-full transition-colors"
                                   >
                                      <ExternalLink className="w-3 h-3" /> View Source
                                   </a>
                                 )}
                               </div>
                               
                               <div className="mb-4">
                                 <p className="font-extrabold text-slate-900 uppercase tracking-tight leading-tight line-clamp-1">{lead.name}</p>
                                 <div className="flex flex-col gap-1 mt-2">
                                     <div className="flex items-center gap-2 text-xs font-bold tracking-wide">
                                       <Phone className="w-3.5 h-3.5 text-slate-400" />
                                       {(!lead.phone || lead.phone === 'N/A') ? 
                                          <span className="text-slate-400 italic font-medium">Not Available</span> : 
                                          <span className="text-slate-700">{lead.phone}</span>
                                       }
                                     </div>
                                     <div className="flex items-center gap-2 text-xs font-bold tracking-wide">
                                       <MapPin className="w-3.5 h-3.5 text-slate-400" />
                                       {(!lead.location || lead.location === 'N/A') ? 
                                          <span className="text-slate-400 italic font-medium">Location Unknown</span> : 
                                          <span className="text-slate-700 line-clamp-1">{lead.location}</span>
                                       }
                                     </div>
                                 </div>
                               </div>

                               <p className="text-xs text-slate-500 font-medium line-clamp-2 italic mb-6">
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
              
              {loading && (
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
        </div>
      </main>

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
  );
}
