"use client";

import React, { useState } from "react";
import { MessageSquare, Send, CheckCircle } from "lucide-react";
import { useApiClient } from "@/lib/api";
import { useUser } from "@clerk/nextjs";
import { toast } from "sonner";

const SUBJECTS = [
  "Payment issue",
  "Search not working",
  "Account problem",
  "Feature request",
  "Bug report",
  "Other",
];

export default function SupportPage() {
  const { api } = useApiClient();
  const { user } = useUser();
  const [form, setForm] = useState({ name: "", email: "", subject: "", message: "" });
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.message.trim() || form.message.trim().length < 10) {
      toast.error("Please write at least 10 characters in your message.");
      return;
    }
    setLoading(true);
    try {
      await api.post("/support/contact", {
        name: form.name || user?.fullName || "",
        email: form.email || user?.primaryEmailAddress?.emailAddress || "",
        subject: form.subject,
        message: form.message,
      });
      setSent(true);
    } catch {
      toast.error("Failed to send message. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  if (sent) {
    return (
      <div className="flex items-center justify-center h-[calc(100vh-5rem)]">
        <div className="glass rounded-2xl p-10 text-center max-w-md shadow-xl">
          <div className="w-16 h-16 rounded-full bg-green-100 flex items-center justify-center mx-auto mb-5">
            <CheckCircle className="w-8 h-8 text-green-600" />
          </div>
          <h2 className="text-2xl font-bold text-slate-900 mb-2">Message Sent!</h2>
          <p className="text-slate-500 mb-6">We've received your message and will get back to you shortly.</p>
          <button
            onClick={() => { setSent(false); setForm({ name: "", email: "", subject: "", message: "" }); }}
            className="px-6 py-2.5 rounded-xl bg-slate-900 text-white font-semibold text-sm hover:bg-slate-800 transition-all"
          >
            Send another message
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="p-4 md:p-8 max-w-2xl mx-auto">
      {/* Header */}
      <div className="flex items-center gap-3 mb-8">
        <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-yellow-400 to-orange-500 flex items-center justify-center shadow-lg">
          <MessageSquare className="w-5 h-5 text-white" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Contact Support</h1>
          <p className="text-slate-500 text-sm font-medium">We typically reply within 24 hours</p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="glass rounded-2xl border border-white/30 p-6 space-y-5 shadow-sm">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">Your Name</label>
            <input
              type="text"
              value={form.name}
              onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
              placeholder={user?.fullName || "Name"}
              className="w-full px-4 py-2.5 rounded-xl border border-slate-200 bg-white text-sm text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-yellow-400/50 focus:border-yellow-400 transition-all"
            />
          </div>
          <div>
            <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">Email</label>
            <input
              type="email"
              value={form.email}
              onChange={e => setForm(f => ({ ...f, email: e.target.value }))}
              placeholder={user?.primaryEmailAddress?.emailAddress || "you@example.com"}
              className="w-full px-4 py-2.5 rounded-xl border border-slate-200 bg-white text-sm text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-yellow-400/50 focus:border-yellow-400 transition-all"
            />
          </div>
        </div>

        <div>
          <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">Subject</label>
          <select
            value={form.subject}
            onChange={e => setForm(f => ({ ...f, subject: e.target.value }))}
            className="w-full px-4 py-2.5 rounded-xl border border-slate-200 bg-white text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-yellow-400/50 focus:border-yellow-400 transition-all"
          >
            <option value="">Select a topic…</option>
            {SUBJECTS.map(s => <option key={s} value={s}>{s}</option>)}
          </select>
        </div>

        <div>
          <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">Message <span className="text-red-400">*</span></label>
          <textarea
            value={form.message}
            onChange={e => setForm(f => ({ ...f, message: e.target.value }))}
            required
            rows={5}
            placeholder="Describe your issue or question in detail…"
            className="w-full px-4 py-2.5 rounded-xl border border-slate-200 bg-white text-sm text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-yellow-400/50 focus:border-yellow-400 transition-all resize-none"
          />
          <p className="text-xs text-slate-400 mt-1">{form.message.length} chars</p>
        </div>

        <button
          type="submit"
          disabled={loading}
          className="w-full py-3 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-bold text-sm flex items-center justify-center gap-2 transition-all disabled:opacity-60"
        >
          {loading ? (
            <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24" fill="none">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z" />
            </svg>
          ) : (
            <Send className="w-4 h-4" />
          )}
          {loading ? "Sending…" : "Send Message"}
        </button>
      </form>
    </div>
  );
}
