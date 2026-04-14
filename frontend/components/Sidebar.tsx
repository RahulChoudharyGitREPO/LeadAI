"use client";

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { 
  LayoutDashboard, 
  Users, 
  MessageSquare, 
  TrendingUp,
  LogOut
} from 'lucide-react';
import { cn } from '@/lib/utils';

const navItems = [
  { name: 'Dashboard', href: '/dashboard', icon: LayoutDashboard },
  { name: 'Leads', href: '/dashboard/leads', icon: Users },
  { name: 'AI Chat', href: '/dashboard/chat', icon: MessageSquare },
  { name: 'Analytics', href: '/dashboard/analytics', icon: TrendingUp },
];

interface SidebarProps {
  isOpen?: boolean;
  onClose?: () => void;
}

export default function Sidebar({ isOpen, onClose }: SidebarProps) {
  const pathname = usePathname();

  return (
    <>
      <aside className={cn(
        "fixed left-0 top-0 h-screen w-64 glass border-r border-white/20 z-50 flex flex-col transition-transform duration-300 md:translate-x-0 outline-none focus:outline-none",
        isOpen ? "translate-x-0" : "-translate-x-full"
      )}>
      <div className="p-8">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 yellow-gradient rounded-xl flex items-center justify-center subtle-shadow">
            <TrendingUp className="text-white w-6 h-6" />
          </div>
          <span className="text-xl font-bold text-slate-900 tracking-tight">ClientStream</span>
        </div>
      </div>

      <nav className="flex-1 px-4 py-4 space-y-2">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = pathname === item.href;
          
          return (
            <Link
              key={item.name}
              href={item.href}
              onClick={onClose}
              className={cn(
                "flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200 group",
                isActive 
                  ? "bg-yellow-400/20 text-yellow-700 shadow-sm" 
                  : "text-slate-500 hover:bg-white/50 hover:text-slate-900"
              )}
            >
              <Icon className={cn(
                "w-5 h-5 transition-colors",
                isActive ? "text-yellow-600" : "text-slate-400 group-hover:text-slate-600"
              )} />
              <span className="font-medium">{item.name}</span>
              {isActive && (
                <div className="ml-auto w-1.5 h-1.5 rounded-full bg-yellow-500" />
              )}
            </Link>
          );
        })}
      </nav>

      <div className="p-4 border-t border-white/20">
        <button className="flex items-center gap-3 px-4 py-3 w-full rounded-xl text-slate-500 hover:bg-white/50 hover:text-slate-900 transition-all duration-200">
          <LogOut className="w-5 h-5" />
          <span className="font-medium">Sign Out</span>
        </button>
      </div>
    </aside>
  </>
  );
}
