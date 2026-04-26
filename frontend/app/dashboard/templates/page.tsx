"use client";

import React, { useEffect, useState, useCallback } from "react";
import { useApiClient } from "@/lib/api";
import { BookMarked, Play, Trash2, Plus, RefreshCw, Sparkles, MapPin, Search } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

interface Template {
  _id: string;
  name: string;
  niche: string;
  location: string;
  lastRunAt: string | null;
  lastResultCount: number;
  newSinceLastRun: number;
  createdAt: string;
}

export default function TemplatesPage() {
  const { api, isLoaded, userId } = useApiClient();
  const [templates, setTemplates] = useState<Template[]>([]);
  const [loading, setLoading] = useState(true);
  const [runningId, setRunningId] = useState<string | null>(null);
  const [showAdd, setShowAdd] = useState(false);
  const [form, setForm] = useState({ name: "", niche: "", location: "" });

  const fetchTemplates = useCallback(async () => {
    if (!isLoaded || !userId) return;
    try {
      const res = await api.get("/templates");
      setTemplates(res.data);
    } catch {
      toast.error("Failed to load search templates");
    } finally {
      setLoading(false);
    }
  }, [api, isLoaded, userId]);

  useEffect(() => { fetchTemplates(); }, [fetchTemplates]);

  const createTemplate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.niche || !form.location) return toast.error("Niche and location are required");
    try {
      await api.post("/templates", form);
      setForm({ name: "", niche: "", location: "" });
      setShowAdd(false);
      fetchTemplates();
      toast.success("Search template saved");
    } catch {
      toast.error("Failed to save template");
    }
  };

  const runTemplate = async (t: Template) => {
    setRunningId(t._id);
    try {
      const res = await api.post(`/templates/${t._id}/run`);
      fetchTemplates();
      const { currentCount, newSinceLastRun } = res.data;
      if (newSinceLastRun > 0) {
        toast.success(`Found ${currentCount} results — ${newSinceLastRun} new since last run!`);
      } else {
        toast.success(`Found ${currentCount} results — no new businesses since last run`);
      }
    } catch {
      toast.error("Failed to run template");
    } finally {
      setRunningId(null);
    }
  };

  const deleteTemplate = async (id: string) => {
    try {
      await api.delete(`/templates/${id}`);
      setTemplates(prev => prev.filter(t => t._id !== id));
      toast.success("Template deleted");
    } catch {
      toast.error("Failed to delete");
    }
  };

  return (
    <div className="p-4 md:p-8 max-w-4xl mx-auto space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-linear-to-br from-yellow-400 to-orange-500 flex items-center justify-center shadow-lg">
            <BookMarked className="w-5 h-5 text-white" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Search Templates</h1>
            <p className="text-slate-500 text-sm font-medium">Save searches and re-run to track new businesses</p>
          </div>
        </div>
        <button
          onClick={() => setShowAdd(!showAdd)}
          className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-slate-900 text-white font-bold text-sm hover:bg-slate-800 transition-all shadow-sm"
        >
          <Plus className="w-4 h-4" /> New Template
        </button>
      </div>

      {/* Add form */}
      {showAdd && (
        <form onSubmit={createTemplate} className="glass rounded-2xl border border-white/30 p-5 space-y-4">
          <p className="text-sm font-bold text-slate-700">New Search Template</p>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <input
              placeholder="Template name (optional)"
              value={form.name}
              onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
              className="px-4 py-2.5 rounded-xl border border-slate-200 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-yellow-400/50 col-span-1 sm:col-span-1"
            />
            <input
              placeholder="Niche (e.g. plumbers) *"
              value={form.niche}
              onChange={e => setForm(f => ({ ...f, niche: e.target.value }))}
              required
              className="px-4 py-2.5 rounded-xl border border-slate-200 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-yellow-400/50"
            />
            <input
              placeholder="Location (e.g. Mumbai) *"
              value={form.location}
              onChange={e => setForm(f => ({ ...f, location: e.target.value }))}
              required
              className="px-4 py-2.5 rounded-xl border border-slate-200 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-yellow-400/50"
            />
          </div>
          <div className="flex gap-3">
            <button type="submit" className="px-5 py-2.5 rounded-xl bg-yellow-400 hover:bg-yellow-500 text-slate-900 font-bold text-sm transition-all">
              Save Template
            </button>
            <button type="button" onClick={() => setShowAdd(false)} className="px-5 py-2.5 rounded-xl bg-white border border-slate-200 text-slate-600 font-bold text-sm hover:bg-slate-50 transition-all">
              Cancel
            </button>
          </div>
        </form>
      )}

      {/* Templates list */}
      {loading ? (
        <div className="flex justify-center py-16">
          <div className="w-10 h-10 border-4 border-yellow-400 border-t-transparent rounded-full animate-spin" />
        </div>
      ) : templates.length === 0 ? (
        <div className="glass rounded-2xl border border-white/30 py-16 text-center">
          <Search className="w-12 h-12 text-slate-300 mx-auto mb-4" />
          <p className="text-slate-500 font-medium">No templates yet</p>
          <p className="text-slate-400 text-sm mt-1">Save a search from the AI Chat to get started</p>
        </div>
      ) : (
        <div className="space-y-3">
          {templates.map(t => (
            <div key={t._id} className="glass rounded-2xl border border-white/30 px-5 py-4 flex items-center gap-4">
              <div className="flex-1 min-w-0">
                <p className="font-bold text-slate-900 text-sm">{t.name}</p>
                <div className="flex items-center gap-3 mt-1 flex-wrap">
                  <span className="flex items-center gap-1 text-xs text-slate-500">
                    <Search className="w-3 h-3" /> {t.niche}
                  </span>
                  <span className="flex items-center gap-1 text-xs text-slate-500">
                    <MapPin className="w-3 h-3" /> {t.location}
                  </span>
                  {t.lastRunAt && (
                    <span className="text-xs text-slate-400">
                      Last run: {new Date(t.lastRunAt).toLocaleDateString("en-IN")}
                    </span>
                  )}
                  {t.lastResultCount > 0 && (
                    <span className="text-xs text-slate-500">{t.lastResultCount} results</span>
                  )}
                  {t.newSinceLastRun > 0 && (
                    <span className="flex items-center gap-1 text-xs font-bold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full">
                      <Sparkles className="w-3 h-3" /> {t.newSinceLastRun} new
                    </span>
                  )}
                </div>
              </div>

              <div className="flex items-center gap-2 shrink-0">
                <button
                  onClick={() => runTemplate(t)}
                  disabled={runningId === t._id}
                  className={cn(
                    "flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold transition-all",
                    runningId === t._id
                      ? "bg-slate-100 text-slate-400 cursor-not-allowed"
                      : "bg-yellow-400 hover:bg-yellow-500 text-slate-900"
                  )}
                >
                  {runningId === t._id
                    ? <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                    : <Play className="w-3.5 h-3.5" />
                  }
                  {runningId === t._id ? "Running…" : "Re-run"}
                </button>
                <button
                  onClick={() => deleteTemplate(t._id)}
                  className="p-2 rounded-xl text-slate-400 hover:text-red-500 hover:bg-red-50 transition-all"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
