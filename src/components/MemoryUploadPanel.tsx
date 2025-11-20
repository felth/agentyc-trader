"use client";

import React, { useState } from "react";

type UploadState = "idle" | "uploading" | "success" | "error";

export function MemoryUploadPanel() {

  const [file, setFile] = useState<File | null>(null);

  const [manualNotes, setManualNotes] = useState("");

  const [status, setStatus] = useState<UploadState>("idle");

  const [message, setMessage] = useState<string>("");

  const onFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {

    const f = e.target.files?.[0] ?? null;

    setFile(f);

    setStatus("idle");

    setMessage("");

  };

  const onSubmit = async (e: React.FormEvent) => {

    e.preventDefault();

    if (!file) {

      setStatus("error");

      setMessage("Please choose a file first.");

      return;

    }

    // Validate file size client-side (50MB limit)
    if (file.size > 50 * 1024 * 1024) {
      setStatus("error");
      setMessage("File size exceeds 50MB limit.");
      return;
    }

    // Log upload attempt for debugging
    console.log("[MemoryUploadPanel] Starting upload:", {
      fileName: file.name,
      fileSize: file.size,
      fileType: file.type,
      hasNotes: !!manualNotes.trim(),
    });

    try {

      setStatus("uploading");

      setMessage("");

      // Check if file is > 4MB - use signed URL flow for large files
      const useSignedUrl = file.size > 4 * 1024 * 1024;

      if (useSignedUrl) {
        console.log("[MemoryUploadPanel] File > 4MB, using signed URL upload flow");

        // Step 1: Get signed upload URL
        const urlRes = await fetch("/api/ingest/upload-url", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            filename: file.name,
            contentType: file.type,
            fileSize: file.size,
            source: "playbook",
          }),
        });

        const urlData = await urlRes.json();

        if (!urlData.ok || !urlData.uploadUrl) {
          console.error("[MemoryUploadPanel] Failed to get signed URL:", urlData);
          setStatus("error");
          setMessage(urlData.error || "Failed to get upload URL");
          return;
        }

        console.log("[MemoryUploadPanel] Got signed URL, uploading directly to Supabase Storage");

        // Step 2: Upload directly to Supabase Storage using signed URL
        // The signed URL from Supabase includes the token in the URL, so we PUT the file directly
        const uploadRes = await fetch(urlData.uploadUrl, {
          method: "PUT",
          headers: {
            "Content-Type": file.type,
          },
          body: file,
        });

        if (!uploadRes.ok) {
          const uploadErrorText = await uploadRes.text();
          console.error("[MemoryUploadPanel] Direct upload failed:", uploadRes.status, uploadErrorText);
          setStatus("error");
          setMessage(`Upload failed: ${uploadRes.status} ${uploadRes.statusText}`);
          return;
        }

        console.log("[MemoryUploadPanel] Direct upload successful, processing file");

        // Step 3: Process the uploaded file
        const processRes = await fetch("/api/ingest/process", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            storagePath: urlData.path,
            fileName: file.name,
            fileType: file.type,
            fileSize: file.size,
            source: "playbook",
            manualNotes: manualNotes.trim() || undefined,
            tags: [],
            lessonId: urlData.lessonId, // Use lessonId from upload-url response if available
          }),
        });

        const processData = await processRes.json();

        if (!processRes.ok || !processData.ok) {
          console.error("[MemoryUploadPanel] Processing failed:", processData);
          setStatus("error");
          setMessage(processData.error || "File uploaded but processing failed");
          return;
        }

        // Success!
        setStatus("success");
        setMessage("Uploaded and added to Playbook.");
        setFile(null);
        setManualNotes("");
        const fileInput = document.getElementById("memory-upload-file") as HTMLInputElement;
        if (fileInput) fileInput.value = "";
        return;
      }

      // Standard upload flow for files < 4MB
      const formData = new FormData();

      formData.append("file", file);

      formData.append("source", "playbook");

      if (manualNotes.trim()) formData.append("manual_notes", manualNotes.trim());

      console.log("[MemoryUploadPanel] Sending request to /api/ingest/upload");

      const res = await fetch("/api/ingest/upload", {

        method: "POST",

        body: formData

      });

      console.log("[MemoryUploadPanel] Response status:", res.status, res.statusText);
      console.log("[MemoryUploadPanel] Response Content-Type:", res.headers.get("content-type"));

      // Check if response is JSON before parsing
      const contentType = res.headers.get("content-type") || "";
      let json: any;
      
      if (contentType.includes("application/json")) {
        try {
          json = await res.json();
          console.log("[MemoryUploadPanel] Response data (JSON):", json);
        } catch (jsonErr) {
          console.error("[MemoryUploadPanel] Failed to parse JSON response:", jsonErr);
          // Fallback: try to get text response
          const text = await res.text();
          console.error("[MemoryUploadPanel] Response text (non-JSON):", text);
          setStatus("error");
          setMessage(`Server error: ${text || "Invalid response format"}`);
          return;
        }
      } else {
        // Non-JSON response (likely an error)
        const text = await res.text();
        console.error("[MemoryUploadPanel] Non-JSON response:", text);
        setStatus("error");
        setMessage(text || `Server error (${res.status}): ${res.statusText}`);
        return;
      }

      if (!res.ok || !json.ok) {

        // Check if server recommends using signed URL flow
        if (json.useSignedUrl || res.status === 413) {
          console.log("[MemoryUploadPanel] Server recommends signed URL flow, retrying...");
          // Recursively call with signed URL flow (will be handled above)
          // For now, show error and suggest retry
          setStatus("error");
          setMessage("File too large. Please try again - using large file upload.");
          return;
        }

        const errorMsg = json.error || json.message || "Upload failed";
        
        console.error("[MemoryUploadPanel] Upload failed:", {
          status: res.status,
          error: errorMsg,
          fullResponse: json,
        });

        setStatus("error");

        setMessage(errorMsg);

        return;

      }

      // Show success with warning if storage failed
      if (json.storageWarning) {

        setStatus("success");

        setMessage(`Uploaded and embedded. Note: ${json.storageWarning}`);

      } else {

        setStatus("success");

        setMessage("Uploaded and added to Playbook.");

      }

      setFile(null);

      setManualNotes("");

      // Reset file input
      const fileInput = document.getElementById("memory-upload-file") as HTMLInputElement;

      if (fileInput) fileInput.value = "";

    } catch (err: unknown) {

      console.error("[MemoryUploadPanel] Upload error (catch block):", err);
      
      // Handle JSON parsing errors specifically
      if (err instanceof SyntaxError && err.message.includes("JSON")) {
        setStatus("error");
        setMessage("Server returned invalid response. Please check server logs.");
        return;
      }

      const msg = err instanceof Error ? err.message : "Network error";

      setStatus("error");

      setMessage(msg);

    }

  };

  return (

    <section className="rounded-2xl bg-white/[0.03] backdrop-blur-2xl border border-white/10 p-4 space-y-3 shadow-[0_8px_32px_rgba(0,0,0,0.4)]">

      <div className="flex items-center gap-2">
        <span className="text-base">📁</span>
        <h3 className="text-sm font-semibold text-white">Upload File (Playbook)</h3>
      </div>

      <p className="text-xs text-gray-400 mb-2">
        Upload screenshots, PDFs, or notes. The app will extract the lesson, auto-generate a title and tags, and add it to your Playbook.
      </p>

      <form onSubmit={onSubmit} className="space-y-3">

        <div className="space-y-1">

          <input

            id="memory-upload-file"

            type="file"

            accept=".pdf,image/*,.txt,.md"

            onChange={onFileChange}

            onFocus={(e) => {

              // Prevent scroll when file input gets focused

              const prevScrollY = window.scrollY;

              setTimeout(() => {

                window.scrollTo({ top: prevScrollY, left: 0, behavior: "instant" });

              }, 0);

            }}

            className="block w-full text-xs text-gray-200 file:mr-2 file:rounded-full file:border-0 file:bg-ultra-cardAlt file:px-3 file:py-1 file:text-xs file:text-gray-100 hover:file:bg-ultra-border"

          />

          <p className="text-[10px] text-gray-500">

            Max 50MB • PDFs, screenshots, or text files

          </p>

        </div>

        <textarea

          value={manualNotes}

          onChange={(e) => setManualNotes(e.target.value)}

          onFocus={(e) => {

            // Prevent scroll when textarea gets focused

            const prevScrollY = window.scrollY;

            setTimeout(() => {

              window.scrollTo({ top: prevScrollY, left: 0, behavior: "instant" });

            }, 0);

          }}

          rows={2}

          className="w-full px-3 py-2 rounded-xl bg-black/40 backdrop-blur-sm border border-white/10 text-sm text-white placeholder:text-slate-500 focus:outline-none focus:border-ultra-accent/80 transition-colors resize-none"

          placeholder="Extra notes (optional)…"

        />

        <button

          type="submit"

          disabled={status === "uploading" || !file}

          className="w-full rounded-full bg-ultra-accent px-4 py-2 text-xs font-bold text-black disabled:opacity-60 disabled:cursor-not-allowed hover:bg-ultra-accentHover shadow-[0_0_16px_rgba(245,99,0,0.5)] active:scale-95 transition-all"

        >

          {status === "uploading" ? "Uploading…" : "Upload"}

        </button>

        {status === "success" && (

          <p className="text-xs text-ultra-positive">✓ {message}</p>

        )}

        {status === "error" && (

          <p className="text-xs text-ultra-negative">✗ {message}</p>

        )}

      </form>

    </section>

  );

}

