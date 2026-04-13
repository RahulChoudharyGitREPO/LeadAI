"use client";

import React, { useState, useEffect, useRef } from 'react';
import { 
  MessageCircle, 
  X, 
  Send, 
  Bot,
  Loader2,
  Globe,
  Database,
  Plus
} from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import type { ChatMessage, ChatToolResult, Lead } from '@/lib/types';
import { useApiClient } from '@/lib/api';

export default function ChatWidget() {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([
    { role: 'assistant', content: 'Hi! I am your lead discovery assistant. I can find your existing leads or search the "outer world" for new ones. What are you looking for?' }
  ]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const { api, isLoaded, userId } = useApiClient();

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  const handleSend = async () => {
    if (!input.trim() || loading) return;
    if (!isLoaded) return;
    if (!userId) {
      toast.error('Please sign in before searching leads');
      return;
    }

    const userMsg: ChatMessage = { role: 'user', content: input };
    setMessages(prev => [...prev, userMsg]);
    setInput('');
    setLoading(true);

    try {
      const res = await api.post('/chat', {
        messages: [...messages, userMsg].map(m => ({ role: m.role, content: m.content }))
      });

      // Check if data (leads) was returned in tool results
      let leads: Lead[] = [];
      if (res.data.data) {
        res.data.data.forEach((tool: ChatToolResult) => {
          const content = JSON.parse(tool.content);
          if (Array.isArray(content)) {
            leads = [...leads, ...content];
          }
        });
      }

      setMessages(prev => [...prev, { 
        role: 'assistant', 
        content: res.data.message,
        leads: leads.length > 0 ? leads : null
      }]);

    } catch (_) {
      console.error(_);
      setMessages(prev => [...prev, { role: 'assistant', content: "I encountered an error. Please try again." }]);
    } finally {
      setLoading(false);
    }
  };

  const saveDiscoveredLead = async (lead: Lead) => {
    if (!userId) {
      toast.error('Please sign in before saving leads');
      return;
    }

    try {
      await api.post('/leads', {
        ...lead,
        notes: [{ text: `Lead discovered via AI Web Search: ${lead.notes}` }]
      });
      toast.success(`${lead.name} added to your database!`);
    } catch {
      toast.error('Failed to save lead');
    }
  };

  return (
    <div className="fixed bottom-8 right-8 z-[100]">
      {/* Launcher */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className={cn(
          "w-16 h-16 rounded-full yellow-gradient shadow-2xl flex items-center justify-center transition-all duration-300 hover:scale-110",
          isOpen ? "rotate-90 scale-0 opacity-0" : "rotate-0 scale-100 opacity-100"
        )}
      >
        <MessageCircle className="w-8 h-8 text-slate-900" />
      </button>

      {/* Chat Window */}
      <div className={cn(
        "absolute bottom-0 right-0 w-[420px] h-[650px] transition-all duration-500 origin-bottom-right shadow-2xl overflow-hidden rounded-3xl",
        isOpen ? "scale-100 opacity-100 translate-y-0" : "scale-0 opacity-0 translate-y-20 pointer-events-none"
      )}>
        <Card className="h-full flex flex-col border-none rounded-none glass">
          {/* Header */}
          <div className="p-5 yellow-gradient flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-white/20 backdrop-blur-md flex items-center justify-center border border-white/30">
                <Bot className="w-6 h-6 text-white" />
              </div>
              <div>
                <p className="font-bold text-slate-900 text-sm">Lead Discovery AI</p>
                <div className="flex items-center gap-1.5">
                  <span className="w-2 h-2 bg-green-400 rounded-full animate-pulse" />
                  <p className="text-xs text-slate-800/80 font-medium capitalize">Real-time Search Active</p>
                </div>
              </div>
            </div>
            <button onClick={() => setIsOpen(false)} className="p-2 rounded-lg hover:bg-black/10 transition-colors">
              <X className="w-5 h-5 text-slate-900" />
            </button>
          </div>

          {/* Messages */}
          <div ref={scrollRef} className="flex-1 overflow-y-auto p-5 space-y-4 bg-slate-50/50">
            {messages.map((msg, index) => (
              <div key={index} className={cn("space-y-2", msg.role === 'user' ? "ml-auto text-right" : "mr-auto text-left")}>
                <div className={cn(
                  "p-4 rounded-2xl shadow-sm text-sm inline-block max-w-[90%]",
                  msg.role === 'user' ? "bg-yellow-400 text-slate-900 rounded-tr-none" : "bg-white text-slate-700 rounded-tl-none border border-slate-100"
                )}>
                  {msg.content}
                </div>
                
                {/* Lead Cards in Chat */}
                {msg.leads && (
                  <div className="grid grid-cols-1 gap-2 mt-2">
                    {msg.leads.map((lead, lIdx) => (
                      <Card key={lIdx} className="p-3 bg-white/80 border-slate-200 rounded-xl subtle-shadow flex items-center justify-between group">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-lg bg-yellow-100 text-yellow-700 flex items-center justify-center font-bold text-xs">
                            {lead.name.charAt(0)}
                          </div>
                          <div>
                            <p className="text-xs font-bold text-slate-900">{lead.name}</p>
                            <p className="text-[10px] text-slate-500">{lead.phone}</p>
                          </div>
                        </div>
                        {lead._id ? (
                           <div className="text-[10px] font-bold text-green-600 bg-green-50 px-2 py-1 rounded-md flex items-center gap-1">
                             <Database className="w-3 h-3" /> In DB
                           </div>
                        ) : (
                          <Button onClick={() => saveDiscoveredLead(lead)} size="sm" className="h-7 rounded-md yellow-gradient text-[10px] font-bold px-3">
                            <Plus className="w-3 h-3 mr-1" /> Save
                          </Button>
                        )}
                      </Card>
                    ))}
                  </div>
                )}
              </div>
            ))}
            {loading && (
              <div className="flex mr-auto flex-col gap-2">
                <div className="bg-white p-4 rounded-2xl rounded-tl-none border border-slate-100 flex gap-1 w-fit">
                  <span className="w-1.5 h-1.5 bg-yellow-500 rounded-full animate-bounce [animation-delay:-0.3s]" />
                  <span className="w-1.5 h-1.5 bg-yellow-500 rounded-full animate-bounce [animation-delay:-0.15s]" />
                  <span className="w-1.5 h-1.5 bg-yellow-500 rounded-full animate-bounce" />
                </div>
                <div className="flex items-center gap-2 text-[10px] text-slate-400 font-bold ml-2">
                   <Globe className="w-3 h-3 animate-spin" /> Searching outer world...
                </div>
              </div>
            )}
          </div>

          {/* Input */}
          <div className="p-4 bg-white border-t border-slate-100">
            <div className="flex gap-2">
              <Input 
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleSend()}
                placeholder="Find my leads from Google..."
                className="rounded-xl border-slate-200 focus:ring-yellow-400 bg-slate-50 h-11"
              />
              <Button onClick={handleSend} disabled={loading} className="yellow-gradient w-11 h-11 p-0 rounded-xl shadow-lg shadow-yellow-500/20">
                {loading ? <Loader2 className="w-5 h-5 animate-spin text-slate-900" /> : <Send className="w-5 h-5 text-slate-900" />}
              </Button>
            </div>
          </div>
        </Card>
      </div>
    </div>
  );
}
