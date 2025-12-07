"use client";

import React, { useState } from "react";
import SourceStatusBadge from "@/components/ui/SourceStatusBadge";
import { MemoryIndex, IngestMode } from "@/lib/constants/memory";

type UpgradePlaybookPanelProps = {
  onIngest: (data: {
    text: string;
    index: MemoryIndex;
    mode: IngestMode;
  }) => Promise<void>;
};

export default function UpgradePlaybookPanel({
  onIngest,
}: UpgradePlaybookPanelProps) {
  const [activeTab, setActiveTab] = useState<"snippet" | "upload">("snippet");
  const [text, setText] = useState("");
  const [index, setIndex] = useState<MemoryIndex>(MemoryIndex.PLAYBOOK);
  const [mode, setMode] = useState<IngestMode>(IngestMode.HYBRID);
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState<"READY" | "PROCESSING" | "ERROR">("READY");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!text.trim()) return;

    setLoading(true);
    setStatus("PROCESSING");

    try {
      await onIngest({ text: text.trim(), index, mode });
      setText("");
      setStatus("READY");
    } catch (err) {
      console.error("Failed to ingest:", err);
      setStatus("ERROR");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="relative rounded-[24px] bg-white/[0.08] backdrop-blur-xl border border-white/15 p-6">
      <SourceStatusBadge
        provider="MEMORY"
        status={
          status === "READY"
            ? "OK"
            : status === "PROCESSING"
            ? "OK"
            : "ERROR"
        }
      />

      <h3 className="text-[16px] font-bold text-white mb-2">Upgrade your Playbook</h3>
      <p className="text-xs text-white/50 mb-4">
        Send snippets or small files into Agency's memory.
      </p>

      {/* Tabs */}
      <div className="flex gap-2 mb-4">
        <button
          type="button"
          onClick={() => setActiveTab("snippet")}
          className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
            activeTab === "snippet"
              ? "bg-ultra-accent text-black"
              : "bg-white/5 text-white/60 hover:bg-white/10"
          }`}
        >
          Snippet
        </button>
        <button
          type="button"
          onClick={() => setActiveTab("upload")}
          className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
            activeTab === "upload"
              ? "bg-ultra-accent text-black"
              : "bg-white/5 text-white/60 hover:bg-white/10"
          }`}
        >
          Upload
        </button>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Content input */}
        {activeTab === "snippet" ? (
          <textarea
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder="Paste text snippet or rules here..."
            rows={4}
            className="w-full px-3 py-2 rounded-xl bg-black/40 border border-white/10 text-sm text-white placeholder:text-white/40 focus:outline-none focus:border-ultra-accent/80 resize-none"
            required
          />
        ) : (
          <div className="p-4 rounded-xl bg-black/40 border border-white/10 text-center">
            <p className="text-xs text-white/50 mb-2">File upload coming soon</p>
            <p className="text-[10px] text-white/40">
              For now, paste text in the Snippet tab
            </p>
          </div>
        )}

        {/* Index selection */}
        <div>
          <label className="text-xs text-white/50 mb-2 block">Target index</label>
          <div className="flex gap-2">
            {[
              { value: MemoryIndex.PLAYBOOK, label: "Playbook (rules)" },
              { value: MemoryIndex.CORPUS, label: "Corpus (reference)" },
            ].map((opt) => (
              <label
                key={opt.value}
                className={`flex-1 px-3 py-2 rounded-lg border cursor-pointer transition-colors ${
                  index === opt.value
                    ? "bg-ultra-accent/20 border-ultra-accent/50"
                    : "bg-white/5 border-white/10 hover:bg-white/10"
                }`}
              >
                <input
                  type="radio"
                  name="index"
                  value={opt.value}
                  checked={index === opt.value}
                  onChange={(e) => setIndex(e.target.value as MemoryIndex)}
                  className="sr-only"
                />
                <span className="text-xs text-white font-medium">{opt.label}</span>
              </label>
            ))}
          </div>
        </div>

        {/* Mode selection */}
        <div>
          <label className="text-xs text-white/50 mb-2 block">Ingest mode</label>
          <select
            value={mode}
            onChange={(e) => setMode(e.target.value as IngestMode)}
            className="w-full px-3 py-2 rounded-lg bg-black/40 border border-white/10 text-sm text-white focus:outline-none focus:border-ultra-accent/80"
          >
            <option value={IngestMode.HYBRID}>Hybrid (rules + reference)</option>
            <option value={IngestMode.REFERENCE_ONLY}>Reference only</option>
            <option value={IngestMode.RULES_ONLY}>Rules only</option>
          </select>
        </div>

        {/* Submit */}
        <button
          type="submit"
          disabled={loading || !text.trim() || activeTab === "upload"}
          className="w-full px-4 py-2.5 rounded-xl bg-ultra-accent hover:bg-ultra-accentHover text-black text-sm font-bold transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {loading ? "Processing..." : "Send to Memory"}
        </button>
      </form>
    </div>
  );
}

