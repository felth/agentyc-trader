// src/app/agent/page.tsx
// Agent Landing Page - Redirects to control panel

"use client";

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function AgentPage() {
  const router = useRouter();
  
  useEffect(() => {
    router.replace('/agent/control');
  }, [router]);

  return (
    <div className="min-h-screen bg-[#0A0A0A] flex items-center justify-center">
      <div className="text-white">Redirecting to Agent Control Panel...</div>
    </div>
  );
}
