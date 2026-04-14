"use client";

import React from 'react';
import { Bell, Menu, Search } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { UserButton, SignedIn, SignedOut, SignInButton } from "@clerk/nextjs";

interface NavbarProps {
  onMenuClick?: () => void;
}

export default function Navbar({ onMenuClick }: NavbarProps) {
  return (
    <header className="h-20 glass border-b border-white/20 sticky top-0 z-40 px-4 md:px-8 flex items-center justify-between">
      <div className="flex items-center gap-4">
        <button 
          onClick={onMenuClick}
          className="p-2.5 rounded-xl bg-white/50 border border-white/40 text-slate-500 hover:text-yellow-600 md:hidden"
        >
          <Menu className="w-5 h-5" />
        </button>
      </div>
      <div className="flex-1 max-w-sm ml-2 md:ml-0">
        <div className="relative group">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 group-focus-within:text-yellow-500 transition-colors" />
          <Input 
            placeholder="Search..." 
            className="pl-10 h-11 bg-white/50 border-white/40 focus:bg-white transition-all rounded-xl subtle-shadow"
          />
        </div>
      </div>

      <div className="flex items-center gap-6">
        <button className="relative p-2.5 rounded-xl bg-white/50 border border-white/40 text-slate-500 hover:text-yellow-600 hover:bg-white transition-all subtle-shadow group">
          <Bell className="w-5 h-5" />
          <span className="absolute top-2 right-2 w-2 h-2 bg-yellow-500 rounded-full border-2 border-white" />
        </button>
        
        <div className="flex items-center gap-3 pl-6 border-l border-slate-200/50">
          <SignedIn>
            <UserButton 
              appearance={{ 
                elements: { 
                  userButtonAvatarBox: "w-10 h-10 shadow-sm border border-slate-200/50"
                }
              }} 
            />
          </SignedIn>
          <SignedOut>
            <SignInButton mode="modal">
              <button className="bg-slate-900 text-white px-4 py-2 rounded-xl text-sm font-bold shadow-md hover:bg-slate-800 transition-all">
                Sign In
              </button>
            </SignInButton>
          </SignedOut>
        </div>
      </div>
    </header>
  );
}
