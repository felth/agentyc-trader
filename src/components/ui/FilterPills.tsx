import React from "react";
import { cn } from "../../lib/cn";

type FilterPillsProps = {
  options: string[];
  active: string;
  onChange?: (value: string) => void;
};

export function FilterPills({ options, active, onChange }: FilterPillsProps) {
  return (
    <div className="flex flex-wrap gap-2 mt-2">
      {options.map((option) => {
        const isActive = option === active;
        return (
          <button
            key={option}
            type="button"
            onClick={() => onChange?.(option)}
            className={cn(
              "px-3 py-1 rounded-full text-xs transition",
              isActive
                ? "bg-[#F56300]/20 text-[#F56300]"
                : "bg-white/5 text-slate-300 hover:bg-white/10"
            )}
          >
            {option}
          </button>
        );
      })}
    </div>
  );
}

