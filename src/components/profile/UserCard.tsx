import React from "react";

type UserCardProps = {
  initials: string;
  name: string;
  subtitle: string;
};

export function UserCard({ initials, name, subtitle }: UserCardProps) {
  return (
    <div className="rounded-3xl bg-white/5 border border-white/5 px-4 py-3 flex items-center gap-3">
      <div className="w-10 h-10 rounded-full bg-[#F56300] flex items-center justify-center text-black font-semibold">
        {initials}
      </div>
      <div>
        <p className="text-sm font-semibold">{name}</p>
        <p className="text-xs text-slate-400">{subtitle}</p>
      </div>
    </div>
  );
}

