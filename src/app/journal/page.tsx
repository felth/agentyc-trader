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
    <main className="space-y-4">
      <h1 className="text-2xl font-semibold text-ultra-accent">Journal</h1>

      <form onSubmit={onSubmit} className="flex gap-2">
        <label htmlFor="q" className="sr-only">
          Query
        </label>
        <input
          id="q"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Ask your lessons… e.g., false breakouts volume confirmation"
          className="flex-1 border border-ultra-border bg-ultra-cardAlt text-white rounded px-3 py-2 placeholder:text-gray-500 focus:ring-2 focus:ring-ultra-accent/60 focus:outline-none"
          disabled={isPending}
        />
        <button
          type="submit"
          className="px-4 py-2 rounded bg-ultra-accent text-black font-medium hover:bg-ultra-accentHover disabled:opacity-50"
          disabled={isPending || !q.trim()}
        >
          {isPending ? "Searching…" : "Search"}
        </button>
      </form>

      <section role="status" className="space-y-3">
        {isPending && <div className="text-sm text-gray-400">Loading…</div>}

        {res?.error && <div className="text-sm text-ultra-negative">Error: {res.error}</div>}

        {res?.ok && (res.matches?.length ?? 0) === 0 && (
          <div className="text-sm text-gray-400">No relevant lessons — add more data.</div>
        )}

        {res?.ok && res.matches?.length > 0 && (
          <>
            {res.matches.map((m, i) => (
              <MatchCard key={m.id || i} m={m} />
            ))}
            {res.insights && (
              <div className="mt-3 p-3 border border-ultra-border rounded-2xl bg-ultra-card">
                <div className="text-sm font-medium text-ultra-accent mb-1">
                  AI Insight
                </div>
                <div className="text-sm text-gray-200 whitespace-pre-wrap">{res.insights}</div>
              </div>
            )}
          </>
        )}
      </section>
    </main>
  );
}

