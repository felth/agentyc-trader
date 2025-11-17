// src/app/agent/page.tsx

"use client";



import React, { useState, useRef, useEffect, FormEvent } from "react";



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



type SourceType = "playbook" | "journal" | "book" | "manual";



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

  const [source, setSource] = useState<SourceType>("playbook");

  const [concept, setConcept] = useState("");

  const [notes, setNotes] = useState("");

  const [tagsInput, setTagsInput] = useState("");

  const [saving, setSaving] = useState(false);

  const [saveStatus, setSaveStatus] = useState<"idle" | "success" | "error">("idle");

  const [saveError, setSaveError] = useState<string | null>(null);

  const messagesEndRef = useRef<HTMLDivElement | null>(null);



  useEffect(() => {

    if (messagesEndRef.current) {

      messagesEndRef.current.scrollIntoView({ behavior: "smooth" });

    }

  }, [history, loading]);



  async function handleSave() {

    if (!notes.trim()) {

      setSaveStatus("error");

      setSaveError("Please add some notes first.");

      return;

    }



    const tags = tagsInput

      .split(",")

      .map((t) => t.trim())

      .filter(Boolean);



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

          source,

          lesson_id: undefined

        })

      });



      const data = await res.json();



      if (!data.ok) {

        setSaveStatus("error");

        setSaveError(data.error || "Failed to save lesson.");

      } else {

        setSaveStatus("success");

        setConcept("");

        setNotes("");

        setTagsInput("");

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

          sources: [source]

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



  const sources = ["playbook", "journal", "book", "manual"] as const;



  return (

    <div className="flex flex-col bg-black w-full max-w-full overflow-x-hidden">

      {/* Header */}

      <header className="flex-shrink-0 px-4 pt-16 pb-3 w-full max-w-full overflow-x-hidden">

        <div className="rounded-3xl bg-gradient-to-b from-[#151515] to-[#050505] px-5 py-4 border border-white/5 shadow-[0_20px_60px_rgba(0,0,0,0.7)]">

          <p className="text-xs uppercase tracking-[0.18em] text-gray-400 mb-1">

            Trading Agent

          </p>

          <h1 className="text-xl font-semibold text-white">Hello, Liam</h1>

          <p className="mt-1 text-[13px] text-gray-400">

            Chat with your trading coach, grounded in your playbook rules and journal lessons. Ask about setups, risk, or today's plan.

          </p>

        </div>

      </header>



      {/* Source Selector */}

      <div className="flex-shrink-0 px-4 mb-3 w-full max-w-full overflow-x-hidden">

        <label className="text-xs uppercase text-gray-400 mb-1 block">Source</label>

        <div className="flex gap-2">

          {sources.map((s) => (

            <button

              key={s}

              onClick={() => setSource(s)}

              className={[

                "px-3 py-1 rounded-full text-xs font-medium border transition-colors",

                source === s

                  ? "bg-ultra-accent text-black border-ultra-accent"

                  : "bg-ultra-card text-gray-300 border-ultra-border"

              ].join(" ")}

            >

              {s.charAt(0).toUpperCase() + s.slice(1)}

            </button>

          ))}

        </div>

      </div>



      {/* Memory Core Panel */}

      <div className="flex-shrink-0 px-4 mb-3 max-h-[35vh] overflow-y-auto w-full max-w-full">

        <div className="rounded-3xl bg-ultra-card border border-ultra-border p-4 space-y-3">

          <div>

            <h2 className="text-sm font-semibold text-white mb-1">Memory Core</h2>

            <p className="text-xs text-gray-400">Store your playbook rules and trading lessons.</p>

          </div>

          <input

            type="text"

            value={concept}

            onChange={(e) => setConcept(e.target.value)}

            placeholder="Concept (e.g. Playbook: breakout timing rule)"

            className="w-full px-3 py-2 rounded-xl bg-ultra-cardAlt border border-ultra-border text-sm text-white placeholder:text-gray-500 focus:outline-none focus:border-ultra-accent"

          />

          <textarea

            value={notes}

            onChange={(e) => setNotes(e.target.value)}

            placeholder="Notes or lesson details..."

            rows={4}

            className="w-full px-3 py-2 rounded-xl bg-ultra-cardAlt border border-ultra-border text-sm text-white placeholder:text-gray-500 focus:outline-none focus:border-ultra-accent resize-none"

          />

          <input

            type="text"

            value={tagsInput}

            onChange={(e) => setTagsInput(e.target.value)}

            placeholder="Tags (comma separated, optional)"

            className="w-full px-3 py-2 rounded-xl bg-ultra-cardAlt border border-ultra-border text-sm text-white placeholder:text-gray-500 focus:outline-none focus:border-ultra-accent"

          />

          <button

            onClick={handleSave}

            disabled={saving}

            className={[

              "inline-flex items-center justify-center px-3 py-1.5 rounded-full text-xs font-medium transition-colors",

              saving

                ? "bg-ultra-card text-gray-500 cursor-not-allowed"

                : "bg-ultra-accent text-black hover:bg-ultra-accentHover"

            ].join(" ")}

          >

            {saving ? "Saving…" : "Save to Memory"}

          </button>

          {saveStatus === "success" && (

            <p className="text-xs text-ultra-positive">Saved to memory.</p>

          )}

          {saveStatus === "error" && saveError && (

            <p className="text-xs text-ultra-negative">Error: {saveError}</p>

          )}

        </div>

      </div>



      {/* Chat area */}

      <main className="flex-1 min-h-0 px-4 pb-3 w-full max-w-full overflow-x-hidden">

        <div className="rounded-3xl bg-ultra-card/80 border border-ultra-border shadow-[0_18px_45px_rgba(0,0,0,0.85)] overflow-hidden flex flex-col" style={{ height: 'calc(100vh - 32rem)', maxHeight: '500px' }}>

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

                      "max-w-[78%] rounded-2xl px-3 py-2 text-[13px] leading-relaxed",

                      msg.role === "user"

                        ? "bg-ultra-accent text-white shadow-[0_0_18px_rgba(245,99,0,0.75)]"

                        : "bg-ultra-cardAlt text-gray-100 border border-white/5"

                    ].join(" ")}

                  >

                    {msg.content}

                  </div>

                </div>

              ))}



              {loading && (

                <div className="flex justify-start">

                  <div className="rounded-2xl bg-ultra-cardAlt px-3 py-2 text-[12px] text-gray-400 border border-white/5">

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

            className="flex-shrink-0 flex items-end gap-2 border-t border-ultra-border bg-black/80 px-4 py-3"

          >

            <div className="flex-1 min-w-0">

              <div className="rounded-2xl bg-ultra-cardAlt px-3 py-2 border border-ultra-border focus-within:border-ultra-accent/80 transition-colors">

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

                  className="w-full resize-none bg-transparent text-[13px] text-white placeholder:text-gray-500 focus:outline-none max-h-24 overflow-y-auto"

                  disabled={loading}

                />

              </div>

              <p className="mt-1 text-[10px] text-gray-500">

                Agent uses only your ingested lessons (playbook, journal, books) – no random internet advice.

              </p>

            </div>



            <button

              type="submit"

              disabled={loading || !input.trim()}

              className={[

                "flex-shrink-0 rounded-full px-4 py-2 text-[13px] font-semibold transition-colors",

                loading || !input.trim()

                  ? "bg-ultra-card text-gray-500"

                  : "bg-ultra-accent text-white shadow-[0_0_20px_rgba(245,99,0,0.8)] hover:bg-ultra-accentHover"

              ].join(" ")}

            >

              {loading ? "Sending…" : "Send"}

            </button>

          </form>

        </div>

      </main>

    </div>

  );

}
