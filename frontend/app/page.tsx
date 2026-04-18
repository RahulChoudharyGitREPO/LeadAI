"use client";

import Link from 'next/link';
import { ArrowRight, Sparkles, Target, Zap, Star, Crown, Check } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';

const PLANS = [
  {
    key: 'streamMini',
    name: 'StreamMini',
    price: 199,
    duration: '14 days',
    searches: 7,
    baseSearches: 5,
    freeSearches: 2,
    guarantee: '10+ business insights',
    icon: Zap,
    color: 'from-blue-500 to-blue-600',
    badge: null,
    popular: false,
    features: ['7 discovery credits', '20 results per search', 'AI relevance scoring', 'Contact data enrichment', 'CSV export'],
  },
  {
    key: 'stream',
    name: 'Stream',
    price: 349,
    duration: '30 days',
    searches: 14,
    baseSearches: 10,
    freeSearches: 4,
    guarantee: '25+ business insights',
    icon: Star,
    color: 'from-yellow-400 to-yellow-500',
    badge: null,
    popular: false,
    features: ['14 discovery credits', 'Everything in StreamMini', 'Email & LinkedIn enrichment', 'Multi-location research', 'Search history'],
  },
  {
    key: 'streamMax',
    name: 'StreamMax',
    price: 1000,
    duration: '30 days',
    searches: 30,
    baseSearches: 20,
    freeSearches: 10,
    guarantee: '60+ business insights',
    icon: Crown,
    color: 'from-purple-500 to-purple-600',
    badge: 'Most Popular',
    popular: true,
    features: ['30 discovery credits', 'Everything in Stream', 'Intent query expansion', 'Multi-city research', 'Priority processing'],
  },
];

export default function Home() {
  return (
    <div className="min-h-screen flex flex-col items-center bg-background-soft">
      {/* Hero */}
      <div className="max-w-4xl w-full text-center space-y-8 px-8 pt-20 pb-24">
        <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-yellow-400/10 border border-yellow-400/20 text-yellow-700 font-bold text-sm animate-bounce">
          <Sparkles className="w-4 h-4" />
          <span>AI-Powered Business Discovery Platform</span>
        </div>

        <h1 className="text-4xl sm:text-6xl md:text-7xl font-black text-slate-900 tracking-tight leading-tight px-2">
          Discover Local Businesses <br />
          <span className="text-yellow-500">& Gain Market Insights</span>
        </h1>

        <p className="text-lg md:text-xl text-slate-500 max-w-2xl mx-auto font-medium px-4">
          Our AI-powered discovery engine searches the live web, analyses business data,
          and scores every result based on relevance and digital presence.
        </p>

        <div className="flex flex-col sm:flex-row items-center justify-center gap-4 pt-8">
          <Link href="/dashboard/chat">
            <button className="h-14 px-8 rounded-2xl yellow-gradient text-slate-900 font-bold text-lg flex items-center gap-2 shadow-xl shadow-yellow-500/30 hover:scale-105 transition-all">
              Launch Dashboard
              <ArrowRight className="w-5 h-5" />
            </button>
          </Link>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 pt-20">
          <FeatureCard icon={Zap} title="AI Discovery Hub" desc="Discover local businesses and market opportunities across the live web in seconds." />
          <FeatureCard icon={Target} title="Relevance Scoring" desc="Automatically rank businesses by relevance using AI-powered signals." />
          <FeatureCard icon={Sparkles} title="Data Enrichment" desc="Automated contact and profile data extraction including emails and LinkedIn." />
        </div>
      </div>

      {/* Pricing Section */}
      <div className="w-full bg-slate-900 py-20 px-8" id="pricing">
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-12">
            <div className="inline-flex items-center gap-2 bg-yellow-400/20 border border-yellow-400/30 text-yellow-300 text-xs font-semibold px-3 py-1 rounded-full mb-4">
              <Sparkles className="w-3 h-3" />
              Simple Pricing
            </div>
            <h2 className="text-3xl md:text-4xl font-black text-white mb-3">Start Free. Scale When Ready.</h2>
            <p className="text-slate-400 text-lg">2 free discovery credits included. No credit card required to start.</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {PLANS.map((plan) => {
              const Icon = plan.icon;
              return (
                <div
                  key={plan.key}
                  className={`relative bg-white rounded-2xl p-6 flex flex-col transition-all ${
                    plan.popular ? 'ring-2 ring-yellow-400 ring-offset-2 ring-offset-slate-900 scale-[1.02] shadow-2xl' : 'shadow-lg'
                  }`}
                >
                  {plan.badge && (
                    <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-yellow-400 text-slate-900 text-xs font-black px-4 py-1 rounded-full">
                      {plan.badge}
                    </div>
                  )}

                  <div className="flex items-center gap-3 mb-4">
                    <div className={`w-10 h-10 rounded-xl bg-linear-to-br ${plan.color} flex items-center justify-center text-white shadow-md`}>
                      <Icon className="w-5 h-5" />
                    </div>
                    <div>
                      <p className="font-black text-slate-900">{plan.name}</p>
                      <p className="text-xs text-green-600 font-bold">{plan.guarantee}</p>
                    </div>
                  </div>

                  <div className="mb-2">
                    <span className="text-3xl font-extrabold text-slate-900">₹{plan.price}</span>
                    <span className="text-slate-500 text-sm ml-1">/ {plan.duration}</span>
                  </div>

                  <div className="bg-slate-50 rounded-xl px-3 py-2.5 mb-4 text-center">
                    <span className="text-xl font-bold text-slate-900">{plan.baseSearches}</span>
                    <span className="text-xs text-slate-500 mx-1">+</span>
                    <span className="text-base font-bold text-green-600">{plan.freeSearches} free</span>
                    <p className="text-[10px] text-slate-400 mt-0.5">{plan.searches} total discovery credits</p>
                  </div>

                  <ul className="space-y-2 mb-6 flex-1">
                    {plan.features.map(f => (
                      <li key={f} className="flex items-center gap-2 text-xs text-slate-600">
                        <Check className="w-3.5 h-3.5 text-green-500 shrink-0" />
                        {f}
                      </li>
                    ))}
                  </ul>

                  <Link href="/sign-up">
                    <button className={`w-full py-2.5 rounded-xl font-bold text-sm transition-all ${
                      plan.popular
                        ? 'bg-yellow-400 hover:bg-yellow-500 text-slate-900'
                        : 'bg-slate-900 hover:bg-slate-800 text-white'
                    }`}>
                      Get Started
                    </button>
                  </Link>
                </div>
              );
            })}
          </div>

          <p className="text-center text-slate-500 text-sm mt-8">
            🔒 Secured by Razorpay · No recurring charges · Cancel anytime
          </p>
        </div>
      </div>
    </div>
  );
}

function FeatureCard({ icon: Icon, title, desc }: { icon: LucideIcon; title: string; desc: string }) {
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
