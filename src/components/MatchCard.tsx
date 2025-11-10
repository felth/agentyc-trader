"use client";

import React from "react";

type Match = {
  id?: string;
  score?: number;
  metadata?: {
    lesson_id?: string;
    concept?: string;
    notes?: string;
    image_url?: string;
    summary?: string;
    explanation?: string;
    tags?: string[];
  };
};

export default function MatchCard({ m }: { m: Match }) {
  const s = m.score ?? 0;
  const md = m.metadata ?? {};
  const notes = (md.notes ?? md.explanation ?? "").trim();
  const short = notes.length > 140 ? notes.slice(0, 140) + "…" : notes;

  return (
    <div className="rounded border p-4 flex gap-4 bg-white/60" role="article">
      {md.image_url ? (
        <img
          src={md.image_url}
          alt={`${md.concept || "lesson"} screenshot`}
          className="w-28 h-20 object-cover rounded border"
        />
      ) : (
        <div className="w-28 h-20 rounded border bg-gray-100 flex items-center justify-center text-xs text-gray-500">
          no image
        </div>
      )}
      <div className="flex-1">
        <div className="flex items-center justify-between">
          <h3 className="font-semibold">{md.concept ?? "Untitled concept"}</h3>
          <span className="text-xs text-gray-600">score {s.toFixed(2)}</span>
        </div>
        <p className="text-sm text-gray-700 mt-1">{short || "—"}</p>
        <div className="mt-2 flex flex-wrap gap-2">
          {(md.tags ?? []).slice(0, 6).map((t, i) => (
            <span key={i} className="text-xs px-2 py-0.5 rounded bg-gray-100 border">
              {t}
            </span>
          ))}
        </div>
        <div className="text-xs text-gray-500 mt-2">lesson: {md.lesson_id ?? "—"}</div>
      </div>
    </div>
  );
}

