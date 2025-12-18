"use client";

import SourceStatusBadge from "@/components/ui/SourceStatusBadge";

export default function OrdersPlaceholder() {
  return (
    <div className="relative rounded-[24px] bg-white/[0.08] backdrop-blur-xl border border-white/15 p-6">
      <SourceStatusBadge provider="BROKER" status="OFF" />
      <h2 className="text-[18px] font-bold text-white mb-4">Orders</h2>
      <div className="space-y-2">
        <p className="text-sm text-white/50">
          Order history not wired yet. When broker order endpoint is connected, you'll see
          working, filled, and cancelled orders here.
        </p>
      </div>
    </div>
  );
}

