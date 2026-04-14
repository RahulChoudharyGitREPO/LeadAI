"use client";

import React, { useCallback, useEffect, useState } from 'react';
import LeadFormModal from '@/components/LeadFormModal';
import Link from 'next/link';
import { 
  Users, 
  CheckCircle, 
  ArrowUpRight,
  MessageCircle,
  ExternalLink,
  Plus,
  Target,
  Sparkles
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from '@/components/ui/table';
import type { Lead } from '@/lib/types';
import { useApiClient } from '@/lib/api';

export default function DashboardOverview() {
  const [leads, setLeads] = useState<Lead[]>([]);
  const [loading, setLoading] = useState(true);
  const { api, isLoaded, userId } = useApiClient();

  const fetchLeads = useCallback(async () => {
    if (!isLoaded) return;
    if (!userId) {
      setLeads([]);
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      const res = await api.get('/leads');
      setLeads(res.data);
    } catch (error) {
      console.error(error);
      setLeads([]);
    } finally {
      setLoading(false);
    }
  }, [api, isLoaded, userId]);

  useEffect(() => {
    fetchLeads();
  }, [fetchLeads]);

  const stats = [
    { name: 'Total Leads', value: leads.length, icon: Users, color: 'bg-blue-500' },
    { name: 'Contacted', value: leads.filter(l => l.status === 'contacted').length, icon: MessageCircle, color: 'bg-yellow-500' },
    { name: 'Booked', value: leads.filter(l => l.status === 'booked').length, icon: CheckCircle, color: 'bg-green-500' },
  ];

  const recentLeads = leads.slice(0, 5);

  // Top 5 leads to contact today: sorted by AI score, only uncontacted
  const topLeads = [...leads]
    .filter(l => l.status === 'new' && (l.aiScore || 0) > 0)
    .sort((a, b) => (b.aiScore || 0) - (a.aiScore || 0))
    .slice(0, 5);

  return (
    <div className="p-4 md:p-8 space-y-10">
      {/* Header Section */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl md:text-4xl font-extrabold text-slate-900 tracking-tight">Overview</h1>
          <p className="text-slate-500 mt-2 text-base md:text-lg">Real-time performance summary.</p>
        </div>
        <LeadFormModal onLeadAdded={fetchLeads} />
      </div>

          {/* Stats Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {stats.map((stat) => (
              <StatCard key={stat.name} {...stat} />
            ))}
          </div>

          {/* 🔥 Top 5 Leads to Contact Today */}
          {topLeads.length > 0 && (
            <div className="glass rounded-[2rem] overflow-hidden subtle-shadow border-none">
              <div className="p-6 md:p-8 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-orange-500 flex items-center justify-center text-white shadow-lg">
                    <Target className="w-5 h-5" />
                  </div>
                  <div>
                    <h2 className="text-xl md:text-2xl font-bold text-slate-900">Best Leads to Contact Today</h2>
                    <p className="text-xs text-emerald-600 font-bold mt-0.5 flex items-center gap-1">
                      <Sparkles className="w-3 h-3" /> AI has analyzed these leads for you
                    </p>
                  </div>
                </div>
              </div>
              <div className="px-4 md:px-6 pb-6 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
                {topLeads.map((lead) => (
                  <div key={lead._id} className="p-4 rounded-2xl bg-white/70 border border-slate-100 hover:border-yellow-400/50 hover:shadow-md transition-all group">
                    <div className="flex items-center justify-between mb-2">
                      <div className="w-9 h-9 rounded-xl bg-slate-100 flex items-center justify-center font-black text-slate-600 text-sm group-hover:bg-yellow-100 group-hover:text-yellow-600 transition-colors">
                        {lead.name.charAt(0)}
                      </div>
                      <span className={`text-[10px] font-black px-2 py-0.5 rounded-md shadow-sm ${
                        (lead.aiScore || 0) >= 8 ? 'bg-orange-400 text-white' :
                        (lead.aiScore || 0) >= 5 ? 'bg-yellow-400 text-slate-900' :
                        'bg-blue-400 text-white'
                      }`}>
                        {lead.aiScore}/10
                      </span>
                    </div>
                    <p className="font-extrabold text-slate-900 text-sm tracking-tight line-clamp-1 uppercase">{lead.name}</p>
                    <p className="text-[10px] text-slate-400 font-bold mt-0.5">{lead.service || 'General'}</p>
                    {lead.reason && (
                      <p className="text-[9px] text-emerald-600 font-bold mt-2 bg-emerald-50 px-2 py-1 rounded-md line-clamp-2">
                        🧠 {lead.reason}
                      </p>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Quick Actions / Recent Activity Area */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* Recent Leads Summary */}
            <div className="lg:col-span-2 glass rounded-[2rem] overflow-hidden subtle-shadow border-none">
              <div className="p-8 flex items-center justify-between">
                <div>
                  <h2 className="text-2xl font-bold text-slate-900">Recent Leads</h2>
                  <p className="text-sm text-slate-500 mt-1">Latest responses from your conversion AI.</p>
                </div>
                <Link href="/dashboard/leads">
                  <Button variant="ghost" className="text-yellow-600 hover:text-yellow-700 hover:bg-yellow-50 font-bold gap-2">
                    View All <ExternalLink className="w-4 h-4" />
                  </Button>
                </Link>
              </div>
              
              <div className="px-2 pb-6 overflow-x-auto">
                <Table>
                  <TableHeader className="bg-transparent">
                    <TableRow className="hover:bg-transparent border-none">
                      <TableHead className="pl-6 text-slate-400 font-bold uppercase text-[10px] tracking-widest">Lead</TableHead>
                      <TableHead className="text-slate-400 font-bold uppercase text-[10px] tracking-widest text-center">Status</TableHead>
                      <TableHead className="pr-6 text-slate-400 font-bold uppercase text-[10px] tracking-widest text-right">Activity</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {recentLeads.map((lead) => (
                      <TableRow key={lead._id} className="group hover:bg-white/40 border-none transition-all">
                        <TableCell className="py-4 pl-6">
                          <div className="flex items-center gap-4">
                            <div className="w-10 h-10 rounded-2xl bg-slate-100 flex items-center justify-center font-bold text-slate-600 text-sm">
                              {lead.name.charAt(0)}
                            </div>
                            <div>
                              <p className="font-bold text-slate-900">{lead.name}</p>
                              <p className="text-xs text-slate-400">{lead.service || 'General'}</p>
                            </div>
                          </div>
                        </TableCell>
                        <TableCell className="text-center">
                          <span className={`px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                            lead.status === 'booked' ? 'bg-green-100 text-green-600' : 'bg-yellow-100 text-yellow-600'
                          }`}>
                            {lead.status}
                          </span>
                        </TableCell>
                        <TableCell className="pr-6 text-right text-slate-500 font-medium text-sm">
                          {lead.createdAt ? new Date(lead.createdAt).toLocaleDateString() : 'New'}
                        </TableCell>
                      </TableRow>
                    ))}
                    {recentLeads.length === 0 && (
                       <TableRow>
                         <TableCell colSpan={3} className="h-40 text-center text-slate-400 font-medium">
                            {loading ? 'Loading recent leads...' : 'Waiting for your first AI-captured lead...'}
                         </TableCell>
                       </TableRow>
                    )}
                  </TableBody>
                </Table>
              </div>
            </div>

            {/* Quick Actions Card */}
            <div className="space-y-6">
              <Card className="p-8 glass rounded-[2rem] border-none subtle-shadow">
                <h3 className="text-xl font-bold text-slate-900 mb-6">Discovery Tools</h3>
                <div className="space-y-4">
                   <Link href="/dashboard/chat" className="block p-4 rounded-2xl bg-white/50 hover:bg-white hover:scale-[1.02] transition-all border-none group">
                     <div className="flex items-center gap-4">
                       <div className="w-10 h-10 rounded-xl yellow-gradient flex items-center justify-center text-white">
                         <MessageCircle className="w-5 h-5" />
                       </div>
                       <div>
                         <p className="font-bold text-slate-900 group-hover:text-yellow-600">AI Discovery</p>
                         <p className="text-xs text-slate-500">Find leads from the web</p>
                       </div>
                     </div>
                   </Link>
                   <Link href="/dashboard/leads" className="block p-4 rounded-2xl bg-white/50 hover:bg-white hover:scale-[1.02] transition-all border-none group">
                     <div className="flex items-center gap-4">
                       <div className="w-10 h-10 rounded-xl bg-blue-500 flex items-center justify-center text-white">
                         <Users className="w-5 h-5" />
                       </div>
                       <div>
                         <p className="font-bold text-slate-900 group-hover:text-blue-600">Lead CRM</p>
                         <p className="text-xs text-slate-500">Manage existing contacts</p>
                       </div>
                     </div>
                   </Link>
                </div>
              </Card>

              <Card className="p-8 yellow-gradient rounded-[2rem] border-none subtle-shadow text-slate-900 relative overflow-hidden group">
                <div className="relative z-10">
                  <h3 className="text-xl font-bold mb-2">Build your pipeline</h3>
                  <p className="text-sm opacity-80 mb-6">Launch a discovery campaign to find real-world leads today.</p>
                  <Link href="/dashboard/chat">
                    <Button className="bg-white text-slate-900 hover:bg-slate-50 font-bold rounded-xl w-full h-12 shadow-lg">
                      Start Discovery
                    </Button>
                  </Link>
                </div>
                <Plus className="absolute -right-6 -bottom-6 w-32 h-32 opacity-10 group-hover:scale-110 transition-transform duration-500" />
              </Card>
            </div>
      </div>
    </div>
  );
}

type StatCardProps = {
  name: string;
  value: number;
  icon: LucideIcon;
  color: string;
};

function StatCard({ name, value, icon: Icon, color }: StatCardProps) {
  return (
    <Card className="p-8 glass rounded-[2rem] border-none subtle-shadow floating-card group flex items-center gap-6">
      <div className={`w-16 h-16 rounded-[1.5rem] flex items-center justify-center text-white shadow-2xl transition-transform group-hover:scale-110 duration-300 ${color}`}>
        <Icon className="w-7 h-7" />
      </div>
      <div>
        <p className="text-slate-500 font-bold text-xs uppercase tracking-widest">{name}</p>
        <h3 className="text-4xl font-black text-slate-900 mt-1">{value}</h3>
      </div>
      <ArrowUpRight className="ml-auto w-6 h-6 text-slate-300 group-hover:text-yellow-500 transition-colors" />
    </Card>
  );
}
