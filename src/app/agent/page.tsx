// src/app/agent/page.tsx

"use client";



import React, { useState, useRef, useEffect, FormEvent } from "react";

import { MemoryUploadPanel } from "@/components/MemoryUploadPanel";



type Role = "user" | "assistant";



type HistoryItem = {

  role: Role;

  content: string;

};



type AgentChatResponse = {

  ok: boolean;

  response?: string;

  error?: string;

  sources?: Array<{

    id: string;

    score?: number;

    metadata?: Record<string, unknown>;

  }>;

  usedSources?: string[];

};



export default function AgentPage() {

  const [history, setHistory] = useState<HistoryItem[]>([

    {

      role: "assistant",

      content: "Hi Liam, I'm your trading agent. Ask me about today's markets, your playbook rules, or anything in your lesson core."

    }

  ]);

  const [input, setInput] = useState("");

  const [loading, setLoading] = useState(false);

  const [error, setError] = useState<string | null>(null);

  const [lastSources, setLastSources] = useState<string[]>([]);

  const [notes, setNotes] = useState("");

  const [saving, setSaving] = useState(false);

  const [saveStatus, setSaveStatus] = useState<"idle" | "success" | "error">("idle");

  const [saveError, setSaveError] = useState<string | null>(null);

  const messagesEndRef = useRef<HTMLDivElement | null>(null);
  const hasScrolledRef = useRef(false);



  useEffect(() => {

    // Prevent scroll restoration on page load
    if (typeof window !== "undefined") {

      window.history.scrollRestoration = "manual";

      // Prevent any scrolling on mount - run immediately and after layout
      const preventScroll = () => {

        window.scrollTo({ top: 0, left: 0, behavior: "instant" });

        document.documentElement.scrollTop = 0;

        document.body.scrollTop = 0;

      };

      preventScroll();

      // Prevent after layout calculations and render cycles
      requestAnimationFrame(() => {

        preventScroll();

        requestAnimationFrame(preventScroll);

      });

      const timeoutId = setTimeout(preventScroll, 0);

      const timeoutId2 = setTimeout(preventScroll, 50);

      const timeoutId3 = setTimeout(preventScroll, 150);

      return () => {

        clearTimeout(timeoutId);

        clearTimeout(timeoutId2);

        clearTimeout(timeoutId3);

      };

    }

  }, []);



  useEffect(() => {

    // Only scroll to bottom when loading completes AFTER user has sent a message
    // Don't scroll on initial mount
    if (!loading && messagesEndRef.current && hasScrolledRef.current) {

      messagesEndRef.current.scrollIntoView({ behavior: "smooth" });

    }

  }, [loading]);



  // Track when user sends a message so we know to scroll on response
  useEffect(() => {

    if (history.length > 1) {

      hasScrolledRef.current = true;

    }

  }, [history]);



  async function handleSave() {

    if (!notes.trim()) {

      setSaveStatus("error");

      setSaveError("Please add some notes first.");

      return;

    }



    setSaving(true);

    setSaveStatus("idle");

    setSaveError(null);



    try {

      const res = await fetch("/api/ingest", {

        method: "POST",

        headers: { "Content-Type": "application/json" },

        body: JSON.stringify({

          notes: notes.trim(),

          source: "playbook"

        })

      });



      const data = await res.json();



      if (!data.ok) {

        setSaveStatus("error");

        setSaveError(data.error || "Failed to save lesson.");

      } else {

        setSaveStatus("success");

        setNotes("");

        setTimeout(() => setSaveStatus("idle"), 3000);

      }

    } catch (err: any) {

      setSaveStatus("error");

      setSaveError(err.message || "Network error saving lesson.");

    } finally {

      setSaving(false);

    }

  }



  async function handleSubmit(e: FormEvent) {

    e.preventDefault();

    const trimmed = input.trim();

    if (!trimmed || loading) return;



    setError(null);



    const newHistory: HistoryItem[] = [...history, { role: "user", content: trimmed }];

    setHistory(newHistory);

    setInput("");



    setLoading(true);



    try {

      const res = await fetch("/api/agent/chat", {

        method: "POST",

        headers: { "Content-Type": "application/json" },

        body: JSON.stringify({

          message: trimmed,

          history: newHistory.map((h) => ({ role: h.role, content: h.content })),

          sources: ["playbook"]

        })

      });



      const data: AgentChatResponse = await res.json();



      if (!data.ok || !data.response) {

        setError(data.error || "The agent could not respond.");

      } else {

        const assistantMessage: HistoryItem = { role: "assistant", content: data.response };

        setHistory((prev) => [...prev, assistantMessage]);

        setLastSources(data.usedSources || []);

      }

    } catch (err: any) {

      setError(err.message || "Network error talking to the agent.");

    } finally {

      setLoading(false);

    }

  }



  return (

    <div className="flex flex-col bg-black w-full max-w-md mx-auto overflow-x-hidden min-h-0">

      {/* Header - Premium Gradient */}
      <header className="flex-shrink-0 px-4 pt-4 pb-3 w-full overflow-x-hidden">
        <div className="relative h-48 rounded-[2rem] overflow-hidden group">
          {/* Background Image */}
          <div 
            className="absolute inset-0 bg-cover bg-center bg-no-repeat"
            style={{
              backgroundImage: "url('/hero-agent.jpeg')"
            }}
          />
          
          {/* Dark Overlay - Multiple layers for depth */}
          <div className="absolute inset-0 bg-black/30" />
          <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/30 to-black/20" />
          <div className="absolute inset-0 bg-gradient-to-br from-black/20 via-transparent to-black/30" />
          
          {/* Subtle accent gradient overlay */}
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,_rgba(245,99,0,0.1),_transparent_70%)]" />
          
          <div className="relative h-full flex flex-col justify-between px-6 py-5">
            <p className="text-[11px] uppercase tracking-[0.15em] font-bold text-ultra-accent">Trading Agent</p>
            <div className="space-y-2">
              <h1 className="text-2xl font-bold tracking-tight text-white">Hello, Liam</h1>
              <p className="text-sm text-white/70 leading-relaxed">
                Chat with your trading coach, grounded in your playbook rules and journal lessons.
              </p>
            </div>
          </div>
        </div>
      </header>



      {/* Source Badge */}
      <div className="flex-shrink-0 px-4 mb-4 w-full">
        <div className="inline-flex items-center gap-2 rounded-full bg-ultra-card px-3 py-1 text-xs text-gray-300 mb-3">
          <span className="w-1.5 h-1.5 rounded-full bg-ultra-accent" />
          <span>Source: Playbook</span>
        </div>
      </div>

      {/* Chat area */}
      <main className="flex-1 min-h-0 px-4 mb-4 w-full overflow-x-hidden">

        <div className="rounded-2xl bg-white/[0.03] backdrop-blur-2xl border border-white/10 shadow-[0_8px_32px_rgba(0,0,0,0.4)] overflow-hidden flex flex-col" style={{ minHeight: '400px', maxHeight: 'calc(100vh - 28rem)' }}>

          <div className="flex-1 min-h-0 overflow-y-auto px-4 py-4 space-y-3">

              {history.map((msg, idx) => (

                <div

                  key={idx}

                  className={

                    msg.role === "user"

                      ? "flex justify-end"

                      : "flex justify-start"

                  }

                >

                  <div

                    className={[

                      "max-w-[78%] rounded-2xl px-4 py-3 text-sm leading-relaxed font-medium",

                      msg.role === "user"

                        ? "bg-ultra-accent text-white shadow-[0_0_20px_rgba(245,99,0,0.8)]"

                        : "bg-white/[0.05] backdrop-blur-sm text-slate-100 border border-white/10"

                    ].join(" ")}

                  >

                    {msg.content}

                  </div>

                </div>

              ))}



              {loading && (

                <div className="flex justify-start">

                  <div className="rounded-2xl bg-white/[0.05] backdrop-blur-sm px-4 py-3 text-sm text-slate-400 border border-white/10">

                    Thinking…

                  </div>

                </div>

              )}



            <div ref={messagesEndRef} />

          </div>



          {error && (

            <div className="flex-shrink-0 px-4 pb-2">

              <div className="rounded-xl border border-ultra-negative/40 bg-ultra-negative/10 px-3 py-2 text-[12px] text-ultra-negative">

                {error}

              </div>

            </div>

          )}



          {!loading && lastSources.length > 0 && (

            <div className="flex-shrink-0 px-4 pb-2">

              <p className="text-[10px] text-gray-500">Sources: {lastSources.join(", ")}</p>

            </div>

          )}



          <form

            onSubmit={handleSubmit}

              className="flex-shrink-0 flex items-end gap-3 border-t border-white/10 bg-black/60 backdrop-blur-sm px-5 py-4"

          >

            <div className="flex-1 min-w-0">

              <div className="rounded-2xl bg-black/50 backdrop-blur-sm px-4 py-3 border border-white/10 focus-within:border-ultra-accent/80 transition-all">

                <textarea

                  rows={1}

                  value={input}

                  onChange={(e) => {

                    setInput(e.target.value);

                    e.target.style.height = 'auto';

                    e.target.style.height = e.target.scrollHeight + 'px';

                  }}

                  onKeyDown={(e) => {

                    if (e.key === 'Enter' && !e.shiftKey) {

                      e.preventDefault();

                      const form = e.currentTarget.closest('form');

                      if (form) {

                        form.requestSubmit();

                      }

                    }

                  }}

                  placeholder="Ask your agent about today's trades…"

                  className="w-full resize-none bg-transparent text-sm text-white placeholder:text-slate-500 focus:outline-none max-h-24 overflow-y-auto"

                  disabled={loading}

                />

              </div>

              <p className="mt-2 text-[10px] text-slate-500 font-medium">

                Agent uses only your ingested lessons (playbook, journal, books) – no random internet advice.

              </p>

            </div>



            <button

              type="submit"

              disabled={loading || !input.trim()}

              className={[

                "flex-shrink-0 rounded-full px-6 py-3 text-sm font-bold transition-all active:scale-95",

                loading || !input.trim()

                  ? "bg-white/5 text-slate-500 cursor-not-allowed"

                  : "bg-ultra-accent text-white shadow-[0_0_20px_rgba(245,99,0,0.8)] hover:bg-ultra-accentHover"

              ].join(" ")}

            >

              {loading ? "Sending…" : "Send"}

            </button>

          </form>

        </div>

      </main>

      {/* Add to Memory Section */}
      <div className="flex-shrink-0 px-4 mb-4 w-full space-y-3">
        {/* Memory Upload Panel */}
        <MemoryUploadPanel />

        {/* Memory Core - Manual Entry */}
        <div className="rounded-2xl bg-white/[0.03] backdrop-blur-2xl border border-white/10 p-4 space-y-3 shadow-[0_8px_32px_rgba(0,0,0,0.4)]">

          <div className="flex items-center gap-2">
            <span className="text-base">✍️</span>
            <h3 className="text-sm font-semibold text-white">Manual Entry (Playbook)</h3>
          </div>

          <p className="text-xs text-slate-400">
            Write a note about a setup, rule, or lesson. The app will auto-generate a title and tags and add it to your Playbook.
          </p>

          <textarea

            value={notes}

            onChange={(e) => setNotes(e.target.value)}

            placeholder="Write your trading rule, setup, or lesson..."

            rows={4}

            className="w-full px-3 py-2 rounded-xl bg-black/40 backdrop-blur-sm border border-white/10 text-sm text-white placeholder:text-slate-500 focus:outline-none focus:border-ultra-accent/80 transition-colors resize-none"

            required

          />

          <button

            onClick={handleSave}

            disabled={saving || !notes.trim()}

            className={[

              "w-full px-4 py-2 rounded-full text-xs font-bold transition-all active:scale-95",

              saving || !notes.trim()

                ? "bg-white/5 text-slate-500 cursor-not-allowed"

                : "bg-ultra-accent text-black hover:bg-ultra-accentHover shadow-[0_0_16px_rgba(245,99,0,0.5)]"

            ].join(" ")}

          >

            {saving ? "Saving…" : "Save"}

          </button>

          {saveStatus === "success" && (

            <p className="text-xs text-ultra-positive">✓ Saved to Playbook.</p>

          )}

          {saveStatus === "error" && saveError && (

            <p className="text-xs text-ultra-negative">✗ {saveError}</p>

          )}

        </div>

      </div>

    </div>

  );

}
