"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { parseDocumentName } from "@/lib/libraryFormat";
import LibraryHero from "@/components/library/LibraryHero";
import DocumentCard from "@/components/library/DocumentCard";
import MemoryIngestDrawer from "@/components/memory/MemoryIngestDrawer";
import type { LibraryDocument } from "@/lib/types/library";
import { MemoryIndex, IngestMode } from "@/lib/constants/memory";

type DocumentFromApi = {
  id: string;
  title: string | null;
  filename: string;
  mime_type: string;
  storage_url: string;
  size_bytes: number | null;
  created_at: string;
  lesson_id: string | null;
};

type FilterType = "All" | "Corpus" | "Playbook" | "Hybrid" | "Recent";
type SortType = "Recent" | "Title" | "Author";

export default function LibraryPage() {
  const pathname = usePathname();
  const [documents, setDocuments] = useState<LibraryDocument[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [filter, setFilter] = useState<FilterType>("All");
  const [sort, setSort] = useState<SortType>("Recent");
  const [drawerOpen, setDrawerOpen] = useState(false);

  useEffect(() => {
    fetchDocuments();
  }, []);

  async function fetchDocuments() {
    try {
      setLoading(true);
      const res = await fetch(`/api/library`);
      const data = await res.json();
      if (data.ok) {
        // Transform API documents to LibraryDocument format
        const transformed: LibraryDocument[] = (data.documents || []).map((doc: DocumentFromApi) => {
          const parsed = parseDocumentName(doc.filename || doc.title || "");
          // TODO: Derive index from ingest history or document metadata
          // For now, default to corpus or derive from source
          const index: LibraryDocument["index"] = "corpus" as MemoryIndex; // Default for now
          
          return {
            id: doc.id,
            fileName: doc.filename,
            title: parsed.title,
            author: parsed.author,
            index,
            createdAt: doc.created_at,
            sizeBytes: doc.size_bytes || undefined,
            status: "ready" as const,
            mimeType: doc.mime_type,
            storageUrl: doc.storage_url,
          };
        });
        setDocuments(transformed);
      }
    } catch (err) {
      console.error("Failed to fetch documents:", err);
    } finally {
      setLoading(false);
    }
  }

  // Calculate memory counts
  const corpusCount = documents.filter(d => d.index === MemoryIndex.CORPUS).length;
  const playbookCount = documents.filter(d => d.index === MemoryIndex.PLAYBOOK).length;
  const hybridCount = documents.filter(d => d.index === "hybrid").length;

  // Filter documents
  let filteredDocs = documents.filter((doc) => {
    // Search filter
    const query = searchQuery.toLowerCase();
    const matchesSearch =
      doc.title.toLowerCase().includes(query) ||
      (doc.author && doc.author.toLowerCase().includes(query)) ||
      doc.fileName.toLowerCase().includes(query);

    if (!matchesSearch) return false;

    // Index filter
    if (filter === "All") return true;
    if (filter === "Corpus") return doc.index === MemoryIndex.CORPUS;
    if (filter === "Playbook") return doc.index === MemoryIndex.PLAYBOOK;
    if (filter === "Hybrid") return doc.index === "hybrid";
    if (filter === "Recent") {
      const docDate = new Date(doc.createdAt);
      const now = new Date();
      const diffDays = Math.ceil((now.getTime() - docDate.getTime()) / (1000 * 60 * 60 * 24));
      return diffDays <= 7;
    }

    return true;
  });

  // Sort documents
  filteredDocs = [...filteredDocs].sort((a, b) => {
    if (sort === "Recent") {
      return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
    }
    if (sort === "Title") {
      return a.title.localeCompare(b.title);
    }
    if (sort === "Author") {
      const authorA = a.author || "";
      const authorB = b.author || "";
      return authorA.localeCompare(authorB);
    }
    return 0;
  });

  // Group by date
  const groupDocumentsByDate = (docs: LibraryDocument[]) => {
    const groups: { [key: string]: LibraryDocument[] } = {
      Today: [],
      Yesterday: [],
      "This Week": [],
      "This Month": [],
      Older: [],
    };

    const now = new Date();
    docs.forEach((doc) => {
      const docDate = new Date(doc.createdAt);
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

  async function handleIngest(data: {
    text?: string;
    fileId?: string;
    fileName?: string;
    index: MemoryIndex;
    mode: IngestMode;
  }) {
    const res = await fetch("/api/memory/ingest", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        source: "library",
        index: data.index,
        mode: data.mode,
        text: data.text,
        fileId: data.fileId,
        fileName: data.fileName,
      }),
    });

    if (!res.ok) {
      const error = await res.json();
      throw new Error(error.error || "Failed to ingest");
    }

    // Refresh documents
    await fetchDocuments();
  }

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
      <LibraryHero
        corpusCount={corpusCount}
        playbookCount={playbookCount}
        hybridCount={hybridCount}
        memoryStatus="LIVE"
        onAddDocument={() => setDrawerOpen(true)}
      />

      {/* Content Section */}
      <section className="px-6 pb-32 flex flex-col gap-9 max-w-5xl mx-auto w-full">
        {/* Controls Row */}
        <div className="space-y-4">
          {/* Filter chips */}
          <div className="flex items-center gap-2 flex-wrap">
            {(["All", "Corpus", "Playbook", "Hybrid", "Recent"] as FilterType[]).map((f) => (
              <button
                key={f}
                onClick={() => setFilter(f)}
                className={`px-4 py-2 rounded-full text-xs font-medium transition-colors ${
                  filter === f
                    ? "bg-ultra-accent text-black"
                    : "bg-white/5 text-white/60 hover:bg-white/10"
                }`}
              >
                {f}
              </button>
            ))}
          </div>

          {/* Search and Sort */}
          <div className="flex gap-3">
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search by filename or title..."
              className="flex-1 px-4 py-3 rounded-xl bg-white/[0.08] backdrop-blur-xl border border-white/15 text-sm text-white placeholder:text-white/40 focus:outline-none focus:border-ultra-accent/80 transition-colors"
            />
            <select
              value={sort}
              onChange={(e) => setSort(e.target.value as SortType)}
              className="px-4 py-3 rounded-xl bg-white/[0.08] backdrop-blur-xl border border-white/15 text-sm text-white focus:outline-none focus:border-ultra-accent/80"
            >
              <option value="Recent">Recent</option>
              <option value="Title">Title</option>
              <option value="Author">Author</option>
            </select>
          </div>
        </div>

        {/* Documents List */}
        {filteredDocs.length === 0 ? (
          <div className="rounded-[24px] bg-white/[0.08] backdrop-blur-xl border border-white/15 p-8 text-center">
            <p className="text-sm text-white/50">
              {searchQuery || filter !== "All"
                ? "No documents match your filters"
                : "No documents yet"}
            </p>
            <p className="text-xs text-white/40 mt-2">
              {filter === "All" && !searchQuery
                ? "Upload files through the Agency page to see them here"
                : "Try adjusting your search or filters"}
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
                  {groupDocs.map((doc) => (
                    <DocumentCard key={doc.id} document={doc} />
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* Memory Ingest Drawer */}
      <MemoryIngestDrawer
        isOpen={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        source="library"
        onIngest={handleIngest}
      />
    </main>
  );
}
