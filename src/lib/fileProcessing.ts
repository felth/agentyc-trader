/**
 * Shared file processing, embedding, and chunking logic
 * Used by both /api/ingest/upload and /api/ingest/process
 */

import OpenAI from "openai";
import { Pinecone } from "@pinecone-database/pinecone";
import { getSupabase } from "./supabaseServer";
import { ensureConceptAndTags } from "./lessonUtils";
import { normalizeSource } from "./agentSources";

/**
 * Extract text from PDF using OpenAI's File API
 * Serverless-compatible alternative to pdf-parse
 */
async function extractTextFromPdf(
  openai: OpenAI,
  supabase: ReturnType<typeof getSupabase>,
  storagePath: string,
  fileName: string
): Promise<string> {
  try {
    // Step 1: Download PDF from Supabase Storage
    const { data: pdfBlob, error: downloadError } = await supabase.storage
      .from("documents")
      .download(storagePath);

    if (downloadError || !pdfBlob) {
      throw new Error(`Failed to download PDF from storage: ${downloadError?.message || "Unknown error"}`);
    }

    // Step 2: Convert Blob to File-like object for OpenAI
    const arrayBuffer = await pdfBlob.arrayBuffer();
    const pdfBuffer = Buffer.from(arrayBuffer);

    // Create a File object for OpenAI API
    // OpenAI File API expects a File, Blob, or ReadStream
    const pdfFile = new File([pdfBuffer], fileName, { type: "application/pdf" });

    // Step 3: Upload to OpenAI File API
    const uploadedFile = await openai.files.create({
      file: pdfFile,
      purpose: "assistants",
    });

    // Step 4: Parse the file to extract text using OpenAI File API
    // Try files.parse() if available, otherwise use files.content() as fallback
    let fullRawText = "";
    
    try {
      // Try the parse API method (may not exist in all SDK versions)
      const parseJob = await (openai.files as any).parse({
        file_id: uploadedFile.id,
      });

      // Check if parse completed synchronously
      if (parseJob && parseJob.output_text) {
        fullRawText = parseJob.output_text;
      } else if (parseJob && ((parseJob as any).status === "processing" || (parseJob as any).status === "pending")) {
        // Poll for completion
        const maxAttempts = 60;
        let attempts = 0;

        while (attempts < maxAttempts && !fullRawText) {
          await new Promise((resolve) => setTimeout(resolve, 1000));

          try {
            const retrieved = await openai.files.retrieve(uploadedFile.id);
            if ((retrieved as any).output_text) {
              fullRawText = (retrieved as any).output_text;
              break;
            }
          } catch (e) {
            // Continue polling
          }

          attempts++;
        }

        if (!fullRawText && attempts >= maxAttempts) {
          throw new Error("PDF parsing timed out after 60 seconds");
        }
      } else {
        // Parse method returned unexpected result, try content API
        throw new Error("Parse method returned unexpected format");
      }
    } catch (parseError: any) {
      // Fallback: If parse() doesn't exist or fails, use content API
      // Note: content() might not extract text from PDFs directly
      // This is a fallback that may need adjustment based on actual OpenAI API capabilities
      console.log("[extractTextFromPdf] Parse method not available or failed, trying content API:", parseError?.message);
      
      try {
        // For PDFs, OpenAI may need to process them via Assistants API
        // For now, we'll try to get content and see what happens
        const fileContent = await openai.files.content(uploadedFile.id);
        if (fileContent instanceof Response) {
          fullRawText = await fileContent.text();
        } else if (typeof fileContent === "string") {
          fullRawText = fileContent;
        } else {
          throw new Error("Content API did not return text content");
        }
      } catch (contentError: any) {
        // If content() also fails, we need to use a different approach
        // This might require using Assistants API or Batch API
        throw new Error(`Failed to extract text from PDF: ${contentError?.message || parseError?.message || "Unknown error"}`);
      }
    }

    // Clean up: Delete the uploaded file from OpenAI (optional)
    try {
      await openai.files.delete(uploadedFile.id);
    } catch (cleanupError) {
      console.warn("[extractTextFromPdf] Failed to delete OpenAI file:", cleanupError);
      // Non-fatal - continue
    }

    if (!fullRawText || !fullRawText.trim()) {
      throw new Error("PDF parsed but no text content extracted");
    }

    return fullRawText;
  } catch (error: any) {
    console.error("[extractTextFromPdf] Error:", {
      message: error?.message || String(error),
      code: error?.code,
      stack: error?.stack?.substring(0, 500),
    });
    throw error;
  }
}

