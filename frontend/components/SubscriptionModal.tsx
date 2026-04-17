"use client";

import React, { useState } from 'react';
import { X, Check, Zap, Star, Crown, Search, Brain, MapPin, Mail, FileDown, Sparkles } from 'lucide-react';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import { useApiClient } from '@/lib/api';

declare global {
  interface Window {
    Razorpay: new (options: Record<string, unknown>) => { open(): void };
  }
}

const PLANS = [
  {
    key: 'streamMini',
    name: 'StreamMini',
    price: 199,
    duration: '14 days',
    searches: 7,
    baseSearches: 5,
    freeSearches: 2,
    tagline: 'Perfect to get started',
    guarantee: '10+ guaranteed leads',
    icon: Zap,
    color: 'from-blue-500 to-blue-600',
    border: 'border-slate-200',
    badge: null,
    features: [
      '20 results per search (vs 3 on free)',
      'Google + Maps engine search',
      'AI lead scoring (1–10)',
      'WhatsApp pitch generator',
      'Export leads to CSV',
    ],
  },
  {
    key: 'stream',
    name: 'Stream',
    price: 349,
    duration: '30 days',
    searches: 14,
    baseSearches: 10,
    freeSearches: 4,
    tagline: 'Most popular for freelancers',
    guarantee: '25+ guaranteed leads',
    icon: Star,
    color: 'from-yellow-400 to-yellow-500',
    border: 'border-slate-200',
    badge: null,
    features: [
      '20 results per search (vs 3 on free)',
      'Everything in StreamMini',
      'Contact enrichment (email & LinkedIn)',
      'Multi-location fallback search',
      'Session history & saved chats',
    ],
  },
  {
    key: 'streamMax',
    name: 'StreamMax',
    price: 1000,
    duration: '30 days',
    searches: 30,
    baseSearches: 20,
    freeSearches: 10,
    tagline: 'Built for serious closers',
    guarantee: '60+ guaranteed leads',
    icon: Crown,
    color: 'from-purple-500 to-purple-600',
    border: 'border-yellow-400',
    badge: 'Best Value',
    features: [
      '20 results per search (vs 3 on free)',
      'Everything in Stream',
      'Synonym & intent query expansion',
      'Multi-city campaigns',
      'Priority AI pipeline processing',
    ],
  },
];

const REASON_COPY: Record<string, { title: string; subtitle: string }> = {
  SUBSCRIPTION_REQUIRED: {
    title: "You've Used Your 2 Free Searches",
    subtitle: 'Free plan includes 2 searches with 3 results each. Upgrade for 20 results per search and more.',
  },
  SUBSCRIPTION_EXPIRED: {
    title: 'Your Plan Has Expired',
    subtitle: 'Renew to keep discovering leads and growing your pipeline.',
  },
  SEARCH_LIMIT_REACHED: {
    title: "You've Used All Your Searches",
    subtitle: 'Upgrade to a higher plan and keep the momentum going.',
  },
};

interface Props {
  open: boolean;
  reason?: string;
  onClose: () => void;
  onSuccess: () => void;
}

function loadRazorpay(): Promise<boolean> {
  return new Promise((resolve) => {
    if (window.Razorpay) return resolve(true);
    const script = document.createElement('script');
    script.src = 'https://checkout.razorpay.com/v1/checkout.js';
    script.onload = () => resolve(true);
    script.onerror = () => resolve(false);
    document.body.appendChild(script);
  });
}

