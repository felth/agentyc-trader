"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import TodaysReflectionCard from "@/components/journal/TodaysReflectionCard";
import { AIReflectionCard } from "@/components/journal/AIReflectionCard";
import JournalMetricsGrid from "@/components/journal/JournalMetricsGrid";
import RecentEntriesList from "@/components/journal/RecentEntriesList";
import UpgradePlaybookPanel from "@/components/journal/UpgradePlaybookPanel";
import type { JournalEntry, Mood } from "@/lib/types/journal";
import { MemoryIndex, IngestMode } from "@/lib/constants/memory";

export default function JournalTab() {
  const pathname = usePathname();
  const now = new Date();
  const time = now.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  const dateStr = now.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  const dayStr = now.toLocaleDateString('en-US', { weekday: 'long' });
  const [entries, setEntries] = useState<JournalEntry[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchEntries();
  }, []);

  async function fetchEntries() {
    try {
      const res = await fetch("/api/journal/entries");
      const data = await res.json();
      if (data.ok) {
        setEntries(data.entries || []);
      }
    } catch (err) {
      console.error("Failed to fetch journal entries:", err);
    } finally {
      setLoading(false);
    }
  }

  async function handleSaveReflection(data: {
    mood: Mood;
    text: string;
    tags?: string[];
    symbol?: string;
    sendToPlaybook: boolean;
  }) {
    // Save journal entry
    const entryRes = await fetch("/api/journal/entries", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        mood: data.mood,
        text: data.text,
        tags: data.tags,
        symbol: data.symbol,
      }),
    });

    if (!entryRes.ok) {
      throw new Error("Failed to save journal entry");
    }

    // If sendToPlaybook is checked, also ingest to memory
    if (data.sendToPlaybook) {
      await fetch("/api/memory/ingest", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          source: "journal",
          index: MemoryIndex.PLAYBOOK,
          mode: IngestMode.RULES_ONLY,
          text: data.text, // TODO: Pass through LLM summarizer when available
        }),
      });
    }

    // Refresh entries
    await fetchEntries();
  }

  async function handleIngest(data: {
    text: string;
    index: MemoryIndex;
    mode: IngestMode;
  }) {
    const res = await fetch("/api/memory/ingest", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        source: "journal",
        ...data,
      }),
    });

    if (!res.ok) {
      const error = await res.json();
      throw new Error(error.error || "Failed to ingest");
    }
  }

  if (loading) {
    return (
      <main className="px-6 pt-10 pb-32 bg-[#0A0A0A] min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="w-8 h-8 border-2 border-[#00FF7F]/30 border-t-[#00FF7F] rounded-full animate-spin mx-auto" />
          <p className="mt-4 text-sm text-white/50">Loading journal...</p>
        </div>
      </main>
    );
  }

  return (
    <main className="bg-[#0A0A0A] min-h-screen flex flex-col">
      {/* Hero Section */}
      <section className="px-4 sm:px-6 lg:px-8 pt-6 pb-10 lg:pb-12">
        <div className="relative min-h-[50vh] md:min-h-[60vh] rounded-[2rem] overflow-hidden -mx-4 sm:-mx-6 lg:-mx-8">
          <div
            className="absolute inset-0 bg-cover bg-center bg-no-repeat"
            style={{ backgroundImage: "url('/hero-journal.jpeg')" }}
          />
          <div className="absolute inset-0 bg-black/40" />
          <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/40 to-transparent" />
          
          <div className="relative h-full flex flex-col px-6 py-6">
            {/* Top bar */}
            <div className="flex items-center justify-between mb-auto">
              <div className="flex items-center gap-2">
                <span className="text-sm font-bold text-white/90 tracking-tight">AGENTYC</span>
              </div>
              <div className="flex items-center gap-3">
                <button className="w-8 h-8 rounded-full bg-white/5 backdrop-blur-sm border border-white/10 flex items-center justify-center hover:bg-white/10 transition-colors">
                  <span className="text-sm">🔍</span>
                </button>
                <Link
                  href="/profile"
                  className={`w-8 h-8 rounded-full backdrop-blur-sm border flex items-center justify-center hover:bg-white/10 transition-colors ${
                    pathname === "/profile"
                      ? "bg-[#F56300]/20 border-[#F56300]/50"
                      : "bg-white/5 border-white/10"
                  }`}
                  aria-label="Settings"
                >
                  <span className="text-sm">⚙️</span>
                </Link>
              </div>
            </div>

            {/* Content */}
            <div className="mt-auto">
              <p className="text-[11px] uppercase tracking-[0.15em] font-bold text-ultra-accent mb-2">Journal</p>
              <h1 className="text-3xl md:text-4xl font-bold text-white tracking-tight mb-1">Your Reflections</h1>
              <p className="text-sm text-white/70">{dayStr} · {dateStr}</p>
            </div>
          </div>
        </div>
      </section>

      {/* Content Section */}
      <section className="px-6 pb-32 flex flex-col gap-9 max-w-5xl mx-auto w-full">
        {/* Section 1: Today's Reflection */}
        <div>
          <TodaysReflectionCard onSave={handleSaveReflection} loading={loading} />
        </div>

        {/* Section 2 & 3: Agency Reflection + Patterns Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <AIReflectionCard entries={entries} />
          <JournalMetricsGrid entries={entries} />
        </div>

        {/* Section 4: Recent Entries */}
        <div>
          <RecentEntriesList entries={entries} />
        </div>

        {/* Section 5: Upgrade your Playbook */}
        <div>
          <UpgradePlaybookPanel onIngest={handleIngest} />
        </div>
      </section>
    </main>
  );
}
