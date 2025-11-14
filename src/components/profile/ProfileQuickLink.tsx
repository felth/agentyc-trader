import React from "react";
import { cn } from "../../lib/cn";

type ProfileQuickLinkProps = {
  label: string;
  description?: string;
  icon?: React.ReactNode;
  onClick?: () => void;
};

export function ProfileQuickLink({ label, description, icon, onClick }: ProfileQuickLinkProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="w-full flex items-center justify-between px-1 py-2 text-sm hover:text-white transition"
    >
      <div className="flex flex-col items-start text-left">
        <span>{label}</span>
        {description && <span className="text-xs text-slate-400">{description}</span>}
      </div>
      <div className="flex items-center gap-1 text-slate-500">
        {icon}
        <span className={cn("text-slate-500")}>›</span>
      </div>
    </button>
  );
}

