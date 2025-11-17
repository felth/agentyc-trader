// src/app/agent/page.tsx

"use client";



import React, { useState, useRef, useEffect, FormEvent, useTransition } from "react";



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

  const [loading, startTransition] = useTransition();

  const [error, setError] = useState<string | null>(null);

  const [lastSources, setLastSources] = useState<string[]>([]);

  const messagesEndRef = useRef<HTMLDivElement | null>(null);



  useEffect(() => {

    if (messagesEndRef.current) {

      messagesEndRef.current.scrollIntoView({ behavior: "smooth" });

    }

  }, [history, loading]);



  async function handleSubmit(e: FormEvent) {

    e.preventDefault();

    const trimmed = input.trim();

    if (!trimmed || loading) return;



    setError(null);



    const newHistory: HistoryItem[] = [...history, { role: "user", content: trimmed }];

    setHistory(newHistory);

    setInput("");



    startTransition(async () => {

      try {

        const res = await fetch("/api/agent/chat", {

          method: "POST",

          headers: { "Content-Type": "application/json" },

          body: JSON.stringify({

            message: trimmed,

            history: newHistory.map((h) => ({ role: h.role, content: h.content }))

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

      }

    });

  }



  return (

    <div className="flex min-h-screen flex-col bg-ultra-black text-white">

      <div className="flex-1 overflow-y-auto pb-24">

        <div className="max-w-md mx-auto px-4 pt-6 pb-6 space-y-4">

          {history.map((msg, idx) => (

            <div

              key={idx}

              className={[

                "rounded-3xl px-4 py-3 max-w-[85%] break-words",

                msg.role === "user"

                  ? "ml-auto bg-ultra-accent text-black"

                  : "mr-auto bg-ultra-card border border-ultra-border text-white"

              ].join(" ")}

            >

              <p className="text-sm leading-relaxed whitespace-pre-wrap">{msg.content}</p>

            </div>

          ))}

          {loading && (

            <div className="mr-auto bg-ultra-card border border-ultra-border rounded-3xl px-4 py-3 max-w-[85%]">

              <div className="flex items-center gap-2 text-sm text-gray-400">

                <span className="animate-pulse">●</span>

                <span>Agent is thinking...</span>

              </div>

            </div>

          )}

          {error && (

            <div className="mr-auto bg-ultra-negative/20 border border-ultra-negative/50 rounded-3xl px-4 py-3 max-w-[85%]">

              <p className="text-sm text-ultra-negative">{error}</p>

            </div>

          )}

          {lastSources.length > 0 && (

            <div className="mr-auto bg-ultra-cardAlt border border-ultra-border rounded-2xl px-3 py-2 max-w-[85%]">

              <p className="text-xs text-gray-400 mb-1">Sources: {lastSources.join(", ")}</p>

            </div>

          )}

          <div ref={messagesEndRef} />

        </div>

      </div>

      <form

        onSubmit={handleSubmit}

        className="fixed bottom-20 left-0 right-0 z-30 px-4 pb-4"

      >

        <div className="max-w-md mx-auto flex gap-2">

          <input

            type="text"

            value={input}

            onChange={(e) => setInput(e.target.value)}

            placeholder="Ask your agent..."

            disabled={loading}

            className="flex-1 rounded-full bg-ultra-card border border-ultra-border px-4 py-3 text-sm text-white placeholder-gray-400 focus:outline-none focus:border-ultra-accent focus:ring-2 focus:ring-ultra-accent/20 disabled:opacity-50"

          />

          <button

            type="submit"

            disabled={!input.trim() || loading}

            className="rounded-full bg-ultra-accent text-black px-6 py-3 text-sm font-semibold disabled:opacity-50 disabled:cursor-not-allowed hover:bg-ultra-accentHover transition active:scale-95"

          >

            Send

          </button>

        </div>

      </form>

    </div>

  );

}