export default function SubscriptionModal({ open, reason = 'SUBSCRIPTION_REQUIRED', onClose, onSuccess }: Props) {
  const [loadingPlan, setLoadingPlan] = useState<string | null>(null);
  const { api } = useApiClient();
  const copy = REASON_COPY[reason] || REASON_COPY.SUBSCRIPTION_REQUIRED;

  const handleSubscribe = async (planKey: string) => {
    setLoadingPlan(planKey);
    try {
      const loaded = await loadRazorpay();
      if (!loaded) {
        toast.error('Payment gateway failed to load. Please check your connection.');
        setLoadingPlan(null);
        return;
      }

      const { data } = await api.post('/payment/create-order', { plan: planKey });

      const options = {
        key: data.keyId,
        amount: data.amount,
        currency: data.currency,
        name: 'ClientStream',
        description: `${data.planDetails.name} Plan`,
        order_id: data.orderId,
        handler: async (response: { razorpay_order_id: string; razorpay_payment_id: string; razorpay_signature: string }) => {
          try {
            await api.post('/payment/verify', {
              razorpay_order_id: response.razorpay_order_id,
              razorpay_payment_id: response.razorpay_payment_id,
              razorpay_signature: response.razorpay_signature,
              plan: planKey,
            });
            toast.success(`${data.planDetails.name} activated! You're all set.`);
            onSuccess();
            onClose();
          } catch {
            toast.error('Payment verification failed. Contact support if amount was deducted.');
          }
        },
        prefill: {},
        theme: { color: '#FACC15' },
        modal: { ondismiss: () => setLoadingPlan(null) },
      };

      const rzp = new window.Razorpay(options);
      rzp.open();
    } catch {
      toast.error('Could not initiate payment. Please try again.');
      setLoadingPlan(null);
    }
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/50 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Modal */}
      <div className="relative z-10 w-full max-w-4xl bg-white rounded-2xl shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="relative bg-gradient-to-br from-slate-900 to-slate-800 px-8 pt-8 pb-6 text-center">
          <button
            onClick={onClose}
            className="absolute top-4 right-4 text-slate-400 hover:text-white transition-colors p-1 rounded-lg hover:bg-white/10"
          >
            <X size={20} />
          </button>

          <div className="inline-flex items-center gap-2 bg-yellow-400/20 border border-yellow-400/30 text-yellow-300 text-xs font-semibold px-3 py-1 rounded-full mb-4">
            <Sparkles size={12} />
            AI-Powered Lead Discovery
          </div>

          <h2 className="text-2xl font-bold text-white mb-2">{copy.title}</h2>
          <p className="text-slate-400 text-sm max-w-md mx-auto">{copy.subtitle}</p>

          {/* Feature pills */}
          <div className="flex flex-wrap justify-center gap-2 mt-4">
            {[
              { icon: Search, label: 'Real Google results' },
              { icon: Brain, label: 'AI scored leads' },
              { icon: MapPin, label: 'Location targeting' },
              { icon: Mail, label: 'Contact enrichment' },
              { icon: FileDown, label: 'CSV export' },
            ].map(({ icon: Icon, label }) => (
              <span key={label} className="flex items-center gap-1.5 text-xs text-slate-300 bg-white/5 border border-white/10 px-2.5 py-1 rounded-full">
                <Icon size={11} />
                {label}
              </span>
            ))}
          </div>
        </div>

        {/* Plans */}
        <div className="p-6 grid grid-cols-1 md:grid-cols-3 gap-4 bg-slate-50">
          {PLANS.map((plan) => {
            const Icon = plan.icon;
            const isPopular = plan.badge === 'Best Value';
            const isLoading = loadingPlan === plan.key;

            return (
              <div
                key={plan.key}
                className={cn(
                  'relative bg-white rounded-xl border-2 p-5 flex flex-col transition-all duration-200',
                  plan.border,
                  isPopular && 'ring-2 ring-yellow-400 ring-offset-2 shadow-lg scale-[1.02]'
                )}
              >
                {/* Badge */}
                {plan.badge && (
                  <div className={cn(
                    'absolute -top-3 left-1/2 -translate-x-1/2 text-xs font-bold px-3 py-1 rounded-full',
                    isPopular ? 'bg-yellow-400 text-slate-900' : 'bg-purple-500 text-white'
                  )}>
                    {plan.badge}
                  </div>
                )}

                {/* Icon + Name */}
                <div className="flex items-center gap-2 mb-3">
                  <div className={cn('w-8 h-8 rounded-lg bg-gradient-to-br flex items-center justify-center text-white', plan.color)}>
                    <Icon size={16} />
                  </div>
                  <div>
                    <div className="font-bold text-slate-900 text-sm">{plan.name}</div>
                    <div className="text-xs text-slate-500">{plan.tagline}</div>
                  </div>
                </div>

                {/* Price */}
                <div className="mb-1">
                  <span className="text-3xl font-extrabold text-slate-900">₹{plan.price}</span>
                  <span className="text-slate-500 text-sm ml-1">/ {plan.duration}</span>
                </div>

                {/* Guarantee pill */}
                <div className="inline-flex items-center gap-1.5 bg-green-50 text-green-700 text-xs font-semibold px-2.5 py-1 rounded-full border border-green-200 mb-4 self-start">
                  <Check size={11} />
                  {plan.guarantee}
                </div>

                {/* Searches callout */}
                <div className="bg-slate-50 border border-slate-100 rounded-lg px-3 py-2.5 mb-4">
                  <div className="flex items-center justify-center gap-1.5">
                    <span className="text-2xl font-extrabold text-slate-900">{plan.baseSearches}</span>
                    <span className="text-xs text-slate-500 leading-tight">searches<br/>included</span>
                    <span className="text-slate-300 font-light text-lg mx-1">+</span>
                    <span className="text-lg font-bold text-green-600">{plan.freeSearches} free</span>
                  </div>
                  <p className="text-center text-[10px] text-slate-400 mt-1">{plan.searches} total discovery searches</p>
                </div>

                {/* Features */}
                <ul className="space-y-2 mb-5 flex-1">
                  {plan.features.map((f) => (
                    <li key={f} className="flex items-start gap-2 text-xs text-slate-600">
                      <Check size={13} className="text-green-500 mt-0.5 shrink-0" />
                      {f}
                    </li>
                  ))}
                </ul>

                {/* CTA */}
                <button
                  onClick={() => handleSubscribe(plan.key)}
                  disabled={!!loadingPlan}
                  className={cn(
                    'w-full py-2.5 rounded-lg font-semibold text-sm transition-all duration-200 flex items-center justify-center gap-2',
                    isPopular
                      ? 'bg-yellow-400 hover:bg-yellow-500 text-slate-900 shadow-md hover:shadow-lg'
                      : 'bg-slate-900 hover:bg-slate-800 text-white',
                    loadingPlan && !isLoading && 'opacity-40 cursor-not-allowed'
                  )}
                >
                  {isLoading ? (
                    <>
                      <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24" fill="none">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z" />
                      </svg>
                      Processing…
                    </>
                  ) : (
                    `Get ${plan.name}`
                  )}
                </button>
              </div>
            );
          })}
        </div>

        {/* Footer */}
        <div className="px-8 py-4 bg-white border-t border-slate-100 flex items-center justify-between">
          <p className="text-xs text-slate-400">🔒 Secured by Razorpay · No recurring charges · Cancel anytime</p>
          <p className="text-xs text-slate-400">Need help? <a href="mailto:support@clientstream.in" className="underline hover:text-slate-600">Contact us</a></p>
        </div>
      </div>
    </div>
  );
}
