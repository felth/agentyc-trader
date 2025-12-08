"use client";

import React, { useState } from "react";
import SourceStatusBadge from "@/components/ui/SourceStatusBadge";
import type { Mood } from "@/lib/types/journal";

const moods = [
  { emoji: "⚡️", label: "Focused", value: "focused" as Mood },
  { emoji: "🙂", label: "Balanced", value: "balanced" as Mood },
  { emoji: "😐", label: "Neutral", value: "neutral" as Mood },
  { emoji: "😔", label: "Challenged", value: "challenged" as Mood },
  { emoji: "🔥", label: "Strong", value: "strong" as Mood },
];

type TodaysReflectionCardProps = {
  onSave: (data: {
    mood: Mood;
    text: string;
    tags?: string[];
    symbol?: string;
    sendToPlaybook: boolean;
  }) => Promise<void>;
  loading?: boolean;
};

export default function TodaysReflectionCard({
  onSave,
  loading = false,
}: TodaysReflectionCardProps) {
  const [mood, setMood] = useState<Mood | null>(null);
  const [text, setText] = useState("");
  const [tagsInput, setTagsInput] = useState("");
  const [symbol, setSymbol] = useState("");
  const [sendToPlaybook, setSendToPlaybook] = useState(true);
  const [saving, setSaving] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!text.trim() || !mood) return;

    setSaving(true);
    const tags = tagsInput
      .split(",")
      .map(t => t.trim())
      .filter(Boolean);

    try {
      await onSave({
        mood,
        text: text.trim(),
        tags: tags.length > 0 ? tags : undefined,
        symbol: symbol.trim() || undefined,
        sendToPlaybook,
      });
      
      // Reset form
      setText("");
      setTagsInput("");
      setSymbol("");
      setMood(null);
    } catch (err) {
      console.error("Failed to save reflection:", err);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="relative rounded-[24px] bg-white/[0.08] backdrop-blur-xl border border-white/15 p-6">
      <SourceStatusBadge provider="JOURNAL" status="OK" />
      
      <div className="pr-20 mb-4">
        <h3 className="text-[16px] font-bold text-white">Today's Reflection</h3>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Mood Selector */}
        <div>
          <label className="text-xs text-white/50 mb-2 block">How are you feeling?</label>
          <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide -mx-2 px-2">
            {moods.map((m) => (
              <button
                key={m.value}
                type="button"
                onClick={() => setMood(m.value === mood ? null : m.value)}
                className={`flex-shrink-0 rounded-xl border px-3 py-2.5 transition-all min-w-[70px] ${
                  mood === m.value
                    ? "bg-ultra-accent/20 border-ultra-accent/50"
                    : "bg-white/5 border-white/10 hover:bg-white/10"
                }`}
              >
                <div className="text-center">
                  <span className="text-xl block mb-1">{m.emoji}</span>
                  <p className="text-[10px] text-white/70 font-medium">{m.label}</p>
                </div>
              </button>
            ))}
          </div>
        </div>

        {/* Textarea */}
        <div>
          <textarea
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder="Write your reflection, trading notes, lessons learned..."
            rows={4}
            className="w-full px-3 py-2 rounded-xl bg-black/40 border border-white/10 text-sm text-white placeholder:text-white/40 focus:outline-none focus:border-ultra-accent/80 transition-colors resize-none"
            required
          />
        </div>

        {/* Optional fields */}
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="text-xs text-white/50 mb-1 block">Symbol (optional)</label>
            <input
              type="text"
              value={symbol}
              onChange={(e) => setSymbol(e.target.value.toUpperCase())}
              placeholder="XAUUSD"
              className="w-full px-3 py-2 rounded-lg bg-black/40 border border-white/10 text-sm text-white placeholder:text-white/40 focus:outline-none focus:border-ultra-accent/80"
            />
          </div>
          <div>
            <label className="text-xs text-white/50 mb-1 block">Tags (comma-separated)</label>
            <input
              type="text"
              value={tagsInput}
              onChange={(e) => setTagsInput(e.target.value)}
              placeholder="revenge, skipped_plan"
              className="w-full px-3 py-2 rounded-lg bg-black/40 border border-white/10 text-sm text-white placeholder:text-white/40 focus:outline-none focus:border-ultra-accent/80"
            />
          </div>
        </div>

        {/* Send to Playbook checkbox */}
        <div className="flex items-center gap-2">
          <input
            type="checkbox"
            id="sendToPlaybook"
            checked={sendToPlaybook}
            onChange={(e) => setSendToPlaybook(e.target.checked)}
            className="w-4 h-4 rounded border-white/20 bg-black/40 text-ultra-accent focus:ring-ultra-accent"
          />
          <label htmlFor="sendToPlaybook" className="text-xs text-white/70">
            Send key lessons to Playbook (Agency uses this in decisions)
          </label>
        </div>

        {/* Save Button */}
        <button
          type="submit"
          disabled={saving || loading || !text.trim() || !mood}
          className="w-full px-4 py-2.5 rounded-xl bg-ultra-accent hover:bg-ultra-accentHover text-black text-sm font-bold transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {saving ? "Saving…" : "Save Reflection"}
        </button>
      </form>
    </div>
  );
}

