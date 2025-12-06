"use client";

import { useRouter } from "next/navigation";

export default function ActionButtons({ symbol }: { symbol: string }) {
  const router = useRouter();

  return (
    <div className="flex flex-col gap-4 mt-4">
      <button
        onClick={() => router.push(`/journal?symbol=${symbol}`)}
        className="w-full bg-[#1A1A1A] text-white text-[16px] font-semibold py-4 rounded-xl hover:bg-[#222] transition-colors"
      >
        Add Note for {symbol}
      </button>

      <button
        onClick={() => router.push(`/agent`)} // Temporary until order ticket UI
        className="w-full bg-white text-black text-[16px] font-semibold py-4 rounded-xl hover:opacity-90 transition-opacity"
      >
        Open Order Ticket
      </button>
    </div>
  );
}

