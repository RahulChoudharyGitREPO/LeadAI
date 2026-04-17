"use client";

import { useEffect, useState } from 'react';
import { Bell, Menu, Zap } from 'lucide-react';
import { UserButton, SignedIn, SignedOut, SignInButton } from "@clerk/nextjs";
import { useApiClient } from '@/lib/api';
import { cn } from '@/lib/utils';

interface NavbarProps {
  onMenuClick?: () => void;
  onUpgradeClick?: () => void;
}

export default function Navbar({ onMenuClick, onUpgradeClick }: NavbarProps) {
  const { api, isLoaded, userId } = useApiClient();
  const [quota, setQuota] = useState<{ plan: string; searchesUsed: number; searchLimit: number; searchesRemaining: number } | null>(null);

  useEffect(() => {
    if (!isLoaded || !userId) return;
    api.get('/payment/status').then(res => setQuota(res.data)).catch(() => {});
  }, [isLoaded, userId, api]);

  const isGrandfathered = quota?.plan === 'grandfathered';
  const isFree = quota?.plan === 'free';
  const searchesLeft = quota?.searchesRemaining ?? null;

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

      <div className="flex-1" />

      <div className="flex items-center gap-4">
        {/* Search Quota Badge */}
        {quota && !isGrandfathered && (
          <button
            onClick={onUpgradeClick}
            className={cn(
              'hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-xl text-xs font-bold transition-all border',
              isFree || searchesLeft === 0
                ? 'bg-red-50 border-red-200 text-red-600 hover:bg-red-100'
                : searchesLeft !== null && searchesLeft <= 2
                ? 'bg-orange-50 border-orange-200 text-orange-600 hover:bg-orange-100'
                : 'bg-green-50 border-green-200 text-green-700 hover:bg-green-100'
            )}
          >
            <Zap className="w-3.5 h-3.5" />
            {searchesLeft === -1 ? 'Unlimited' : searchesLeft === 0 ? 'No searches left · Upgrade' : `${searchesLeft} searches left`}
          </button>
        )}

        <button className="relative p-2.5 rounded-xl bg-white/50 border border-white/40 text-slate-500 hover:text-yellow-600 hover:bg-white transition-all subtle-shadow">
          <Bell className="w-5 h-5" />
          <span className="absolute top-2 right-2 w-2 h-2 bg-yellow-500 rounded-full border-2 border-white" />
        </button>

        <div className="flex items-center gap-3 pl-4 border-l border-slate-200/50">
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
