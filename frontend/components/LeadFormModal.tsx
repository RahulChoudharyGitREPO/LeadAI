"use client";

import React, { useState, type FormEvent } from 'react';
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle, 
  DialogTrigger,
  DialogFooter
} from "@/components/ui/dialog";
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from "@/components/ui/select";
import { Plus } from 'lucide-react';
import axios from 'axios';
import { toast } from 'sonner';
import type { LeadScore, LeadStatus } from '@/lib/types';

import { API_BASE_URL } from '@/lib/api';

const API_URL = API_BASE_URL;

type LeadFormData = {
  name: string;
  phone: string;
  service: string;
  status: LeadStatus;
  leadScore: LeadScore;
  notes: string;
};

type LeadFormModalProps = {
  onLeadAdded?: () => void;
};

export default function LeadFormModal({ onLeadAdded }: LeadFormModalProps) {
  const [open, setOpen] = useState(false);
  const [formData, setFormData] = useState<LeadFormData>({
    name: '',
    phone: '',
    service: '',
    status: 'new',
    leadScore: 'Warm',
    notes: ''
  });

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    try {
      await axios.post(`${API_URL}/leads`, {
        ...formData,
        notes: [{ text: formData.notes || 'Manually added' }]
      });
      toast.success('Lead added successfully');
      setOpen(false);
      setFormData({ name: '', phone: '', service: '', status: 'new', leadScore: 'Warm', notes: '' });
      if (onLeadAdded) onLeadAdded();
    } catch {
      toast.error('Failed to add lead');
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger
        render={
          <Button className="yellow-gradient hover:opacity-90 text-slate-900 font-semibold rounded-xl h-11 px-6 shadow-lg shadow-yellow-500/20" />
        }
      >
        <Plus className="w-5 h-5 mr-2" />
        Add New Lead
      </DialogTrigger>
      <DialogContent className="sm:max-w-[425px] glass rounded-3xl">
        <DialogHeader>
          <DialogTitle className="text-2xl font-bold">Add New Lead</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4 pt-4">
          <div className="space-y-2">
            <label className="text-sm font-semibold text-slate-700">Name</label>
            <Input 
              required
              value={formData.name}
              onChange={(e) => setFormData({...formData, name: e.target.value})}
              placeholder="Full Name"
              className="rounded-xl bg-slate-50 border-slate-200"
            />
          </div>
          <div className="space-y-2">
            <label className="text-sm font-semibold text-slate-700">Phone</label>
            <Input 
              required
              value={formData.phone}
              onChange={(e) => setFormData({...formData, phone: e.target.value})}
              placeholder="+1 234 567 890"
              className="rounded-xl bg-slate-50 border-slate-200"
            />
          </div>
          <div className="space-y-2">
            <label className="text-sm font-semibold text-slate-700">Service</label>
            <Input 
              value={formData.service}
              onChange={(e) => setFormData({...formData, service: e.target.value})}
              placeholder="e.g. AI Automation"
              className="rounded-xl bg-slate-50 border-slate-200"
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="text-sm font-semibold text-slate-700">Status</label>
              <Select value={formData.status} onValueChange={(v) => setFormData({...formData, status: v as LeadStatus})}>
                <SelectTrigger className="rounded-xl bg-slate-50 border-slate-200">
                  <SelectValue placeholder="Status" />
                </SelectTrigger>
                <SelectContent className="glass">
                  <SelectItem value="new">New</SelectItem>
                  <SelectItem value="contacted">Contacted</SelectItem>
                  <SelectItem value="booked">Booked</SelectItem>
                  <SelectItem value="closed">Closed</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <label className="text-sm font-semibold text-slate-700">Lead Score</label>
              <Select value={formData.leadScore} onValueChange={(v) => setFormData({...formData, leadScore: v as LeadScore})}>
                <SelectTrigger className="rounded-xl bg-slate-50 border-slate-200">
                  <SelectValue placeholder="Score" />
                </SelectTrigger>
                <SelectContent className="glass">
                  <SelectItem value="Hot">Hot</SelectItem>
                  <SelectItem value="Warm">Warm</SelectItem>
                  <SelectItem value="Cold">Cold</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="space-y-2">
            <label className="text-sm font-semibold text-slate-700">Initial Note</label>
            <Input 
              value={formData.notes}
              onChange={(e) => setFormData({...formData, notes: e.target.value})}
              placeholder="Add some context..."
              className="rounded-xl bg-slate-50 border-slate-200"
            />
          </div>
          <DialogFooter className="pt-4">
            <Button type="submit" className="w-full yellow-gradient h-12 rounded-xl text-slate-900 font-bold shadow-lg shadow-yellow-500/20">
              Save Lead
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
