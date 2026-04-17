"use client";

import React, { useState } from 'react';
import Sidebar from '@/components/Sidebar';
import Navbar from '@/components/Navbar';
import SubscriptionModal from '@/components/SubscriptionModal';
import { AnimatePresence, motion } from 'framer-motion';

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [showUpgradeModal, setShowUpgradeModal] = useState(false);

  const toggleSidebar = () => setIsSidebarOpen(!isSidebarOpen);
  const closeSidebar = () => setIsSidebarOpen(false);

  return (
    <div className="min-h-screen bg-slate-100/50 soft-yellow-bg relative">
      <AnimatePresence>
        {isSidebarOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={closeSidebar}
            className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-40 md:hidden"
          />
        )}
      </AnimatePresence>

      <Sidebar isOpen={isSidebarOpen} onClose={closeSidebar} />

      <div className="flex flex-col min-h-screen md:ml-64 transition-all duration-300">
        <Navbar onMenuClick={toggleSidebar} onUpgradeClick={() => setShowUpgradeModal(true)} />
        <main className="flex-1 overflow-x-hidden">
          {children}
        </main>
      </div>

      <SubscriptionModal
        open={showUpgradeModal}
        reason="SUBSCRIPTION_REQUIRED"
        onClose={() => setShowUpgradeModal(false)}
        onSuccess={() => setShowUpgradeModal(false)}
      />
    </div>
  );
}
