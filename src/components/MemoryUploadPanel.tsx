"use client";

import React, { useState } from "react";

type UploadState = "idle" | "uploading" | "success" | "error";

export function MemoryUploadPanel() {

  const [file, setFile] = useState<File | null>(null);

  const [source, setSource] = useState<string>("playbook");

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

    const formData = new FormData();

    formData.append("file", file);

    formData.append("source", source);

    if (manualNotes.trim()) formData.append("manual_notes", manualNotes.trim());

    try {

      setStatus("uploading");

      setMessage("");

      const res = await fetch("/api/ingest/upload", {

        method: "POST",

        body: formData

      });

      const json = await res.json();

      if (!res.ok || !json.ok) {

        setStatus("error");

        setMessage(json.error || "Upload failed");

        return;

      }

      setStatus("success");

      setMessage(`Saved lesson: ${json.concept || json.lesson_id}`);

      setFile(null);

      setManualNotes("");

      // Reset file input
      const fileInput = document.getElementById("memory-upload-file") as HTMLInputElement;

      if (fileInput) fileInput.value = "";

    } catch (err: unknown) {

      const msg = err instanceof Error ? err.message : "Network error";

      setStatus("error");

      setMessage(msg);

    }

  };

  return (

    <section className="rounded-[24px] border border-ultra-border bg-ultra-card/80 p-4 backdrop-blur">

      <h2 className="text-sm font-semibold text-ultra-accent mb-1">

        Memory Upload

      </h2>

      <p className="text-xs text-gray-400 mb-3">

        Upload PDFs, images, or notes to teach your trading agent. Everything is embedded into your private memory core.

      </p>

      <form onSubmit={onSubmit} className="space-y-3">

        <div className="space-y-1">

          <label className="text-xs text-gray-300">File</label>

          <input

            id="memory-upload-file"

            type="file"

            accept=".pdf,image/*,.txt,.md"

            onChange={onFileChange}

            className="block w-full text-xs text-gray-200 file:mr-2 file:rounded-full file:border-0 file:bg-ultra-cardAlt file:px-3 file:py-1 file:text-xs file:text-gray-100 hover:file:bg-ultra-border"

          />

          <p className="text-[10px] text-gray-500">

            Max 5MB. PDFs, screenshots, or text files are supported.

          </p>

        </div>

        <div className="flex gap-2 items-center">

          <label className="text-xs text-gray-300">Source</label>

          <select

            value={source}

            onChange={(e) => setSource(e.target.value)}

            className="flex-1 rounded-full bg-ultra-cardAlt border border-ultra-border px-3 py-1 text-xs text-gray-100"

          >

            <option value="playbook">Playbook</option>

            <option value="journal">Journal</option>

            <option value="book">Book</option>

            <option value="pdf">PDF</option>

            <option value="manual">Manual</option>

          </select>

        </div>

        <div className="space-y-1">

          <label className="text-xs text-gray-300">Manual notes (optional)</label>

          <textarea

            value={manualNotes}

            onChange={(e) => setManualNotes(e.target.value)}

            rows={3}

            className="w-full rounded-2xl bg-ultra-cardAlt border border-ultra-border px-3 py-2 text-xs text-gray-100 resize-none"

            placeholder="Add any context you want the agent to remember with this file…"

          />

        </div>

        <button

          type="submit"

          disabled={status === "uploading"}

          className="w-full rounded-full bg-ultra-accent px-4 py-2 text-xs font-semibold text-black disabled:opacity-60 disabled:cursor-not-allowed active:bg-ultra-accentPressed"

        >

          {status === "uploading" ? "Uploading…" : "Upload to Memory"}

        </button>

        {status !== "idle" && (

          <p

            className={

              "text-[11px] mt-1 " +

              (status === "success"

                ? "text-ultra-positive"

                : status === "error"

                ? "text-ultra-negative"

                : "text-gray-400")

            }

          >

            {message}

          </p>

        )}

      </form>

    </section>

  );

}

