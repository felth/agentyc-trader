import React from "react";

export function TabPage({ children }: { children: React.ReactNode }) {
  return (
    <div className="max-w-md mx-auto px-4 pt-4 pb-28 space-y-6">
      {children}
    </div>
  );
}

