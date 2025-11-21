"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname, useParams } from "next/navigation";
import { TabPage } from "../../../components/layout/TabPage";

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

export default function DocumentViewerPage() {
  const pathname = usePathname();
  const params = useParams();
  const now = new Date();
  const time = now.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  const [document, setDocument] = useState<Document | null>(null);
  const [loading, setLoading] = useState(true);
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);

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
      if (data.ok) {
        setDocument(data.document);
      } else {
        setError(data.error || "Failed to load document");
      }
    } catch (err: any) {
      setError(err.message || "Failed to load document");
    } finally {
      setLoading(false);
    }
  }


  async function handleDelete() {
    if (!document) return;
    if (!confirm(`Delete "${document.title || document.filename}"? This cannot be undone.`)) {
      return;
    }
    try {
      setDeleting(true);
      const res = await fetch(`/api/library/${document.id}`, {
        method: "DELETE",
      });
      const data = await res.json();
      if (data.ok) {
        window.location.href = "/library";
      } else {
        setError(data.error || "Failed to delete document");
      }
    } catch (err: any) {
      setError(err.message || "Failed to delete document");
    } finally {
      setDeleting(false);
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

  if (loading) {
    return (
      <TabPage>
        <div className="flex items-center justify-center min-h-[60vh]">
          <div className="text-center space-y-3">
            <div className="w-8 h-8 border-2 border-ultra-accent/30 border-t-ultra-accent rounded-full animate-spin mx-auto" />
            <p className="text-sm text-slate-400 font-medium">Loading document...</p>
          </div>
        </div>
      </TabPage>
    );
  }

  if (error && !document) {
    return (
      <TabPage>
        <div className="rounded-2xl bg-ultra-negative/10 border border-ultra-negative/30 p-6 text-center">
          <p className="text-sm text-ultra-negative font-medium">{error}</p>
          <Link
            href="/library"
            className="mt-4 inline-block text-xs text-ultra-accent hover:text-ultra-accentHover"
          >
            ← Back to Library
          </Link>
        </div>
      </TabPage>
    );
  }

  if (!document) {
    return (
      <TabPage>
        <div className="rounded-2xl bg-white/[0.03] backdrop-blur-2xl border border-white/10 p-6 text-center">
          <p className="text-sm text-slate-400">Document not found</p>
          <Link
            href="/library"
            className="mt-4 inline-block text-xs text-ultra-accent hover:text-ultra-accentHover"
          >
            ← Back to Library
          </Link>
        </div>
      </TabPage>
    );
  }

  const isImage = document.mime_type.startsWith("image/");
  const isPDF = document.mime_type === "application/pdf";
  const isText = document.mime_type.startsWith("text/");

  return (
    <TabPage>
      {/* Header */}
      <div className="relative h-48 rounded-[2rem] overflow-hidden group mb-5">
        <div
          className="absolute inset-0 bg-cover bg-center bg-no-repeat"
          style={{
            backgroundImage: "url('/hero-journal.jpeg')"
          }}
        />
        <div className="absolute inset-0 bg-black/30" />
        <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/30 to-black/20" />
        <div className="absolute inset-0 bg-gradient-to-br from-black/20 via-transparent to-black/30" />
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,_rgba(245,99,0,0.1),_transparent_70%)]" />
        <div className="relative h-full flex flex-col justify-between px-6 py-5">
          {/* Top bar */}
          <div className="flex items-center justify-between">
            <Link
              href="/library"
              className="text-sm font-semibold text-white/90 tracking-tight hover:text-white transition-colors"
            >
              ← Back
            </Link>
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
            <h1 className="text-2xl font-bold tracking-tight text-white truncate">
              {document.filename}
            </h1>
            <p className="text-sm text-white/70">{formatDate(document.created_at)}</p>
          </div>
        </div>
      </div>

      {/* Document Info */}
      <section className="mb-5">
        <div className="rounded-2xl bg-white/[0.03] backdrop-blur-2xl border border-white/10 p-4 space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="text-xs text-slate-400">{document.mime_type}</span>
              {document.size_bytes && (
                <>
                  <span className="text-xs text-slate-500">•</span>
                  <span className="text-xs text-slate-400">
                    {(document.size_bytes / 1024).toFixed(0)} KB
                  </span>
                </>
              )}
              <span className="text-xs text-slate-500">•</span>
              <span className="text-xs text-slate-400">{formatDate(document.created_at)}</span>
            </div>
          </div>

          {error && (
            <div className="rounded-xl border border-ultra-negative/40 bg-ultra-negative/10 px-3 py-2 text-[12px] text-ultra-negative">
              {error}
            </div>
          )}

          {/* Actions */}
          <div className="flex gap-2 pt-2 border-t border-white/5">
            <button
              onClick={handleDelete}
              disabled={deleting}
              className="w-full rounded-xl px-4 py-2.5 text-xs font-bold bg-ultra-negative/20 border border-ultra-negative/40 text-ultra-negative hover:bg-ultra-negative/30 transition-all active:scale-95 disabled:opacity-50"
            >
              {deleting ? "Deleting..." : "Delete"}
            </button>
          </div>
        </div>
      </section>

      {/* Document Viewer */}
      <section className="mb-5">
        <div className="rounded-2xl bg-white/[0.03] backdrop-blur-2xl border border-white/10 overflow-hidden">
          {isImage && document.storage_url && (
            <div className="p-4">
              <img
                src={document.storage_url}
                alt={document.title || document.filename}
                className="w-full h-auto rounded-xl"
              />
            </div>
          )}
          {isPDF && document.storage_url && (
            <div className="w-full" style={{ height: "600px" }}>
              <iframe
                src={document.storage_url}
                className="w-full h-full border-0"
                title={document.title || document.filename}
              />
            </div>
          )}
          {isText && document.storage_url && (
            <div className="p-4">
              <iframe
                src={document.storage_url}
                className="w-full"
                style={{ height: "600px", border: "none" }}
                title={document.title || document.filename}
              />
            </div>
          )}
          {!isImage && !isPDF && !isText && (
            <div className="p-8 text-center">
              <p className="text-sm text-slate-400 mb-4">Unsupported file type</p>
              {document.storage_url && (
                <a
                  href={document.storage_url}
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
    </TabPage>
  );
}

