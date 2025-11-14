import React from "react";

type TagTileProps = {
  label: string;
};

export function TagTile({ label }: TagTileProps) {
  return (
    <span className="text-xs px-3 py-1 rounded-full bg-white/5 text-slate-300">
      {label}
    </span>
  );
}

