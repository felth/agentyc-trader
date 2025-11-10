"use client";

import React, { useState, useTransition } from "react";
import MatchCard from "@/components/MatchCard";

type QueryResponse = {
  ok: boolean;
  matches: any[];
  insights?: string;
  error?: string;
};

export default function JournalPage() {
  const [q, setQ] = useState("");
  const [res, setRes] = useState<QueryResponse | null>(null);
  const [isPending, startTransition] = useTransition();

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    startTransition(async () => {
      setRes(null);
      try {
        const r = await fetch("/api/query", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ query: q, topK: 8 }),
        });
        const j = (await r.json()) as QueryResponse;
        setRes(j);
      } catch (err: any) {
        setRes({ ok: false, matches: [], error: err?.message || "Request failed" });
      }
    });
  };

  return (
    <main className="max-w-3xl mx-auto px-4 py-8">
      <h1 className="text-2xl font-semibold mb-4">Agentyc Trader — Journal</h1>

      <form onSubmit={onSubmit} className="flex gap-2 mb-4">
        <label htmlFor="q" className="sr-only">
          Query
        </label>
        <input
          id="q"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Ask your lessons… e.g., false breakouts volume confirmation"
          className="flex-1 border rounded px-3 py-2"
          disabled={isPending}
        />
        <button
          type="submit"
          className="px-4 py-2 border rounded bg-black text-white disabled:opacity-50"
          disabled={isPending || !q.trim()}
        >
          {isPending ? "Searching…" : "Search"}
        </button>
      </form>

      <section aria-live="polite" className="space-y-3">
        {isPending && <div className="text-sm text-gray-600">Loading…</div>}

        {res?.error && <div className="text-sm text-red-600">Error: {res.error}</div>}

        {res?.ok && (res.matches?.length ?? 0) === 0 && (
          <div className="text-sm text-gray-600">No relevant lessons — add more data.</div>
        )}

        {res?.ok && res.matches?.length > 0 && (
          <>
            {res.matches.map((m, i) => (
              <MatchCard key={m.id || i} m={m} />
            ))}
            {res.insights && (
              <div className="mt-3 p-3 border rounded bg-white/60">
                <div className="text-sm font-medium mb-1">AI Insight</div>
                <div className="text-sm text-gray-800 whitespace-pre-wrap">{res.insights}</div>
              </div>
            )}
          </>
        )}
      </section>
    </main>
  );
}

