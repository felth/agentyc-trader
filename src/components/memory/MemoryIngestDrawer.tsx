"use client";

import React, { useState } from "react";
import { MemoryIndex, IngestMode } from "@/lib/constants/memory";

type MemoryIngestDrawerProps = {
  isOpen: boolean;
  onClose: () => void;
  source: "library" | "journal";
  onIngest: (data: {
    text?: string;
    fileId?: string;
    fileName?: string;
    index: MemoryIndex;
    mode: IngestMode;
  }) => Promise<void>;
};

export default function MemoryIngestDrawer({
  isOpen,
  onClose,
  source,
  onIngest,
}: MemoryIngestDrawerProps) {
  const [activeTab, setActiveTab] = useState<"snippet" | "upload">("snippet");
  const [text, setText] = useState("");
  const [index, setIndex] = useState<MemoryIndex>(MemoryIndex.CORPUS);
  const [mode, setMode] = useState<IngestMode>(IngestMode.HYBRID);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    setLoading(true);

    try {
      await onIngest({
        text: activeTab === "snippet" ? text.trim() : undefined,
        index,
        mode,
      });
      
      // Reset form
      setText("");
      setActiveTab("snippet");
      onClose();
    } catch (err) {
      console.error("Failed to ingest:", err);
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-end md:items-center justify-center p-4"
      onClick={onClose}
    >
      <div
        className="rounded-t-3xl md:rounded-3xl bg-[#111111] border border-white/20 p-6 w-full max-w-lg max-h-[90vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-bold text-white">Add to Memory</h2>
          <button
            onClick={onClose}
            className="text-white/50 hover:text-white transition-colors"
          >
            ✕
          </button>
        </div>

        {/* Tabs */}
        <div className="flex gap-2 mb-4">
          <button
            type="button"
            onClick={() => setActiveTab("snippet")}
            className={`flex-1 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
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
            className={`flex-1 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
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
            <div>
              <label className="text-xs text-white/50 mb-2 block">Text content</label>
              <textarea
                value={text}
                onChange={(e) => setText(e.target.value)}
                placeholder="Paste text snippet, rules, or reference material here..."
                rows={6}
                className="w-full px-3 py-2 rounded-xl bg-black/40 border border-white/10 text-sm text-white placeholder:text-white/40 focus:outline-none focus:border-ultra-accent/80 resize-none"
                required
              />
            </div>
          ) : (
            <div className="p-6 rounded-xl bg-black/40 border border-white/10 text-center">
              <p className="text-sm text-white/50 mb-2">File upload coming soon</p>
              <p className="text-xs text-white/40">
                For now, paste text in the Snippet tab
              </p>
            </div>
          )}

          {/* Index selection */}
          <div>
            <label className="text-xs text-white/50 mb-2 block">Target index</label>
            <div className="grid grid-cols-3 gap-2">
              {[
                { value: MemoryIndex.CORPUS, label: "Corpus" },
                { value: MemoryIndex.PLAYBOOK, label: "Playbook" },
                { value: "hybrid" as const, label: "Hybrid" },
              ].map((opt) => (
                <label
                  key={opt.label}
                  className={`px-3 py-2 rounded-lg border cursor-pointer transition-colors text-center ${
                    index === opt.value || (opt.value === "hybrid" && mode === IngestMode.HYBRID)
                      ? "bg-ultra-accent/20 border-ultra-accent/50"
                      : "bg-white/5 border-white/10 hover:bg-white/10"
                  }`}
                >
                  <input
                    type="radio"
                    name="index"
                    value={opt.value}
                    checked={
                      opt.value === "hybrid"
                        ? mode === IngestMode.HYBRID
                        : index === opt.value && mode !== IngestMode.HYBRID
                    }
                    onChange={(e) => {
                      if (opt.value === "hybrid") {
                        setMode(IngestMode.HYBRID);
                      } else {
                        setIndex(opt.value as MemoryIndex);
                        if (mode === IngestMode.HYBRID) {
                          setMode(IngestMode.REFERENCE_ONLY);
                        }
                      }
                    }}
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
              onChange={(e) => {
                const newMode = e.target.value as IngestMode;
                setMode(newMode);
                if (newMode === IngestMode.HYBRID) {
                  // Hybrid automatically feeds both
                } else if (newMode === IngestMode.REFERENCE_ONLY) {
                  setIndex(MemoryIndex.CORPUS);
                } else if (newMode === IngestMode.RULES_ONLY) {
                  setIndex(MemoryIndex.PLAYBOOK);
                }
              }}
              className="w-full px-3 py-2 rounded-lg bg-black/40 border border-white/10 text-sm text-white focus:outline-none focus:border-ultra-accent/80"
            >
              <option value={IngestMode.HYBRID}>Hybrid (rules + reference)</option>
              <option value={IngestMode.REFERENCE_ONLY}>Reference only</option>
              <option value={IngestMode.RULES_ONLY}>Rules only</option>
            </select>
            <p className="text-[10px] text-white/40 mt-1">
              {mode === IngestMode.HYBRID && "Feeds both Corpus and Playbook"}
              {mode === IngestMode.REFERENCE_ONLY && "Feeds Corpus only"}
              {mode === IngestMode.RULES_ONLY && "Feeds Playbook only"}
            </p>
          </div>

          {/* Submit */}
          <div className="flex gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-2.5 rounded-xl bg-white/5 hover:bg-white/10 text-white text-sm font-medium transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading || !text.trim() || activeTab === "upload"}
              className="flex-1 px-4 py-2.5 rounded-xl bg-ultra-accent hover:bg-ultra-accentHover text-black text-sm font-bold transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? "Processing..." : "Add to Memory"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

