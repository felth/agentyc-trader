import React from "react";

export function StatTileGrid({ children }: { children: React.ReactNode }) {
  return <div className="grid grid-cols-2 gap-3 mt-2">{children}</div>;
}

