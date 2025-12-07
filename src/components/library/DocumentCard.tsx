"use client";

import React from "react";
import Link from "next/link";
import SourceStatusBadge from "@/components/ui/SourceStatusBadge";
import type { LibraryDocument } from "@/lib/types/library";
import { MemoryIndex } from "@/lib/constants/memory";

type DocumentCardProps = {
  document: LibraryDocument;
};

export default function DocumentCard({ document }: DocumentCardProps) {
  const getIndexBadgeColor = () => {
    if (document.index === "hybrid") return "bg-purple-500/20 text-purple-400 border-purple-500/40";
    if (document.index === MemoryIndex.CORPUS) return "bg-blue-500/20 text-blue-400 border-blue-500/40";
    if (document.index === MemoryIndex.PLAYBOOK) return "bg-orange-500/20 text-orange-400 border-orange-500/40";
    return "bg-white/5 text-white/40 border-white/10";
  };

  const getIndexLabel = () => {
    if (document.index === "hybrid") return "HYBRID";
    if (document.index === MemoryIndex.CORPUS) return "CORPUS";
    if (document.index === MemoryIndex.PLAYBOOK) return "PLAYBOOK";
    return "UNKNOWN";
  };

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffDays = Math.ceil(diffMs / (1000 * 60 * 60 * 24));

    if (diffDays === 0) return "Today";
    if (diffDays === 1) return "Yesterday";
    if (diffDays < 7) return `${diffDays}d ago`;
    return date.toLocaleDateString([], { month: "short", day: "numeric" });
  };

  const getFileIcon = (mimeType?: string) => {
    if (!mimeType) return "📝";
    if (mimeType.startsWith("image/")) return "🖼️";
    if (mimeType === "application/pdf") return "📄";
    return "📝";
  };

  return (
    <Link
      href={`/library/${document.id}`}
      className="block rounded-xl bg-white/[0.08] backdrop-blur-xl border border-white/15 p-4 hover:bg-white/[0.12] hover:border-white/25 transition-all active:scale-[0.99]"
    >
      <div className="flex items-start gap-3">
        {/* File Icon */}
        <div className="w-11 h-11 rounded-lg bg-ultra-accent/20 border border-ultra-accent/30 flex items-center justify-center flex-shrink-0">
          <span className="text-lg">{getFileIcon(document.mimeType)}</span>
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-2 mb-1">
            <h3 className="text-sm font-bold text-white line-clamp-2 flex-1">
              {document.title}
            </h3>
            <SourceStatusBadge
              provider="MEMORY"
              status={
                document.status === "ready"
                  ? "OK"
                  : document.status === "processing"
                  ? "OK"
                  : "ERROR"
              }
            />
          </div>

          {document.author && (
            <p className="text-xs text-white/50 mb-2">by {document.author}</p>
          )}

          {/* Metadata row */}
          <div className="flex items-center gap-2 flex-wrap mb-2">
            {document.sizeBytes && (
              <>
                <span className="text-xs text-white/50">
                  {(document.sizeBytes / 1024).toFixed(0)} KB
                </span>
                <span className="text-xs text-white/30">•</span>
              </>
            )}
            <span className="text-xs text-white/50">{formatDate(document.createdAt)}</span>
          </div>

          {/* Index badge */}
          <div className="flex items-center gap-2 flex-wrap">
            <span
              className={`text-[10px] px-2 py-0.5 rounded-full font-bold border ${getIndexBadgeColor()}`}
            >
              {getIndexLabel()}
            </span>
          </div>
        </div>
      </div>
    </Link>
  );
}

