"use client";

import React, { useEffect, useState } from 'react';
import Sidebar from '@/components/Sidebar';
import Navbar from '@/components/Navbar';
import axios from 'axios';
import { toast } from 'sonner';
import { 
  PieChart, Pie, Cell, ResponsiveContainer, Tooltip as RechartsTooltip,
  BarChart, Bar, XAxis, YAxis, CartesianGrid
} from 'recharts';
import { PieChart as PieChartIcon, Target, Users, Globe2, Loader2 } from 'lucide-react';
import { Card } from '@/components/ui/card';

const API_URL = 'http://localhost:5000/api';

const SCORE_COLORS = {
  Hot: '#f97316', // orange-500
  Warm: '#eab308', // yellow-500
  Cold: '#3b82f6', // blue-500
};

const STATUS_COLORS = {
  new: '#3b82f6', // blue-500
  contacted: '#eab308', // yellow-500
  booked: '#22c55e', // green-500
  closed: '#14b8a6', // teal-500
};

interface Stats {
  total: number;
  status: Record<string, number>;
  scores: Record<string, number>;
  sources: Record<string, number>;
}

export default function AnalyticsPage() {
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const res = await axios.get(`${API_URL}/leads/stats`);
        setStats(res.data);
      } catch {
        toast.error('Failed to load real-time analytics.');
      } finally {
        setLoading(false);
      }
    };
    fetchStats();
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen flex bg-slate-100/50 soft-yellow-bg">
        <Sidebar />
        <main className="flex-1 ml-64 min-h-screen flex flex-col h-screen relative">
          <Navbar />
          <div className="flex-1 flex items-center justify-center">
             <Loader2 className="w-10 h-10 animate-spin text-yellow-500" />
          </div>
        </main>
      </div>
    );
  }

  // Format data for Recharts PieChart (Scores)
  const scoreData = stats ? Object.entries(stats.scores).map(([name, value]) => ({
    name: name || 'Unscored',
    value
  })) : [];

  // Format data for Recharts BarChart (Status)
  const statusData = stats ? Object.entries(stats.status).map(([name, value]) => ({
    name: name.charAt(0).toUpperCase() + name.slice(1),
    value
  })) : [];

  const totalWebFound = stats?.sources?.web || 0;

  return (
    <div className="min-h-screen flex bg-slate-100/50 soft-yellow-bg">
      <Sidebar />
      <main className="flex-1 ml-64 min-h-screen flex flex-col h-screen relative overflow-y-auto">
        <Navbar />
        
        <div className="p-8 space-y-8 max-w-7xl mx-auto w-full">
          <div>
            <h1 className="text-4xl font-extrabold text-slate-900 tracking-tight flex items-center gap-3">
              <PieChartIcon className="w-8 h-8 text-yellow-500" />
              Global Analytics
            </h1>
            <p className="text-slate-500 mt-1 font-medium">Holistic real-time view of your Lead Generation engine.</p>
          </div>

          {/* Top Metric Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <Card className="glass p-6 border-none ring-0 shadow-xl rounded-[2rem]">
              <div className="flex items-center gap-4">
                <div className="w-14 h-14 rounded-2xl bg-blue-100 flex items-center justify-center text-blue-600">
                  <Users className="w-6 h-6" />
                </div>
                <div>
                  <p className="text-sm font-bold text-slate-400 tracking-widest uppercase">Total CRM Leads</p>
                  <p className="text-4xl font-black text-slate-900 tracking-tighter mt-1">{stats?.total || 0}</p>
                </div>
              </div>
            </Card>

            <Card className="glass p-6 border-none ring-0 shadow-xl rounded-[2rem]">
              <div className="flex items-center gap-4">
                <div className="w-14 h-14 rounded-2xl bg-green-100 flex items-center justify-center text-green-600">
                  <Globe2 className="w-6 h-6" />
                </div>
                <div>
                  <p className="text-sm font-bold text-slate-400 tracking-widest uppercase">Discovered by Web AI</p>
                  <p className="text-4xl font-black text-slate-900 tracking-tighter mt-1">{totalWebFound}</p>
                </div>
              </div>
            </Card>

            <Card className="glass p-6 border-none ring-0 shadow-xl rounded-[2rem]">
              <div className="flex items-center gap-4">
                <div className="w-14 h-14 rounded-2xl bg-orange-100 flex items-center justify-center text-orange-600">
                  <Target className="w-6 h-6" />
                </div>
                <div>
                  <p className="text-sm font-bold text-slate-400 tracking-widest uppercase">Hot Quality Ratio</p>
                  <p className="text-4xl font-black text-slate-900 tracking-tighter mt-1">
                     {stats?.total ? Math.round(((stats.scores?.Hot || 0) / stats.total) * 100) : 0}%
                  </p>
                </div>
              </div>
            </Card>
          </div>

          {/* Charts Row */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mt-4">
            
            {/* Score Distribution Pie Chart */}
            <Card className="glass p-8 border-none ring-0 shadow-xl rounded-[2.5rem] flex flex-col">
               <h3 className="text-lg font-black text-slate-900 uppercase tracking-tight mb-6">Lead Quality Distribution</h3>
               <div className="flex-1 min-h-[300px]">
                 <ResponsiveContainer width="100%" height="100%">
                   <PieChart>
                     <Pie
                       data={scoreData}
                       cx="50%"
                       cy="50%"
                       innerRadius={80}
                       outerRadius={120}
                       paddingAngle={5}
                       dataKey="value"
                       stroke="none"
                     >
                       {scoreData.map((entry, index) => (
                         <Cell key={`cell-${index}`} fill={SCORE_COLORS[entry.name as keyof typeof SCORE_COLORS] || '#cbd5e1'} />
                       ))}
                     </Pie>
                     <RechartsTooltip 
                        contentStyle={{ borderRadius: '16px', border: 'none', boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.1)' }}
                        itemStyle={{ fontWeight: 'bold' }}
                     />
                   </PieChart>
                 </ResponsiveContainer>
               </div>
               <div className="flex items-center justify-center gap-6 mt-4">
                  {['Hot', 'Warm', 'Cold'].map(score => (
                     <div key={score} className="flex items-center gap-2">
                        <span className="w-3 h-3 rounded-full shadow-sm" style={{ backgroundColor: SCORE_COLORS[score as keyof typeof SCORE_COLORS] }} />
                        <span className="font-bold text-sm text-slate-600">{score}</span>
                     </div>
                  ))}
               </div>
            </Card>

            {/* Pipeline Stage Bar Chart */}
            <Card className="glass p-8 border-none ring-0 shadow-xl rounded-[2.5rem] flex flex-col">
               <h3 className="text-lg font-black text-slate-900 uppercase tracking-tight mb-6">Pipeline CRM Stages</h3>
               <div className="flex-1 min-h-[300px]">
                 <ResponsiveContainer width="100%" height="100%">
                   <BarChart data={statusData} margin={{ top: 20, right: 30, left: 0, bottom: 5 }}>
                     <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                     <XAxis 
                       dataKey="name" 
                       axisLine={false} 
                       tickLine={false} 
                       tick={{ fill: '#64748b', fontWeight: 'bold', fontSize: 12 }} 
                       dy={10}
                     />
                     <YAxis 
                       axisLine={false} 
                       tickLine={false} 
                       tick={{ fill: '#64748b', fontWeight: 'bold', fontSize: 12 }}
                     />
                     <RechartsTooltip 
                        cursor={{ fill: '#f8fafc' }}
                        contentStyle={{ borderRadius: '16px', border: 'none', boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.1)' }}
                     />
                     <Bar dataKey="value" radius={[8, 8, 0, 0]} maxBarSize={60}>
                       {statusData.map((entry, index) => {
                         const mapKeys: Record<string, string> = { 'New': 'new', 'Contacted': 'contacted', 'Booked': 'booked', 'Closed': 'closed' };
                         const colorKey = mapKeys[entry.name] as keyof typeof STATUS_COLORS;
                         return <Cell key={`cell-${index}`} fill={STATUS_COLORS[colorKey] || '#3b82f6'} />;
                       })}
                     </Bar>
                   </BarChart>
                 </ResponsiveContainer>
               </div>
            </Card>

          </div>
        </div>
      </main>
    </div>
  );
}
