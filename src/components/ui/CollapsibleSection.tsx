"use client";

import { useState, type ReactNode } from "react";

type CollapsibleSectionProps = {
  title: string;
  defaultCollapsed?: boolean;
  children: ReactNode;
};

export default function CollapsibleSection({ 
  title, 
  defaultCollapsed = true,
  children 
}: CollapsibleSectionProps) {
  const [isCollapsed, setIsCollapsed] = useState(defaultCollapsed);

  return (
    <section className="px-6 py-4">
      <button
        onClick={() => setIsCollapsed(!isCollapsed)}
        className="w-full flex items-center justify-between mb-3 text-left"
      >
        <h2 className="text-[#9EA6AE] text-[13px] uppercase tracking-[0.08em] font-medium">
          {title}
        </h2>
        <span className="text-white/40 text-lg leading-none">
          {isCollapsed ? "+" : "−"}
        </span>
      </button>
      {!isCollapsed && (
        <div className="transition-all duration-200">
          {children}
        </div>
      )}
    </section>
  );
}

