"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { TabPage } from "../../components/layout/TabPage";

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
    return (
      (doc.title || "").toLowerCase().includes(query) ||
      doc.filename.toLowerCase().includes(query)
    );
  });

  // Group documents by date for better organization
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

    // Return only groups that have documents
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
              {searchQuery ? "No documents match your search" : "No documents yet"}
            </p>
            <p className="text-xs text-slate-500 mt-2">
              Upload files through the Agent page to see them here
            </p>
          </div>
        ) : (
          <div className="space-y-5">
            {groupedDocs.map(([groupName, groupDocs]) => (
              <div key={groupName} className="space-y-3">
                {/* Date Group Header */}
                <div className="flex items-center gap-2 px-1">
                  <h2 className="text-xs font-bold text-slate-400 uppercase tracking-wider">
                    {groupName}
                  </h2>
                  <span className="text-xs text-slate-500">({groupDocs.length})</span>
                </div>

                {/* Single-column list view for better filename visibility */}
                <div className="space-y-2">
                  {groupDocs.map((doc) => (
                    <Link
                      key={doc.id}
                      href={`/library/${doc.id}`}
                      className="block rounded-xl bg-white/[0.03] backdrop-blur-2xl border border-white/10 p-3.5 hover:bg-white/[0.05] hover:border-white/20 transition-all active:scale-[0.98]"
                      title={doc.filename} // Tooltip shows full filename on hover
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
                        
                        {/* Content - full width for filename */}
                        <div className="flex-1 min-w-0">
                          {/* Filename - allow wrapping to 2 lines, then truncate with ellipsis */}
                          <h3 
                            className="text-sm font-bold text-white mb-1.5 leading-snug break-words"
                            style={{
                              display: '-webkit-box',
                              WebkitLineClamp: 2,
                              WebkitBoxOrient: 'vertical',
                              overflow: 'hidden',
                              textOverflow: 'ellipsis',
                              maxHeight: '2.5rem' // Approx 2 lines at leading-snug
                            }}
                          >
                            {doc.filename}
                          </h3>
                          
                          {/* Metadata row */}
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="text-xs text-slate-400">{getFileTypeLabel(doc.mime_type)}</span>
                            {doc.size_bytes && (
                              <>
                                <span className="text-xs text-slate-500">•</span>
                                <span className="text-xs text-slate-400">
                                  {(doc.size_bytes / 1024).toFixed(0)} KB
                                </span>
                              </>
                            )}
                            <span className="text-xs text-slate-500">•</span>
                            <span className="text-xs text-slate-400">{formatDate(doc.created_at)}</span>
                          </div>
                        </div>
                        
                        {/* Status badge - right side */}
                        <div className="flex-shrink-0 pt-0.5">
                          <span className="text-[10px] text-slate-500 whitespace-nowrap">
                            Ready
                          </span>
                        </div>
                      </div>
                    </Link>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </section>
    </TabPage>
  );
}

