"use client";

import React, { useState, useEffect, FormEvent } from "react";
import { TabPage } from "../../../components/layout/TabPage";

type JournalEntry = {
  lesson_id: string;
  concept: string;
  notes: string;
  tags: string[];
  created_at: string;
  timestamp: string;
};

const moods = [
  { emoji: "⚡️", label: "Focused", value: "focused" },
  { emoji: "🙂", label: "Balanced", value: "balanced" },
  { emoji: "😐", label: "Neutral", value: "neutral" },
  { emoji: "😔", label: "Challenged", value: "challenged" },
  { emoji: "🔥", label: "Strong", value: "strong" },
];

const patterns = [
  { label: "Revenge trades", value: "2 this week", status: "warning" as const },
  { label: "Skipped plan", value: "1 instance", status: "negative" as const },
  { label: "Morning prep", value: "Completed 5/5", status: "positive" as const },
  { label: "Screenshots logged", value: "8 added", status: "positive" as const },
];

export default function JournalTab() {
  const [entries, setEntries] = useState<JournalEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [concept, setConcept] = useState("");
  const [notes, setNotes] = useState("");
  const [tagsInput, setTagsInput] = useState("");
  const [selectedMood, setSelectedMood] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [saveStatus, setSaveStatus] = useState<"idle" | "success" | "error">("idle");
  const [saveError, setSaveError] = useState<string | null>(null);

  useEffect(() => {
    fetchEntries();
  }, []);

  async function fetchEntries() {
    try {
      const res = await fetch("/api/journal");
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

  async function handleSave(e: FormEvent) {
    e.preventDefault();

    if (!notes.trim()) {
      setSaveStatus("error");
      setSaveError("Please add some reflection notes.");
      return;
    }

    const tags = tagsInput
      .split(",")
      .map((t) => t.trim())
      .filter(Boolean);

    if (selectedMood) {
      tags.push(`mood:${selectedMood}`);
    }

    setSaving(true);
    setSaveStatus("idle");
    setSaveError(null);

    try {
      const res = await fetch("/api/ingest", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          concept: concept.trim() || undefined,
          notes: notes.trim(),
          tags,
          source: "journal",
          lesson_id: undefined,
        }),
      });

      const data = await res.json();

      if (!data.ok) {
        setSaveStatus("error");
        setSaveError(data.error || "Failed to save journal entry.");
      } else {
        setSaveStatus("success");
        setConcept("");
        setNotes("");
        setTagsInput("");
        setSelectedMood(null);
        setTimeout(() => setSaveStatus("idle"), 2000);
        fetchEntries();
      }
    } catch (err: any) {
      setSaveStatus("error");
      setSaveError(err.message || "Network error saving journal entry.");
    } finally {
      setSaving(false);
    }
  }

  const todaysEntry = entries.find((entry) => {
    const entryDate = new Date(entry.created_at);
    const today = new Date();
    return (
      entryDate.getDate() === today.getDate() &&
      entryDate.getMonth() === today.getMonth() &&
      entryDate.getFullYear() === today.getFullYear()
    );
  });

  const recentEntries = entries.slice(0, 10);
  return (
    <TabPage>
      {/* Header */}
      <div className="relative h-48 rounded-[2rem] overflow-hidden group mb-5">
        {/* Background Image */}
        <div 
          className="absolute inset-0 bg-cover bg-center bg-no-repeat"
          style={{
            backgroundImage: "url('/hero-journal.jpeg')"
          }}
        />
        
        {/* Dark Overlay - Multiple layers for depth */}
        <div className="absolute inset-0 bg-black/30" />
        <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/30 to-black/20" />
        <div className="absolute inset-0 bg-gradient-to-br from-black/20 via-transparent to-black/30" />
        
        {/* Subtle accent gradient overlay */}
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,_rgba(245,99,0,0.1),_transparent_70%)]" />
        <div className="relative h-full flex flex-col justify-between px-6 py-5">
          <p className="text-[11px] uppercase tracking-[0.15em] font-bold text-ultra-accent">Journal</p>
          <div className="space-y-1">
            <h1 className="text-2xl font-bold tracking-tight text-white">Your Reflections</h1>
            <p className="text-sm text-white/70">Track your trading journey</p>
          </div>
        </div>
      </div>

      {/* New Journal Entry */}
      <section className="mb-5 space-y-3">
        {/* Source Badge */}
        <div className="inline-flex items-center gap-2 rounded-full bg-ultra-card px-3 py-1 text-xs text-gray-300">
          <span className="w-1.5 h-1.5 rounded-full bg-ultra-accent" />
          <span>Source: Journal</span>
        </div>

        <form onSubmit={handleSave} className="rounded-2xl bg-white/[0.03] backdrop-blur-2xl border border-white/10 p-5 space-y-4 shadow-[0_8px_32px_rgba(0,0,0,0.4)]">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-ultra-accent/20 border border-ultra-accent/30 flex items-center justify-center">
              <span className="text-lg">📓</span>
            </div>
            <div>
              <h2 className="text-base font-bold text-white tracking-tight">New Journal Entry</h2>
              <p className="text-xs text-slate-400 mt-0.5">Your agent learns from your reflections</p>
            </div>
          </div>

          {/* Mood Selector */}
          <div>
            <label className="text-xs text-slate-400 mb-2 block">How are you feeling?</label>
            <div className="flex gap-2">
              {moods.map((mood) => (
                <button
                  key={mood.value}
                  type="button"
                  onClick={() => setSelectedMood(mood.value === selectedMood ? null : mood.value)}
                  className={[
                    "flex-1 rounded-xl border px-3 py-2.5 transition-all active:scale-95",
                    selectedMood === mood.value
                      ? "bg-ultra-accent/20 border-ultra-accent/50 shadow-[0_0_12px_rgba(245,99,0,0.3)]"
                      : "bg-black/40 border-white/10 hover:bg-black/60 hover:border-white/15",
                  ].join(" ")}
                >
                  <div className="text-center">
                    <span className="text-2xl block mb-1">{mood.emoji}</span>
                    <p className="text-[10px] text-slate-400 font-medium">{mood.label}</p>
                  </div>
                </button>
              ))}
            </div>
          </div>

          <input
            type="text"
            value={concept}
            onChange={(e) => setConcept(e.target.value)}
            placeholder="Title (optional, e.g. 'Breakout timing — ES 5m')"
            className="w-full px-3 py-2 rounded-xl bg-black/40 backdrop-blur-sm border border-white/10 text-sm text-white placeholder:text-slate-500 focus:outline-none focus:border-ultra-accent/80 transition-colors"
          />

          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Write your reflection, trading notes, lessons learned..."
            rows={4}
            className="w-full px-3 py-2 rounded-xl bg-black/40 backdrop-blur-sm border border-white/10 text-sm text-white placeholder:text-slate-500 focus:outline-none focus:border-ultra-accent/80 transition-colors resize-none"
            required
          />

          <div className="flex gap-2">
            <input
              type="text"
              value={tagsInput}
              onChange={(e) => setTagsInput(e.target.value)}
              placeholder="Tags (optional)"
              className="flex-1 px-3 py-2 rounded-xl bg-black/40 backdrop-blur-sm border border-white/10 text-sm text-white placeholder:text-slate-500 focus:outline-none focus:border-ultra-accent/80 transition-colors"
            />
            <button
              type="submit"
              disabled={saving || !notes.trim()}
              className={[
                "px-4 py-2 rounded-full text-xs font-bold transition-all active:scale-95 whitespace-nowrap",
                saving || !notes.trim()
                  ? "bg-white/5 text-slate-500 cursor-not-allowed"
                  : "bg-ultra-accent text-black hover:bg-ultra-accentHover shadow-[0_0_16px_rgba(245,99,0,0.5)]",
              ].join(" ")}
            >
              {saving ? "Saving…" : "Save"}
            </button>
          </div>

          {saveStatus === "success" && (
            <p className="text-xs text-ultra-positive">✓ Saved to journal. Your agent can now learn from this.</p>
          )}

          {saveStatus === "error" && saveError && (
            <p className="text-xs text-ultra-negative">✗ {saveError}</p>
          )}
        </form>
      </section>

      {/* Today's Journal Card */}
      {todaysEntry && (
        <section className="mb-5">
          <div className="rounded-2xl bg-white/[0.03] backdrop-blur-2xl border border-white/10 p-5 shadow-[0_8px_32px_rgba(0,0,0,0.4)]">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-xl bg-ultra-accent/20 border border-ultra-accent/30 flex items-center justify-center">
                <span className="text-lg">📓</span>
              </div>
              <div>
                <h2 className="text-base font-bold text-white tracking-tight">Today's Journal</h2>
                <p className="text-xs text-slate-400 mt-0.5">{todaysEntry.timestamp}</p>
              </div>
            </div>
            {todaysEntry.concept && (
              <h3 className="text-sm font-semibold text-white mb-2">{todaysEntry.concept}</h3>
            )}
            <p className="text-sm text-slate-300 leading-relaxed font-medium mb-3">{todaysEntry.notes}</p>
            {todaysEntry.tags.length > 0 && (
              <div className="flex flex-wrap gap-1.5">
                {todaysEntry.tags
                  .filter((tag) => !tag.startsWith("mood:"))
                  .map((tag) => (
                    <span
                      key={tag}
                      className="text-[10px] px-2 py-1 rounded-full bg-white/5 border border-white/10 text-slate-400 font-medium"
                    >
                      {tag}
                    </span>
                  ))}
                {todaysEntry.tags
                  .filter((tag) => tag.startsWith("mood:"))
                  .map((tag) => {
                    const moodValue = tag.replace("mood:", "");
                    const mood = moods.find((m) => m.value === moodValue);
                    return mood ? (
                      <span
                        key={tag}
                        className="text-[10px] px-2 py-1 rounded-full bg-ultra-accent/20 border border-ultra-accent/40 text-ultra-accent font-medium"
                      >
                        {mood.emoji} {mood.label}
                      </span>
                    ) : null;
                  })}
              </div>
            )}
          </div>
        </section>
      )}

      {/* AI Reflection */}
      <section className="mb-5">
        <div className="rounded-2xl bg-gradient-to-br from-[#F56300]/15 via-[#F56300]/5 to-cyan-500/5 backdrop-blur-2xl border border-white/10 px-5 py-5 shadow-[0_8px_32px_rgba(245,99,0,0.15)]">
          <div className="flex items-start gap-4">
            <div className="w-12 h-12 rounded-xl bg-white/10 border border-white/20 flex items-center justify-center flex-shrink-0">
              <span className="text-2xl">🤖</span>
            </div>
            <div className="flex-1">
              <h3 className="text-base font-bold text-white mb-2">AI Reflection</h3>
              <p className="text-sm text-slate-300 leading-relaxed font-medium">
                AI suggests reinforcing your pre-trade checklist. Trades aligned with the higher timeframe and taken during the first 90 minutes performed best. Consider pausing when feeling restless to avoid revenge entries.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Patterns & Tags */}
      <section className="mb-5">
        <div className="flex items-center justify-between mb-3 px-1">
          <h2 className="text-[11px] uppercase tracking-[0.15em] font-bold text-ultra-accent">Patterns & Tags</h2>
        </div>
        <div className="grid grid-cols-2 gap-3">
          {patterns.map((pattern) => (
            <div
              key={pattern.label}
              className="rounded-2xl bg-white/[0.03] backdrop-blur-2xl border border-white/10 px-4 py-3 hover:bg-white/[0.06] transition-all shadow-[0_8px_32px_rgba(0,0,0,0.4)]"
            >
              <p className="text-xs text-slate-400 font-medium mb-1.5">{pattern.label}</p>
              <p className="text-sm font-bold text-white tracking-tight mb-1">{pattern.value}</p>
              <span
                className={`text-[10px] px-2 py-0.5 rounded-full font-bold inline-block ${
                  pattern.status === "positive"
                    ? "bg-ultra-positive/20 text-ultra-positive border border-ultra-positive/40"
                    : pattern.status === "warning"
                    ? "bg-yellow-500/20 text-yellow-400 border border-yellow-500/40"
                    : "bg-ultra-negative/20 text-ultra-negative border border-ultra-negative/40"
                }`}
              >
                {pattern.status.toUpperCase()}
              </span>
            </div>
          ))}
        </div>
      </section>

      {/* Recent Entries */}
      <section className="space-y-3 mb-5">
        <div className="flex items-center justify-between px-1">
          <h2 className="text-[11px] uppercase tracking-[0.15em] font-bold text-ultra-accent">Recent Entries</h2>
          {recentEntries.length > 0 && (
            <span className="text-[10px] text-slate-500 font-medium">{recentEntries.length} entries</span>
          )}
        </div>
        {loading ? (
          <div className="rounded-2xl bg-white/[0.03] backdrop-blur-2xl border border-white/10 px-5 py-4">
            <p className="text-sm text-slate-400 text-center">Loading...</p>
          </div>
        ) : recentEntries.length === 0 ? (
          <div className="rounded-2xl bg-white/[0.03] backdrop-blur-2xl border border-white/10 px-5 py-4">
            <p className="text-sm text-slate-400 text-center">No journal entries yet. Start by adding your first reflection above.</p>
          </div>
        ) : (
          <div className="space-y-3">
            {recentEntries
              .filter((entry) => {
                // Exclude today's entry if it exists (shown in Today's Journal card)
                if (todaysEntry && entry.lesson_id === todaysEntry.lesson_id) return false;
                return true;
              })
              .map((entry) => (
                <div
                  key={entry.lesson_id}
                  className="rounded-2xl bg-white/[0.03] backdrop-blur-2xl border border-white/10 px-5 py-4 hover:bg-white/[0.06] hover:border-white/15 transition-all shadow-[0_8px_32px_rgba(0,0,0,0.4)] active:scale-[0.99]"
                >
                  <div className="flex items-start justify-between gap-3 mb-2">
                    <h3 className="text-base font-bold text-white tracking-tight flex-1">{entry.concept || "Journal Entry"}</h3>
                    <span className="text-[10px] text-slate-500 font-medium">{entry.timestamp}</span>
                  </div>
                  <p className="text-sm text-slate-300 leading-relaxed font-medium mb-3">{entry.notes}</p>
                  {entry.tags.length > 0 && (
                    <div className="flex flex-wrap gap-1.5">
                      {entry.tags
                        .filter((tag) => !tag.startsWith("mood:"))
                        .map((tag) => (
                          <span
                            key={tag}
                            className="text-[10px] px-2 py-1 rounded-full bg-white/5 border border-white/10 text-slate-400 font-medium"
                          >
                            {tag}
                          </span>
                        ))}
                      {entry.tags
                        .filter((tag) => tag.startsWith("mood:"))
                        .map((tag) => {
                          const moodValue = tag.replace("mood:", "");
                          const mood = moods.find((m) => m.value === moodValue);
                          return mood ? (
                            <span
                              key={tag}
                              className="text-[10px] px-2 py-1 rounded-full bg-ultra-accent/20 border border-ultra-accent/40 text-ultra-accent font-medium"
                            >
                              {mood.emoji} {mood.label}
                            </span>
                          ) : null;
                        })}
                    </div>
                  )}
                </div>
              ))}
          </div>
        )}
      </section>

      {/* Timeline - based on actual entries */}
      {entries.filter((e) => {
        const entryDate = new Date(e.created_at);
        const today = new Date();
        return (
          entryDate.getDate() === today.getDate() &&
          entryDate.getMonth() === today.getMonth() &&
          entryDate.getFullYear() === today.getFullYear()
        );
      }).length > 0 && (
        <section className="mb-5">
          <div className="flex items-center justify-between mb-3 px-1">
            <h2 className="text-[11px] uppercase tracking-[0.15em] font-bold text-ultra-accent">Today's Timeline</h2>
          </div>
          <div className="rounded-2xl bg-white/[0.03] backdrop-blur-2xl border border-white/10 px-5 py-4 shadow-[0_8px_32px_rgba(0,0,0,0.4)]">
            <div className="space-y-4">
              {entries
                .filter((e) => {
                  const entryDate = new Date(e.created_at);
                  const today = new Date();
                  return (
                    entryDate.getDate() === today.getDate() &&
                    entryDate.getMonth() === today.getMonth() &&
                    entryDate.getFullYear() === today.getFullYear()
                  );
                })
                .map((entry, idx, arr) => {
                  const entryDate = new Date(entry.created_at);
                  const time = entryDate.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit", hour12: true });
                  return (
                    <div key={entry.lesson_id} className="flex gap-4">
                      <div className="flex flex-col items-center">
                        <div className="w-2 h-2 rounded-full bg-ultra-accent border-2 border-black" />
                        {idx < arr.length - 1 && <div className="w-0.5 h-full bg-white/5 mt-1" />}
                      </div>
                      <div className="flex-1 pb-4">
                        <p className="text-xs font-bold text-ultra-accent mb-1">{time}</p>
                        <p className="text-sm text-slate-300 leading-relaxed font-medium">
                          {entry.concept ? `${entry.concept} · ` : ""}
                          {entry.notes.slice(0, 80)}
                          {entry.notes.length > 80 ? "…" : ""}
                        </p>
                      </div>
                    </div>
                  );
                })}
            </div>
          </div>
        </section>
      )}
    </TabPage>
  );
}