import React from "react";

type SectionHeaderProps = {
  title: string;
  actionText?: string;
  actionIcon?: React.ReactNode;
  onActionClick?: () => void;
};

export function SectionHeader({
  title,
  actionText,
  actionIcon,
  onActionClick
}: SectionHeaderProps) {
  return (
    <div className="flex items-center justify-between mb-3">
      <h2 className="text-base font-semibold tracking-tight text-white">{title}</h2>
      {(actionText || actionIcon) && (
        <button
          type="button"
          onClick={onActionClick}
          className="text-xs text-slate-300 hover:text-white flex items-center gap-1.5 px-2 py-1 rounded-full hover:bg-white/10 transition"
        >
          {actionIcon && <span className="text-sm">{actionIcon}</span>}
          {actionText}
        </button>
      )}
    </div>
  );
}

