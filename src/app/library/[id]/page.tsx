"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname, useParams } from "next/navigation";
import { parseDocumentName } from "@/lib/libraryFormat";
import SourceStatusBadge from "@/components/ui/SourceStatusBadge";
import { MemoryIndex, IngestMode } from "@/lib/constants/memory";
import type { LibraryDocument } from "@/lib/types/library";

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

export default function DocumentViewerPage() {
  const pathname = usePathname();
  const params = useParams();
  const [document, setDocument] = useState<LibraryDocument | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [reingesting, setReingesting] = useState(false);
  const [sendingToJournal, setSendingToJournal] = useState(false);

  useEffect(() => {
    if (params.id) {
      fetchDocument();
    }
  }, [params.id]);

  async function fetchDocument() {
    try {
      setLoading(true);
      setError(null);
      const res = await fetch(`/api/library/${params.id}`);
      const data = await res.json();
      if (data.ok && data.document) {
        const doc = data.document as DocumentFromApi;
        const parsed = parseDocumentName(doc.filename || doc.title || "");
        // TODO: Derive index from ingest history
        const index: LibraryDocument["index"] = "corpus" as MemoryIndex;
        
        setDocument({
          id: doc.id,
          fileName: doc.filename,
          title: parsed.title,
          author: parsed.author || null,
          index,
          createdAt: doc.created_at,
          sizeBytes: doc.size_bytes || undefined,
          status: "ready",
          mimeType: doc.mime_type,
          storageUrl: doc.storage_url,
        });
      } else {
        setError(data.error || "Failed to load document");
      }
    } catch (err: any) {
      setError(err.message || "Failed to load document");
    } finally {
      setLoading(false);
    }
  }

  async function handleReingestAsHybrid() {
    if (!document) return;
    
    setReingesting(true);
    try {
      // TODO: Fetch document content and re-ingest
      const res = await fetch("/api/memory/ingest", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          source: "library",
          index: MemoryIndex.CORPUS,
          mode: IngestMode.HYBRID,
          fileId: document.id,
          fileName: document.fileName,
          text: `Re-ingesting ${document.title}`, // TODO: Extract text from file
        }),
      });

      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.error || "Failed to re-ingest");
      }
      
      // Update document index to hybrid
      setDocument({ ...document, index: "hybrid" });
    } catch (err: any) {
      setError(err.message || "Failed to re-ingest");
    } finally {
      setReingesting(false);
    }
  }

  async function handleSendToJournal() {
    if (!document) return;
    
    setSendingToJournal(true);
    try {
      // Create a journal entry with document summary
      const res = await fetch("/api/journal/entries", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          mood: "neutral" as const,
          text: `Document summary: ${document.title}${document.author ? ` by ${document.author}` : ""}. Source: Library document.`,
          tags: ["library", "document_summary"],
        }),
      });

      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.error || "Failed to send to journal");
      }

      // Navigate to journal
      window.location.href = "/journal";
    } catch (err: any) {
      setError(err.message || "Failed to send to journal");
    } finally {
      setSendingToJournal(false);
    }
  }

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString([], {
      weekday: "long",
      year: "numeric",
      month: "long",
      day: "numeric",
    });
  };

  const getIndexBadgeColor = () => {
    if (!document) return "";
    if (document.index === "hybrid") return "bg-purple-500/20 text-purple-400 border-purple-500/40";
    if (document.index === MemoryIndex.CORPUS) return "bg-blue-500/20 text-blue-400 border-blue-500/40";
    if (document.index === MemoryIndex.PLAYBOOK) return "bg-orange-500/20 text-orange-400 border-orange-500/40";
    return "bg-white/5 text-white/40 border-white/10";
  };

  const getIndexLabel = () => {
    if (!document) return "";
    if (document.index === "hybrid") return "HYBRID";
    if (document.index === MemoryIndex.CORPUS) return "CORPUS";
    if (document.index === MemoryIndex.PLAYBOOK) return "PLAYBOOK";
    return "UNKNOWN";
  };

  if (loading) {
    return (
      <main className="px-6 pt-10 pb-32 bg-[#0A0A0A] min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="w-8 h-8 border-2 border-[#00FF7F]/30 border-t-[#00FF7F] rounded-full animate-spin mx-auto" />
          <p className="mt-4 text-sm text-white/50">Loading document...</p>
        </div>
      </main>
    );
  }

  if (error && !document) {
    return (
      <main className="px-6 pt-10 pb-32 bg-[#0A0A0A] min-h-screen flex items-center justify-center">
        <div className="rounded-2xl bg-red-500/10 border border-red-500/30 p-6 text-center max-w-md">
          <p className="text-sm text-red-400 font-medium mb-4">{error}</p>
          <Link
            href="/library"
            className="inline-block text-xs text-ultra-accent hover:text-ultra-accentHover"
          >
            ← Back to Library
          </Link>
        </div>
      </main>
    );
  }

  if (!document) {
    return (
      <main className="px-6 pt-10 pb-32 bg-[#0A0A0A] min-h-screen flex items-center justify-center">
        <div className="rounded-2xl bg-white/[0.08] backdrop-blur-xl border border-white/15 p-6 text-center max-w-md">
          <p className="text-sm text-white/50 mb-4">Document not found</p>
          <Link
            href="/library"
            className="inline-block text-xs text-ultra-accent hover:text-ultra-accentHover"
          >
            ← Back to Library
          </Link>
        </div>
      </main>
    );
  }

  const isImage = document.mimeType?.startsWith("image/");
  const isPDF = document.mimeType === "application/pdf";
  const isText = document.mimeType?.startsWith("text/");

  return (
    <main className="bg-[#0A0A0A] min-h-screen flex flex-col">
      {/* Hero Section */}
      <section className="px-4 sm:px-6 lg:px-8 pt-6 pb-10 lg:pb-12">
        <div className="relative min-h-[40vh] md:min-h-[50vh] rounded-[2rem] overflow-hidden -mx-4 sm:-mx-6 lg:-mx-8">
          <div
            className="absolute inset-0 bg-cover bg-center bg-no-repeat"
            style={{ backgroundImage: "url('/hero-journal.jpeg')" }}
          />
          <div className="absolute inset-0 bg-black/40" />
          <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/40 to-transparent" />
          
          <div className="relative h-full flex flex-col px-6 py-6">
            {/* Top bar */}
            <div className="flex items-center justify-between mb-auto">
              <Link
                href="/library"
                className="text-sm font-semibold text-white/90 tracking-tight hover:text-white transition-colors"
              >
                ← Back to Library
              </Link>
              <div className="absolute top-4 right-4">
                <SourceStatusBadge
                  provider="MEMORY"
                  status={document.status === "ready" ? "OK" : document.status === "processing" ? "OK" : "ERROR"}
                />
              </div>
            </div>

            {/* Content */}
            <div className="mt-auto">
              <div className="flex items-center gap-2 mb-2">
                <span
                  className={`text-[10px] px-2 py-1 rounded-full font-bold border ${getIndexBadgeColor()}`}
                >
                  {getIndexLabel()}
                </span>
              </div>
              <h1 className="text-2xl md:text-3xl font-bold text-white tracking-tight mb-1">
                {document.title}
              </h1>
              {document.author && (
                <p className="text-sm text-white/70 mb-1">by {document.author}</p>
              )}
              <p className="text-xs text-white/50">{formatDate(document.createdAt)}</p>
            </div>
          </div>
        </div>
      </section>

      {/* Content Section */}
      <section className="px-6 pb-32 flex flex-col gap-6 max-w-5xl mx-auto w-full">
        {/* Document Info & Actions */}
        <div className="rounded-[24px] bg-white/[0.08] backdrop-blur-xl border border-white/15 p-6 space-y-4">
          {/* Metadata */}
          <div className="flex items-center gap-3 flex-wrap text-xs text-white/50">
            {document.sizeBytes && (
              <>
                <span>{(document.sizeBytes / 1024).toFixed(0)} KB</span>
                <span>•</span>
              </>
            )}
            <span>{document.mimeType}</span>
            <span>•</span>
            <span>{formatDate(document.createdAt)}</span>
          </div>

          {error && (
            <div className="rounded-xl border border-red-500/40 bg-red-500/10 px-3 py-2 text-sm text-red-400">
              {error}
            </div>
          )}

          {/* Actions */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3 pt-4 border-t border-white/10">
            <button
              onClick={() => document.storageUrl && window.open(document.storageUrl, "_blank")}
              disabled={!document.storageUrl}
              className="px-4 py-2.5 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-sm text-white font-medium transition-colors disabled:opacity-50"
            >
              Open Document
            </button>
            <button
              onClick={handleReingestAsHybrid}
              disabled={reingesting || document.index === "hybrid"}
              className="px-4 py-2.5 rounded-xl bg-purple-500/20 hover:bg-purple-500/30 border border-purple-500/40 text-sm text-purple-400 font-medium transition-colors disabled:opacity-50"
            >
              {reingesting ? "Processing..." : "Re-ingest as Hybrid"}
            </button>
            <button
              onClick={handleSendToJournal}
              disabled={sendingToJournal}
              className="px-4 py-2.5 rounded-xl bg-ultra-accent/20 hover:bg-ultra-accent/30 border border-ultra-accent/40 text-sm text-ultra-accent font-medium transition-colors disabled:opacity-50"
            >
              {sendingToJournal ? "Sending..." : "Send Summary to Journal"}
            </button>
          </div>
        </div>

        {/* Document Viewer */}
        <div className="rounded-[24px] bg-white/[0.08] backdrop-blur-xl border border-white/15 overflow-hidden">
          {isImage && document.storageUrl && (
            <div className="p-4">
              <img
                src={document.storageUrl}
                alt={document.title}
                className="w-full h-auto rounded-xl"
              />
            </div>
          )}
          {isPDF && document.storageUrl && (
            <div className="w-full" style={{ height: "600px" }}>
              <iframe
                src={document.storageUrl}
                className="w-full h-full border-0"
                title={document.title}
              />
            </div>
          )}
          {isText && document.storageUrl && (
            <div className="p-4">
              <iframe
                src={document.storageUrl}
                className="w-full"
                style={{ height: "600px", border: "none" }}
                title={document.title}
              />
            </div>
          )}
          {!isImage && !isPDF && !isText && (
            <div className="p-8 text-center">
              <p className="text-sm text-white/50 mb-4">Unsupported file type</p>
              {document.storageUrl && (
                <a
                  href={document.storageUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-block rounded-xl px-4 py-2 text-xs font-bold bg-ultra-accent text-black hover:bg-ultra-accentHover transition-all"
                >
                  Download File
                </a>
              )}
            </div>
          )}
        </div>
      </section>
    </main>
  );
}
