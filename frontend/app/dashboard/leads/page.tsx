"use client";

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import Sidebar from '@/components/Sidebar';
import Navbar from '@/components/Navbar';
import LeadFormModal from '@/components/LeadFormModal';
import { 
  Phone,
  MessageCircle,
  FileDown,
  Search,
  Filter,
  UserCheck,
  Trash2
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from '@/components/ui/table';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import axios from 'axios';
import { toast } from 'sonner';
import type { Lead, LeadStatus } from '@/lib/types';

const API_URL = 'http://localhost:5000/api';
const LEAD_STATUSES: LeadStatus[] = ['new', 'contacted', 'booked', 'closed'];

export default function LeadsPage() {
  const [leads, setLeads] = useState<Lead[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [deleteLeadId, setDeleteLeadId] = useState<string | null>(null);

  const fetchLeads = useCallback(async () => {
    try {
      setLoading(true);
      const res = await axios.get(`${API_URL}/leads`, {
        params: { status: statusFilter, query: searchQuery }
      });
      setLeads(res.data);
    } catch (error) {
      console.error(error);
      toast.error('Failed to load real results. Check server.');
    } finally {
      setLoading(false);
    }
  }, [searchQuery, statusFilter]);

  useEffect(() => {
    fetchLeads();
  }, [fetchLeads]);

  const filteredLeads = useMemo(() => {
    return leads.filter(lead => 
      lead.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      lead.phone.includes(searchQuery) ||
      (lead.service?.toLowerCase().includes(searchQuery.toLowerCase()) ?? false)
    );
  }, [leads, searchQuery]);

  const exportToCSV = () => {
    if (leads.length === 0) return toast.info('No leads to export');
    const headers = ['Name', 'Phone', 'Service', 'Status', 'Score', 'Source', 'Created'];
    const rows = leads.map(l => [
      l.name,
      l.phone,
      l.service || '',
      l.status || 'new',
      l.leadScore || 'Warm',
      l.source || 'manual',
      l.createdAt ? new Date(l.createdAt).toLocaleDateString() : ''
    ]);
    const csvContent = [headers, ...rows].map(e => e.join(",")).join("\n");
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement("a");
    link.setAttribute("href", URL.createObjectURL(blob));
    link.setAttribute("download", `all_leads_${new Date().toISOString().split('T')[0]}.csv`);
    link.click();
    toast.success('Leads list exported');
  };

  const updateStatus = async (id: string | undefined, status: LeadStatus) => {
    if (!id) return;

    try {
      await axios.patch(`${API_URL}/leads/${id}`, { status });
      toast.success(`Status: ${status}`);
      fetchLeads();
    } catch {
      toast.error('Update failed');
    }
  };

  const confirmDelete = async () => {
    if (!deleteLeadId) return;

    try {
      await axios.delete(`${API_URL}/leads/${deleteLeadId}`);
      toast.success('Lead permanently deleted');
      setDeleteLeadId(null);
      fetchLeads();
    } catch {
      toast.error('Failed to delete lead');
    }
  };

  return (
    <div className="min-h-screen flex bg-slate-100/50 soft-yellow-bg">
      <Sidebar />
      <main className="flex-1 ml-64 min-h-screen">
        <Navbar />
        <div className="p-8 space-y-8">
          {/* Header */}
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-4xl font-extrabold text-slate-900 tracking-tight">Leads CRM</h1>
              <p className="text-slate-500 mt-1 font-medium italic">Manage every conversion in one place.</p>
            </div>
            <div className="flex gap-4">
               <Button onClick={exportToCSV} variant="outline" className="h-11 rounded-xl bg-white/50 border-none shadow-sm flex items-center gap-2 hover:bg-white transition-all font-bold">
                  <FileDown className="w-4 h-4" /> Export CSV
               </Button>
               <LeadFormModal onLeadAdded={fetchLeads} />
            </div>
          </div>

          {/* Filtering Bar */}
          <div className="flex flex-col md:flex-row gap-4 justify-between items-center bg-white/40 p-4 rounded-2xl subtle-shadow border-none">
            <div className="relative w-full md:w-[400px]">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <Input 
                placeholder="Search by name, phone, or service..." 
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-12 h-12 rounded-xl bg-white border-none shadow-sm focus-visible:ring-yellow-400"
              />
            </div>
            <div className="flex gap-3">
              <DropdownMenu>
                <DropdownMenuTrigger
                  render={
                    <Button variant="outline" className="h-12 px-6 rounded-xl border-none bg-white shadow-sm flex items-center gap-2 font-bold group" />
                  }
                >
                  <Filter className="w-4 h-4 text-slate-400 group-hover:text-yellow-600" />
                  <span className="capitalize">{statusFilter === 'all' ? 'Filter: All' : `Status: ${statusFilter}`}</span>
                </DropdownMenuTrigger>
                <DropdownMenuContent className="glass min-w-[150px] p-2 rounded-2xl border-none shadow-2xl">
                  {(['all', ...LEAD_STATUSES] as const).map(s => (
                    <DropdownMenuItem key={s} onClick={() => setStatusFilter(s)} className="rounded-lg capitalize font-medium cursor-pointer">
                      {s}
                    </DropdownMenuItem>
                  ))}
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>

          {/* Table Area */}
          <div className="glass rounded-[2rem] overflow-hidden border-none subtle-shadow">
            <div className="overflow-x-auto">
              <Table>
                <TableHeader className="bg-slate-50/20">
                  <TableRow className="hover:bg-transparent border-none">
                    <TableHead className="py-6 pl-8 text-slate-400 font-bold uppercase text-[10px] tracking-widest min-w-[200px]">Lead Details</TableHead>
                    <TableHead className="text-slate-400 font-bold uppercase text-[10px] tracking-widest text-center">Service</TableHead>
                    <TableHead className="text-slate-400 font-bold uppercase text-[10px] tracking-widest text-center">Status</TableHead>
                    <TableHead className="text-slate-400 font-bold uppercase text-[10px] tracking-widest text-center">Score</TableHead>
                    <TableHead className="pr-8 text-slate-400 font-bold uppercase text-[10px] tracking-widest text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredLeads.map((lead) => (
                    <TableRow key={lead._id} className="group hover:bg-white/50 border-none transition-all duration-300">
                      <TableCell className="py-6 pl-8">
                        <div className="flex items-center gap-4">
                          <div className={`w-12 h-12 rounded-2xl flex items-center justify-center font-bold text-lg shadow-sm ${
                            lead.leadScore === 'Hot' ? 'bg-orange-100 text-orange-600' : 'bg-blue-100 text-blue-600'
                          }`}>
                            {lead.name.charAt(0)}
                          </div>
                          <div>
                            <p className="font-extrabold text-slate-900 group-hover:text-yellow-600 transition-colors uppercase tracking-tight">{lead.name}</p>
                            <p className="text-xs text-slate-400 font-bold tracking-widest">{lead.phone}</p>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell className="text-center">
                        <span className="text-slate-700 font-bold text-xs">{lead.service || 'N/A'}</span>
                        <div className="flex items-center justify-center gap-1 mt-1">
                           <span className="text-[10px] text-slate-400 font-medium">Source:</span>
                           <span className={`text-[10px] font-bold uppercase tracking-tight ${lead.source === 'web' ? 'text-blue-500' : 'text-slate-500'}`}>
                              {lead.source || 'CRM'}
                           </span>
                        </div>
                      </TableCell>
                      <TableCell className="text-center">
                        <DropdownMenu>
                          <DropdownMenuTrigger
                            render={
                              <Button variant="ghost" className="h-9 px-4 hover:bg-yellow-100/50 rounded-xl flex items-center gap-2 border-none" />
                            }
                          >
                            <span className={`w-2 h-2 rounded-full ${lead.status === 'booked' ? 'bg-green-500' : 'bg-yellow-500'}`} />
                            <span className="capitalize font-bold text-slate-900">{lead.status || 'new'}</span>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end" className="glass p-2 rounded-2xl border-none shadow-2xl">
                            {LEAD_STATUSES.map(s => (
                              <DropdownMenuItem key={s} onClick={() => updateStatus(lead._id, s)} className="rounded-lg capitalize font-medium cursor-pointer">
                                {s}
                              </DropdownMenuItem>
                            ))}
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                      <TableCell className="text-center">
                         <Badge variant="outline" className={`px-3 py-1 rounded-lg font-black border-none shadow-sm ${
                            lead.leadScore === 'Hot' ? 'bg-orange-400 text-white' : 
                            lead.leadScore === 'Warm' ? 'bg-yellow-400 text-slate-900' : 'bg-blue-400 text-white'
                         }`}>
                           {lead.leadScore || 'Warm'}
                         </Badge>
                      </TableCell>
                      <TableCell className="text-right pr-8">
                        <div className="flex justify-end gap-3 opacity-60 group-hover:opacity-100 transition-opacity">
                          <a href={`tel:${lead.phone}`} className="w-10 h-10 rounded-xl bg-white shadow-sm flex items-center justify-center text-slate-400 hover:text-blue-500 hover:scale-110 transition-all">
                            <Phone className="w-4 h-4" />
                          </a>
                          <a href={`https://wa.me/${lead.phone.replace(/\D/g, '')}`} target="_blank" className="w-10 h-10 rounded-xl bg-white shadow-sm flex items-center justify-center text-slate-400 hover:text-green-500 hover:scale-110 transition-all">
                            <MessageCircle className="w-4 h-4" />
                          </a>
                          <button onClick={() => setDeleteLeadId(lead._id as string)} className="w-10 h-10 rounded-xl bg-white shadow-sm flex items-center justify-center text-slate-400 hover:text-red-500 hover:bg-red-50 hover:scale-110 transition-all cursor-pointer border-none">
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                  {filteredLeads.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={6} className="h-60 text-center font-bold text-slate-400">
                        <div className="flex flex-col items-center gap-4">
                           <UserCheck className="w-12 h-12 opacity-20" />
                           {loading ? 'Loading leads...' : 'No leads found matching your filters.'}
                        </div>
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </div>
          </div>
        </div>
      </main>

      <Dialog open={!!deleteLeadId} onOpenChange={(open) => !open && setDeleteLeadId(null)}>
        <DialogContent className="glass border-none shadow-2xl p-6 sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="text-xl font-extrabold text-slate-900">Delete Lead</DialogTitle>
            <DialogDescription className="text-slate-500 font-medium pt-2 text-base leading-relaxed">
              Are you sure you want to permanently delete this lead? This action is irreversible.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="mt-6 flex flex-row gap-3 sm:justify-end">
            <Button variant="ghost" onClick={() => setDeleteLeadId(null)} className="h-11 px-6 font-bold hover:bg-slate-100/50 rounded-xl border-none text-slate-600 bg-white shadow-sm hover:shadow-md transition-all">Cancel</Button>
            <Button variant="destructive" onClick={confirmDelete} className="h-11 px-6 bg-red-500 hover:bg-red-600 font-bold rounded-xl shadow-md disabled:opacity-50">Delete Forever</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
