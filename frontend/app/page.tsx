"use client";

import React from 'react';
import ChatWidget from '@/components/ChatWidget';
import Link from 'next/link';
import { ArrowRight, Sparkles, Target, Zap } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';

export default function Home() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-8 bg-[#F8FAFC]">
      <div className="max-w-4xl w-full text-center space-y-8">
        <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-yellow-400/10 border border-yellow-400/20 text-yellow-700 font-bold text-sm animate-bounce">
          <Sparkles className="w-4 h-4" />
          <span>The New Standard in Lead Conversion</span>
        </div>
        
        <h1 className="text-6xl md:text-7xl font-black text-slate-900 tracking-tight leading-tight">
          Convert Visitors into <br />
          <span className="text-yellow-500">Premium Customers</span>
        </h1>
        
        <p className="text-xl text-slate-500 max-w-2xl mx-auto font-medium">
          Our AI-powered guided chat system captures leads, scores them instantly, 
          and handles your bookings while you sleep.
        </p>

        <div className="flex flex-col sm:flex-row items-center justify-center gap-4 pt-8">
          <Link href="/dashboard">
            <button className="h-14 px-8 rounded-2xl yellow-gradient text-slate-900 font-bold text-lg flex items-center gap-2 shadow-xl shadow-yellow-500/30 hover:scale-105 transition-all">
              Launch Dashboard
              <ArrowRight className="w-5 h-5" />
            </button>
          </Link>
          <button className="h-14 px-8 rounded-2xl bg-white border border-slate-200 text-slate-600 font-bold text-lg hover:bg-slate-50 transition-all">
            See Case Studies
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 pt-20">
          <FeatureCard 
            icon={Zap} 
            title="Instant Setup" 
            desc="Go from zero to conversion-ready in under 5 minutes." 
          />
          <FeatureCard 
            icon={Target} 
            title="Lead Scoring" 
            desc="Identify 'Hot' leads automatically with AI logic." 
          />
          <FeatureCard 
            icon={Sparkles} 
            title="AI Chat" 
            desc="Guided flow designed to convert 3x more visitors." 
          />
        </div>
      </div>

      {/* Floating Chat Widget */}
      <ChatWidget />
    </div>
  );
}

type FeatureCardProps = {
  icon: LucideIcon;
  title: string;
  desc: string;
};

function FeatureCard({ icon: Icon, title, desc }: FeatureCardProps) {
  return (
    <div className="p-8 rounded-3xl bg-white border border-slate-100 shadow-sm text-left hover:shadow-md transition-all group">
      <div className="w-12 h-12 rounded-2xl bg-slate-50 flex items-center justify-center text-yellow-500 group-hover:scale-110 transition-transform">
        <Icon className="w-6 h-6" />
      </div>
      <h3 className="text-xl font-bold text-slate-900 mt-6">{title}</h3>
      <p className="text-slate-500 mt-2 font-medium">{desc}</p>
    </div>
  );
}
