"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { parseDocumentName } from "@/lib/libraryFormat";

type Document = {
  id: string;
  title: string | null;
  filename: string;
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
  const dateStr = now.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  const dayStr = now.toLocaleDateString('en-US', { weekday: 'long' });
  const [documents, setDocuments] = useState<Document[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");

  useEffect(() => {
    fetchDocuments();
  }, []);

  async function fetchDocuments() {
    try {
      setLoading(true);
      const res = await fetch(`/api/library`);
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
    const parsed = parseDocumentName(doc.filename || doc.title || "");
    return (
      parsed.title.toLowerCase().includes(query) ||
      (parsed.author && parsed.author.toLowerCase().includes(query)) ||
      doc.filename.toLowerCase().includes(query)
    );
  });

  // Group documents by date
  const groupDocumentsByDate = (docs: Document[]) => {
    const groups: { [key: string]: Document[] } = {
      Today: [],
      Yesterday: [],
      "This Week": [],
      "This Month": [],
      Older: [],
    };

    const now = new Date();
    docs.forEach((doc) => {
      const docDate = new Date(doc.created_at);
      const diffTime = Math.abs(now.getTime() - docDate.getTime());
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

      if (diffDays === 0) {
        groups.Today.push(doc);
      } else if (diffDays === 1) {
        groups.Yesterday.push(doc);
      } else if (diffDays < 7) {
        groups["This Week"].push(doc);
      } else if (diffDays < 30) {
        groups["This Month"].push(doc);
      } else {
        groups.Older.push(doc);
      }
    });

    return Object.entries(groups).filter(([_, docs]) => docs.length > 0);
  };

  const groupedDocs = groupDocumentsByDate(filteredDocs);

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

  if (loading) {
    return (
      <main className="px-6 pt-10 pb-32 bg-[#0A0A0A] min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="w-8 h-8 border-2 border-[#00FF7F]/30 border-t-[#00FF7F] rounded-full animate-spin mx-auto" />
          <p className="mt-4 text-sm text-white/50">Loading documents...</p>
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
              <p className="text-[11px] uppercase tracking-[0.15em] font-bold text-ultra-accent mb-2">Library</p>
              <h1 className="text-3xl md:text-4xl font-bold text-white tracking-tight mb-1">Your Documents</h1>
              <p className="text-sm text-white/70">View everything Agency has learned from your uploads</p>
            </div>
          </div>
        </div>
      </section>

      {/* Content Section */}
      <section className="px-6 pb-32 flex flex-col gap-9 max-w-5xl mx-auto w-full">
        {/* Filters */}
        <div className="flex items-center gap-3 flex-wrap">
          {["All", "Corpus", "Playbook"].map((filter) => (
            <button
              key={filter}
              className={`px-4 py-2 rounded-full text-xs font-medium transition-colors ${
                filter === "All"
                  ? "bg-ultra-accent text-black"
                  : "bg-white/5 text-white/60 hover:bg-white/10"
              }`}
            >
              {filter}
            </button>
          ))}
        </div>

        {/* Search */}
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="Search by filename or title..."
          className="w-full px-4 py-3 rounded-xl bg-white/[0.08] backdrop-blur-xl border border-white/15 text-sm text-white placeholder:text-white/40 focus:outline-none focus:border-ultra-accent/80 transition-colors"
        />

        {/* Documents List */}
        {filteredDocs.length === 0 ? (
          <div className="rounded-[24px] bg-white/[0.08] backdrop-blur-xl border border-white/15 p-8 text-center">
            <p className="text-sm text-white/50">
              {searchQuery ? "No documents match your search" : "No documents yet"}
            </p>
            <p className="text-xs text-white/40 mt-2">
              Upload files through the Agency page to see them here
            </p>
          </div>
        ) : (
          <div className="space-y-6">
            {groupedDocs.map(([groupName, groupDocs]) => (
              <div key={groupName} className="space-y-3">
                {/* Date Group Header */}
                <div className="flex items-center gap-2">
                  <h2 className="text-xs font-bold text-white/50 uppercase tracking-wider">
                    {groupName}
                  </h2>
                  <span className="text-xs text-white/40">({groupDocs.length})</span>
                </div>

                {/* Document cards */}
                <div className="space-y-2">
                  {groupDocs.map((doc) => {
                    const parsed = parseDocumentName(doc.filename || doc.title || "");
                    return (
                      <Link
                        key={doc.id}
                        href={`/library/${doc.id}`}
                        className="block rounded-xl bg-white/[0.08] backdrop-blur-xl border border-white/15 p-4 hover:bg-white/[0.12] hover:border-white/25 transition-all active:scale-[0.99]"
                      >
                        <div className="flex items-start gap-3">
                          {/* File Icon */}
                          <div className="w-11 h-11 rounded-lg bg-ultra-accent/20 border border-ultra-accent/30 flex items-center justify-center flex-shrink-0">
                            {doc.mime_type.startsWith("image/") ? (
                              <span className="text-lg">🖼️</span>
                            ) : doc.mime_type === "application/pdf" ? (
                              <span className="text-lg">📄</span>
                            ) : (
                              <span className="text-lg">📝</span>
                            )}
                          </div>
                          
                          {/* Content */}
                          <div className="flex-1 min-w-0">
                            <h3 className="text-sm font-bold text-white mb-1 line-clamp-2">
                              {parsed.title}
                            </h3>
                            {parsed.author && (
                              <p className="text-xs text-white/50 mb-2">
                                by {parsed.author}
                              </p>
                            )}
                            
                            {/* Metadata */}
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className="text-xs text-white/50">{getFileTypeLabel(doc.mime_type)}</span>
                              {doc.size_bytes && (
                                <>
                                  <span className="text-xs text-white/30">•</span>
                                  <span className="text-xs text-white/50">
                                    {(doc.size_bytes / 1024).toFixed(0)} KB
                                  </span>
                                </>
                              )}
                              <span className="text-xs text-white/30">•</span>
                              <span className="text-xs text-white/50">{formatDate(doc.created_at)}</span>
                            </div>
                          </div>
                          
                          {/* Status */}
                          <div className="flex-shrink-0 pt-0.5">
                            <span className="text-[10px] text-white/40 whitespace-nowrap">
                              Ready
                            </span>
                          </div>
                        </div>
                      </Link>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        )}
      </section>
    </main>
  );
}