export type FileType = "image" | "pdf" | "text" | "unsupported";

export interface ProcessFileParams {
  buffer: Buffer;
  fileName: string;
  fileType: string;
  fileSize: number;
  fileTypeDetected: FileType;
  source: string;
  manualNotes?: string;
  tags?: string[];
  lessonId: string;
  storagePath: string;
  storageUrl?: string;
  userId: string;
  documentId?: string | null;
}

export interface ProcessFileResult {
  ok: boolean;
  error?: string;
  lessonId?: string;
  concept?: string;
  notes?: string;
  tags?: string[];
  fileType?: string;
  category?: string;
  pineconeVectorId?: string;
  documentId?: string | null;
}

/**
 * Process file content: extract text, generate embeddings, chunk for corpus
 */
export async function processFileContent(params: ProcessFileParams): Promise<ProcessFileResult> {
  const {
    buffer,
    fileName,
    fileType,
    fileSize,
    fileTypeDetected,
    source,
    manualNotes = "",
    tags: inputTags = [],
    lessonId,
    storagePath,
    storageUrl,
    userId,
    documentId: existingDocumentId,
  } = params;

  const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY! });
  const supabase = getSupabase();
  const normalizedSource = normalizeSource(source);

  // Initialize Pinecone indices
  const pc = new Pinecone({ apiKey: process.env.PINECONE_API_KEY! });
  const playbookIndex = pc.index(
    process.env.PINECONE_INDEX!,
    process.env.PINECONE_HOST!
  );
  const corpusIndex = pc.index(
    process.env.PINECONE_CORPUS_INDEX!,
    process.env.PINECONE_HOST!
  );

  let concept = "";
  let notes = "";
  let extractedTags: string[] = [];
  let fullRawText = ""; // For deep chunking (PDF/text only)

  // Extract content based on file type
  if (fileTypeDetected === "image") {
    const base64 = buffer.toString("base64");
    const dataUrl = `data:${fileType};base64,${base64}`;

    const systemPrompt = [
      "You are a trading lesson extractor.",
      "You look at trading screenshots, charts, and notes.",
      "You return STRICT JSON only with keys: concept (string), notes (string), tags (string[]).",
      "No prose, no markdown, only JSON.",
    ].join(" ");

    const userContent = [
      { type: "text", text: "Extract the main trading lesson from this image." },
      { type: "image_url", image_url: { url: dataUrl } },
    ] as const;

    const chat = await openai.chat.completions.create({
      model: process.env.OPENAI_VISION_MODEL || "gpt-4o-mini",
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userContent as any },
      ],
      temperature: 0.1,
    });

    const rawContent = chat.choices[0]?.message?.content;
    let textContent: string;

    if (typeof rawContent === "string") {
      textContent = rawContent;
    } else if (Array.isArray(rawContent)) {
      textContent = (rawContent as any[])
        .map((part) => (typeof part === "string" ? part : (part as any).text || ""))
        .join("\n");
    } else {
      textContent = JSON.stringify(rawContent ?? "");
    }

    const jsonMatch = textContent.match(/\{[\s\S]*\}/);
    const jsonString = jsonMatch ? jsonMatch[0] : textContent;

    let notesFromImage = "";

    try {
      const parsed = JSON.parse(jsonString) as {
        concept?: string;
        notes?: string;
        summary?: string;
        tags?: string[];
      };

      concept = (parsed.concept ?? "").trim();
      notesFromImage = (parsed.notes ?? parsed.summary ?? "").trim();

      if (Array.isArray(parsed.tags)) {
        extractedTags = parsed.tags.map((t) => String(t));
      }
    } catch {
      concept = "Lesson from image";
      notesFromImage = textContent.trim();
    }

    notes = [notesFromImage, manualNotes].filter(Boolean).join("\n\n");
  } else if (fileTypeDetected === "pdf") {
    // Use OpenAI File API for PDF text extraction (serverless-compatible)
    let fullRawText = "";
    try {
      console.log("[fileProcessing] Extracting text from PDF using OpenAI File API:", storagePath);
      fullRawText = await extractTextFromPdf(openai, supabase, storagePath, fileName);
      
      if (!fullRawText || !fullRawText.trim()) {
        throw new Error("PDF parsed but no text content extracted");
      }
      
      console.log(`[fileProcessing] Successfully extracted ${fullRawText.length} characters from PDF`);
    } catch (extractError: any) {
      console.error("[fileProcessing] Failed to extract text from PDF:", {
        error: extractError?.message || extractError,
        code: extractError?.code,
        stack: extractError?.stack?.substring(0, 500),
      });
      return {
        ok: false,
        error: `PDF text extraction failed: ${extractError?.message || "Unknown error"}. This may indicate an incompatible PDF file or OpenAI API issue.`,
      };
    }
    
    // Store full raw text for deep chunking (before summarization)
    // fullRawText now contains the COMPLETE extracted text (all pages)
    // This is used for corpus chunking, not truncated
    
    // For summarization, use first 16k chars (token limit)
    const rawText = fullRawText.slice(0, 16000);

    const pdfSystem = [
      "You summarise PDF documents into concise trading lessons.",
      'Return STRICT JSON only: { "concept": string, "notes": string, "tags": string[] }.',
    ].join(" ");

    const pdfChat = await openai.chat.completions.create({
      model: process.env.OPENAI_VISION_MODEL || "gpt-4o-mini",
      messages: [
        { role: "system", content: pdfSystem },
        {
          role: "user",
          content: `Turn this document into one main trading lesson.\nReturn JSON only.\n\nDocument:\n${rawText}`,
        },
      ],
      temperature: 0.2,
    });

    const raw = pdfChat.choices[0]?.message?.content || "{}";
    let parsedSummary: any = {};

    try {
      const jsonMatch = raw.match(/\{[\s\S]*\}/);
      const jsonString = jsonMatch ? jsonMatch[0] : raw;
      parsedSummary = JSON.parse(jsonString);
    } catch {
      parsedSummary = {};
    }

    concept = (parsedSummary.concept ?? "PDF Lesson").toString();
    const pdfNotes = (parsedSummary.notes ?? "").toString();

    if (Array.isArray(parsedSummary.tags)) {
      extractedTags = parsedSummary.tags.map((t: any) => String(t));
    }

    notes = [pdfNotes, manualNotes].filter(Boolean).join("\n\n");
  } else if (fileTypeDetected === "text") {
    const text = buffer.toString("utf8");
    concept = text.trim().slice(0, 80) || "Uploaded Note";
    const notesFromText = text.trim();

    // Store full raw text for deep chunking
    fullRawText = notesFromText;
    notes = [notesFromText, manualNotes].filter(Boolean).join("\n\n");
    extractedTags = [];
  } else {
    return {
      ok: false,
      error: "Unsupported file type",
    };
  }

  // Ensure we have notes before proceeding
  if (!notes || !notes.trim()) {
    return {
      ok: false,
      error: "No usable text extracted from file",
    };
  }

  // Combine extracted tags with manual tags
  const allTagsInput = [...extractedTags, ...inputTags];

  // Auto-generate concept/tags if missing
  const ensured = await ensureConceptAndTags({
    openai,
    notes: notes.trim(),
    concept,
    tags: allTagsInput,
  });

  concept = ensured.concept;
  const allTags = ensured.tags;

  // Create playbook embedding (distilled summary)
  const embedContent = [concept, notes].filter(Boolean).join("\n");
  const embedding = await openai.embeddings.create({
    model: "text-embedding-3-large",
    input: embedContent,
  });

  const values = embedding.data[0]?.embedding ?? [];

  if (!values.length) {
    return {
      ok: false,
      error: "Embedding returned empty vector",
    };
  }

  const vectorId = `${lessonId}-${Date.now()}`;

  // Determine category: "playbook" if source is "playbook", else "corpus"
  const category = normalizedSource === "playbook" ? "playbook" : "corpus";

  // Create or update document record
  let documentId = existingDocumentId;
  if (!documentId) {
    try {
      const { data: docData, error: docError } = await supabase
        .from("documents")
        .insert({
          user_id: userId,
          title: concept || fileName,
          filename: fileName,
          category,
          mime_type: fileType,
          storage_path: storagePath,
          size_bytes: fileSize,
          lesson_id: lessonId,
          embedded: false, // Will update to true after embedding succeeds
        })
        .select("id")
        .single();

      if (docError) {
        console.error("Supabase documents insert error:", docError);
      } else {
        documentId = docData?.id || null;
      }
    } catch (docErr) {
      console.error("Document insert error:", docErr);
    }
  }

  // Upsert into playbook index
  await playbookIndex.upsert([
    {
      id: vectorId,
      values,
      metadata: {
        lesson_id: lessonId,
        concept,
        notes,
        source: normalizedSource,
        tags: allTags,
        image_url: fileTypeDetected === "image" ? storageUrl || "" : "",
      },
    },
  ]);

  // Update documents table to mark as embedded
  if (documentId) {
    try {
      await supabase.from("documents").update({ embedded: true }).eq("id", documentId);
    } catch (updateErr) {
      console.error("Failed to update embedded flag:", updateErr);
    }
  }

  // Also insert into lessons table (existing behavior)
  try {
    await supabase.from("lessons").insert({
      lesson_id: lessonId,
      concept,
      notes,
      summary: concept,
      tags: allTags,
      image_url: fileTypeDetected === "image" ? storageUrl || "" : "",
      source: normalizedSource,
    });
  } catch (sbError) {
    console.error("Supabase lessons insert error:", sbError);
  }

  // Deep chunking for PDFs and text (corpus index)
  if ((fileTypeDetected === "pdf" || fileTypeDetected === "text") && fullRawText.trim()) {
    const chunks = chunkText(fullRawText);

    if (chunks.length > 0) {
      // Create embeddings in batch for all chunks
      const embeddingResponses = await Promise.all(
        chunks.map((chunk) =>
          openai.embeddings.create({
            model: "text-embedding-3-large",
            input: chunk,
          })
        )
      );

      // Upsert into the corpus index
      await corpusIndex.upsert(
        embeddingResponses.map((res, i) => ({
          id: `${lessonId}-chunk-${i}`,
          values: res.data[0].embedding,
          metadata: {
            source: normalizedSource,
            book_title: fileName || "",
            chunk_index: i,
            content: chunks[i],
          },
        }))
      );

      // Mirror into Supabase document_chunks
      const chunkRows = chunks.map((chunk, i) => ({
        source: normalizedSource,
        book_title: fileName || null,
        chunk_index: i,
        content: chunk,
        metadata: {},
      }));

      const { error: chunkError } = await supabase.from("document_chunks").insert(chunkRows);

      if (chunkError) {
        console.error("Supabase insert error (document_chunks):", chunkError);
      }
    }
  }

  return {
    ok: true,
    lessonId,
    concept,
    notes,
    tags: allTags,
    fileType: fileTypeDetected,
    category,
    pineconeVectorId: vectorId,
    documentId,
  };
}

/**
 * Detect file type from mime type and filename
 */
export function detectFileType(mime: string, name: string): FileType {
  if (mime.startsWith("image/")) return "image";
  if (mime === "application/pdf") return "pdf";
  if (mime.startsWith("text/")) return "text";

  const ext = name.split(".").pop()?.toLowerCase();
  if (ext && ["txt", "md"].includes(ext)) return "text";

  return "unsupported";
}

/**
 * Chunk text into overlapping segments for deep corpus indexing
 */
function chunkText(input: string, chunkSize = 1200, overlap = 200): string[] {
  const words = input.split(/\s+/);
  const chunks: string[] = [];
  let start = 0;

  while (start < words.length) {
    const end = start + chunkSize;
    const slice = words.slice(start, end).join(" ").trim();

    if (slice.length > 0) {
      chunks.push(slice);
    }

    start = end - overlap;
    if (start < 0) start = 0;
  }

  return chunks;
}

