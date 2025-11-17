import React from "react";

export function TabPage({ children }: { children: React.ReactNode }) {
  return (
    <div className="max-w-md mx-auto px-4 pt-6 pb-32">
      {children}
    </div>
  );
}

