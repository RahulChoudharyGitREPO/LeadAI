"use client";

import React, { useEffect, useState, useCallback } from "react";
import { useApiClient } from "@/lib/api";
import {
  Users,
  Search,
  Activity,
  Database,
  RefreshCw,
  Shield,
  Clock,
  ArrowUpDown,
} from "lucide-react";

interface UserData {
  _id: string;
  userId: string;
  email: string;
  name: string;
  searchCount: number;
  lastActive: string;
  createdAt: string;
  leadCount: number;
  sessionCount: number;
  isOnline: boolean;
  lastActiveAgo: string;
}

interface AdminData {
  summary: {
    totalUsers: number;
    activeNow: number;
    totalSearches: number;
    totalLeads: number;
  };
  users: UserData[];
}

export default function AdminPage() {
  const { api, isLoaded, userId } = useApiClient();
  const [data, setData] = useState<AdminData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [sortField, setSortField] = useState<"lastActive" | "searchCount" | "leadCount">("lastActive");

  const fetchAdminData = useCallback(async () => {
    if (!isLoaded || !userId) return;
    setLoading(true);
    try {
      const res = await api.get("/admin/users");
      setData(res.data);
      setError("");
    } catch {
      setError("Access denied or failed to load admin data");
    } finally {
      setLoading(false);
    }
  }, [api, isLoaded, userId]);

  useEffect(() => {
    fetchAdminData();
  }, [fetchAdminData]);

  const sortedUsers = data?.users
    ? [...data.users].sort((a, b) => {
        if (sortField === "searchCount") return b.searchCount - a.searchCount;
        if (sortField === "leadCount") return b.leadCount - a.leadCount;
        return new Date(b.lastActive).getTime() - new Date(a.lastActive).getTime();
      })
    : [];

  if (loading) {
    return (
      <div className="flex items-center justify-center h-[calc(100vh-5rem)]">
        <div className="flex flex-col items-center gap-4">
          <div className="w-12 h-12 border-4 border-yellow-400 border-t-transparent rounded-full animate-spin" />
          <p className="text-slate-500 font-medium">Loading admin panel...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center h-[calc(100vh-5rem)]">
        <div className="glass rounded-2xl p-8 text-center max-w-md">
          <Shield className="w-12 h-12 text-red-400 mx-auto mb-4" />
          <h2 className="text-xl font-bold text-slate-800 mb-2">Access Denied</h2>
          <p className="text-slate-500">{error}</p>
        </div>
      </div>
    );
  }

  if (!data) return null;

  const { summary } = data;

  return (
    <div className="p-4 md:p-8 space-y-8 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-3 mb-1">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-amber-400 to-orange-500 flex items-center justify-center shadow-lg">
              <Shield className="w-5 h-5 text-white" />
            </div>
            <h1 className="text-2xl md:text-3xl font-bold text-slate-900 tracking-tight">
              Admin Panel
            </h1>
          </div>
          <p className="text-slate-500 text-sm font-medium ml-[52px]">
            Monitor user activity and platform health
          </p>
        </div>
        <button
          onClick={fetchAdminData}
          className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-white/70 border border-white/40 text-slate-600 hover:bg-white hover:text-yellow-600 transition-all shadow-sm font-medium text-sm"
        >
          <RefreshCw className="w-4 h-4" />
          Refresh
        </button>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <SummaryCard
          icon={<Users className="w-5 h-5" />}
          label="Total Users"
          value={summary.totalUsers}
          color="from-blue-400 to-indigo-500"
        />
        <SummaryCard
          icon={<Activity className="w-5 h-5" />}
          label="Active Now"
          value={summary.activeNow}
          color="from-emerald-400 to-green-500"
          pulse
        />
        <SummaryCard
          icon={<Search className="w-5 h-5" />}
          label="Total Searches"
          value={summary.totalSearches}
          color="from-amber-400 to-orange-500"
        />
        <SummaryCard
          icon={<Database className="w-5 h-5" />}
          label="Total Leads"
          value={summary.totalLeads}
          color="from-purple-400 to-violet-500"
        />
      </div>

      {/* Users Table */}
      <div className="glass rounded-2xl border border-white/30 overflow-hidden">
        <div className="px-6 py-4 border-b border-white/20 flex items-center justify-between">
          <h2 className="text-lg font-bold text-slate-800">All Users</h2>
          <div className="flex gap-2">
            {(["lastActive", "searchCount", "leadCount"] as const).map((field) => (
              <button
                key={field}
                onClick={() => setSortField(field)}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                  sortField === field
                    ? "bg-yellow-400/20 text-yellow-700 border border-yellow-300/50"
                    : "text-slate-400 hover:text-slate-600 hover:bg-white/50"
                }`}
              >
                <ArrowUpDown className="w-3 h-3" />
                {field === "lastActive" ? "Recent" : field === "searchCount" ? "Searches" : "Leads"}
              </button>
            ))}
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-white/20">
                <th className="text-left px-6 py-3 text-xs font-bold text-slate-400 uppercase tracking-wider">User</th>
                <th className="text-left px-6 py-3 text-xs font-bold text-slate-400 uppercase tracking-wider">Status</th>
                <th className="text-center px-6 py-3 text-xs font-bold text-slate-400 uppercase tracking-wider">Searches</th>
                <th className="text-center px-6 py-3 text-xs font-bold text-slate-400 uppercase tracking-wider">Leads</th>
                <th className="text-center px-6 py-3 text-xs font-bold text-slate-400 uppercase tracking-wider">Sessions</th>
                <th className="text-left px-6 py-3 text-xs font-bold text-slate-400 uppercase tracking-wider">Last Active</th>
                <th className="text-left px-6 py-3 text-xs font-bold text-slate-400 uppercase tracking-wider">Joined</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/10">
              {sortedUsers.map((user) => (
                <tr key={user._id} className="hover:bg-white/30 transition-colors">
                  <td className="px-6 py-4">
                    <div>
                      <p className="text-sm font-bold text-slate-800">
                        {user.name || "—"}
                      </p>
                      <p className="text-xs text-slate-400 font-medium">
                        {user.email || user.userId?.slice(0, 20) + "..."}
                      </p>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <span
                      className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold ${
                        user.isOnline
                          ? "bg-emerald-100 text-emerald-700"
                          : "bg-slate-100 text-slate-500"
                      }`}
                    >
                      <span
                        className={`w-2 h-2 rounded-full ${
                          user.isOnline ? "bg-emerald-500 animate-pulse" : "bg-slate-400"
                        }`}
                      />
                      {user.isOnline ? "Online" : "Offline"}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-center">
                    <span className="text-sm font-bold text-slate-700">
                      {user.searchCount}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-center">
                    <span className="text-sm font-bold text-slate-700">
                      {user.leadCount}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-center">
                    <span className="text-sm font-bold text-slate-700">
                      {user.sessionCount}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-1.5 text-xs text-slate-500 font-medium">
                      <Clock className="w-3.5 h-3.5" />
                      {user.lastActiveAgo}
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <span className="text-xs text-slate-400 font-medium">
                      {new Date(user.createdAt).toLocaleDateString()}
                    </span>
                  </td>
                </tr>
              ))}
              {sortedUsers.length === 0 && (
                <tr>
                  <td colSpan={7} className="px-6 py-12 text-center text-slate-400 font-medium">
                    No users found yet
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

function SummaryCard({
  icon,
  label,
  value,
  color,
  pulse,
}: {
  icon: React.ReactNode;
  label: string;
  value: number;
  color: string;
  pulse?: boolean;
}) {
  return (
    <div className="glass rounded-2xl p-5 border border-white/30 hover:shadow-lg transition-shadow">
      <div className="flex items-center gap-3 mb-3">
        <div
          className={`w-9 h-9 rounded-xl bg-gradient-to-br ${color} flex items-center justify-center text-white shadow-md ${
            pulse ? "animate-pulse" : ""
          }`}
        >
          {icon}
        </div>
        <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">
          {label}
        </span>
      </div>
      <p className="text-3xl font-black text-slate-900 tracking-tight">{value}</p>
    </div>
  );
}
