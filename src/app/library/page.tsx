"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { TabPage } from "../../components/layout/TabPage";

type Document = {
  id: string;
  title: string | null;
  filename: string;
  category: "playbook" | "corpus";
  mime_type: string;
  storage_url: string;
  size_bytes: number | null;
  created_at: string;
  lesson_id: string | null;
};

export default function LibraryPage() {
  const pathname = usePathname();
  const now = new Date();
  const time = now.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  const [activeTab, setActiveTab] = useState<"playbook" | "corpus">("corpus");
  const [documents, setDocuments] = useState<Document[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");

  useEffect(() => {
    fetchDocuments();
  }, [activeTab]);

  async function fetchDocuments() {
    try {
      setLoading(true);
      const res = await fetch(`/api/library?category=${activeTab}`);
      const data = await res.json();
      if (data.ok) {
        setDocuments(data.documents || []);
      }
    } catch (err) {
      console.error("Failed to fetch documents:", err);
    } finally {
      setLoading(false);
    }
  }

  const filteredDocs = documents.filter((doc) => {
    const query = searchQuery.toLowerCase();
    return (
      (doc.title || "").toLowerCase().includes(query) ||
      doc.filename.toLowerCase().includes(query)
    );
  });

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffTime = Math.abs(now.getTime() - date.getTime());
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

    if (diffDays === 0) return "Today";
    if (diffDays === 1) return "Yesterday";
    if (diffDays < 7) return `${diffDays}d ago`;
    return date.toLocaleDateString([], { month: "short", day: "numeric" });
  };

  const getFileTypeLabel = (mimeType: string) => {
    if (mimeType.startsWith("image/")) return "Image";
    if (mimeType === "application/pdf") return "PDF";
    if (mimeType.startsWith("text/")) return "Text";
    return "File";
  };

  return (
    <TabPage>
      {/* Header */}
      <div className="relative h-48 rounded-[2rem] overflow-hidden group mb-5">
        {/* Background Image - using hero-journal for now, can be changed */}
        <div
          className="absolute inset-0 bg-cover bg-center bg-no-repeat"
          style={{
            backgroundImage: "url('/hero-journal.jpeg')"
          }}
        />
        
        {/* Dark Overlay */}
        <div className="absolute inset-0 bg-black/30" />
        <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/30 to-black/20" />
        <div className="absolute inset-0 bg-gradient-to-br from-black/20 via-transparent to-black/30" />
        
        {/* Subtle accent gradient overlay */}
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,_rgba(245,99,0,0.1),_transparent_70%)]" />
        <div className="relative h-full flex flex-col justify-between px-6 py-5">
          {/* Top bar */}
          <div className="flex items-center justify-between">
            <span className="text-sm font-semibold text-white/90 tracking-tight">{time}</span>
            <div className="flex items-center gap-3">
              <button className="w-8 h-8 rounded-full bg-white/5 backdrop-blur-sm border border-white/10 flex items-center justify-center hover:bg-white/10 transition-all active:scale-95">
                <span className="text-base">🔍</span>
              </button>
              <button className="w-8 h-8 rounded-full bg-white/5 backdrop-blur-sm border border-white/10 flex items-center justify-center hover:bg-white/10 transition-all active:scale-95 relative">
                <span className="text-base">🔔</span>
                <span className="absolute top-1 right-1 w-2 h-2 bg-ultra-accent rounded-full border border-black" />
              </button>
              <Link
                href="/profile"
                className={[
                  "w-8 h-8 rounded-full backdrop-blur-sm border flex items-center justify-center hover:bg-white/10 transition-all active:scale-95",
                  pathname === "/profile"
                    ? "bg-ultra-accent/20 border-ultra-accent/50"
                    : "bg-white/5 border-white/10"
                ].join(" ")}
                aria-label="Settings"
              >
                <span className="text-base">⚙️</span>
              </Link>
            </div>
          </div>

          <div className="space-y-1">
            <p className="text-[11px] uppercase tracking-[0.15em] font-bold text-ultra-accent">Library</p>
            <h1 className="text-2xl font-bold tracking-tight text-white">Your Documents</h1>
            <p className="text-sm text-white/70">View everything you've uploaded through the Agent</p>
          </div>
        </div>
      </div>

      {/* Search */}
      <section className="mb-5">
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="Search by filename or title..."
          className="w-full px-4 py-3 rounded-xl bg-white/[0.03] backdrop-blur-2xl border border-white/10 text-sm text-white placeholder:text-slate-500 focus:outline-none focus:border-ultra-accent/80 transition-colors"
        />
      </section>

      {/* Tabs */}
      <section className="mb-5">
        <div className="flex gap-2">
          <button
            onClick={() => setActiveTab("playbook")}
            className={[
              "flex-1 rounded-xl px-4 py-3 text-sm font-bold transition-all active:scale-95",
              activeTab === "playbook"
                ? "bg-ultra-accent/20 border border-ultra-accent/50 text-ultra-accent shadow-[0_0_12px_rgba(245,99,0,0.3)]"
                : "bg-white/[0.03] border border-white/10 text-gray-400 hover:bg-white/[0.05]"
            ].join(" ")}
          >
            Playbook
          </button>
          <button
            onClick={() => setActiveTab("corpus")}
            className={[
              "flex-1 rounded-xl px-4 py-3 text-sm font-bold transition-all active:scale-95",
              activeTab === "corpus"
                ? "bg-ultra-accent/20 border border-ultra-accent/50 text-ultra-accent shadow-[0_0_12px_rgba(245,99,0,0.3)]"
                : "bg-white/[0.03] border border-white/10 text-gray-400 hover:bg-white/[0.05]"
            ].join(" ")}
          >
            Corpus
          </button>
        </div>
      </section>

      {/* Documents List */}
      <section>
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <div className="text-center space-y-3">
              <div className="w-8 h-8 border-2 border-ultra-accent/30 border-t-ultra-accent rounded-full animate-spin mx-auto" />
              <p className="text-sm text-slate-400 font-medium">Loading documents...</p>
            </div>
          </div>
        ) : filteredDocs.length === 0 ? (
          <div className="rounded-2xl bg-white/[0.03] backdrop-blur-2xl border border-white/10 p-8 text-center">
            <p className="text-sm text-slate-400">
              {searchQuery ? "No documents match your search" : `No ${activeTab} documents yet`}
            </p>
            <p className="text-xs text-slate-500 mt-2">
              Upload files through the Agent page to see them here
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {filteredDocs.map((doc) => (
              <Link
                key={doc.id}
                href={`/library/${doc.id}`}
                className="block rounded-2xl bg-white/[0.03] backdrop-blur-2xl border border-white/10 p-4 hover:bg-white/[0.05] transition-all active:scale-[0.98]"
              >
                <div className="flex items-start gap-3">
                  <div className="w-10 h-10 rounded-xl bg-ultra-accent/20 border border-ultra-accent/30 flex items-center justify-center flex-shrink-0">
                    {doc.mime_type.startsWith("image/") ? (
                      <span className="text-lg">🖼️</span>
                    ) : doc.mime_type === "application/pdf" ? (
                      <span className="text-lg">📄</span>
                    ) : (
                      <span className="text-lg">📝</span>
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="text-sm font-bold text-white mb-1 truncate">
                      {doc.title || doc.filename}
                    </h3>
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-xs text-slate-400">{getFileTypeLabel(doc.mime_type)}</span>
                      <span className="text-xs text-slate-500">•</span>
                      <span className="text-xs text-slate-400">{formatDate(doc.created_at)}</span>
                      {doc.size_bytes && (
                        <>
                          <span className="text-xs text-slate-500">•</span>
                          <span className="text-xs text-slate-400">
                            {(doc.size_bytes / 1024).toFixed(0)} KB
                          </span>
                        </>
                      )}
                    </div>
                  </div>
                  <div className="flex-shrink-0">
                    <span
                      className={[
                        "text-[10px] px-2 py-1 rounded-full font-bold",
                        doc.category === "playbook"
                          ? "bg-ultra-accent/20 text-ultra-accent border border-ultra-accent/40"
                          : "bg-blue-500/20 text-blue-400 border border-blue-500/40"
                      ].join(" ")}
                    >
                      {doc.category === "playbook" ? "Playbook" : "Corpus"}
                    </span>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        )}
      </section>
    </TabPage>
  );
}

