import { NextRequest, NextResponse } from "next/server";

import OpenAI from "openai";

import { Pinecone } from "@pinecone-database/pinecone";

import { getSupabase } from "@/lib/supabaseServer";

import { normalizeSource } from "@/lib/agentSources";

import { ensureConceptAndTags } from "@/lib/lessonUtils";



export const runtime = "nodejs";



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



function detectFileType(mime: string, name: string): "image" | "pdf" | "text" | "unsupported" {

  if (mime.startsWith("image/")) return "image";

  if (mime === "application/pdf") return "pdf";

  if (mime.startsWith("text/")) return "text";

  const ext = name.split(".").pop()?.toLowerCase();

  if (ext && ["txt", "md"].includes(ext)) return "text";

  return "unsupported";

}



export async function POST(req: NextRequest) {

  try {

    console.log("[API:ingest/upload] Received upload request");

    const form = await req.formData();

    const file = form.get("file") as File | null;

    if (!file) {

      console.error("[API:ingest/upload] No file in request");

      return NextResponse.json(

        { ok: false, error: "file missing" },

        { status: 400 }

      );

    }

    console.log("[API:ingest/upload] File details:", {

      name: file.name,

      size: file.size,

      type: file.type,

    });

    // 50MB limit for books and large documents
    if (file.size > 50 * 1024 * 1024) {

      console.error("[API:ingest/upload] File too large:", file.size);

      return NextResponse.json(

        { ok: false, error: "File too large (>50MB)" },

        { status: 400 }

      );

    }

    const source = form.get("source") as string;

    const normalizedSource = normalizeSource(source);

    const lessonId = (form.get("lesson_id") as string)?.trim() || crypto.randomUUID();

    const manualNotes = (form.get("manual_notes") as string)?.trim() || "";

    const tagsInput = (form.get("tags") as string)?.trim() || "";

    const tags = tagsInput

      .split(",")

      .map((t) => t.trim())

      .filter(Boolean);

    console.log("[API:ingest/upload] Form data:", {

      source,

      normalizedSource,

      lessonId,

      hasManualNotes: !!manualNotes,

      tagsCount: tags.length,

    });



    const arrayBuffer = await file.arrayBuffer();

    const buffer = Buffer.from(arrayBuffer);

    const fileType = detectFileType(file.type, file.name);



    const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY! });

    const pc = new Pinecone({ apiKey: process.env.PINECONE_API_KEY! });

    // Existing playbook index (distilled lessons)

    const playbookIndex = pc.index(

      process.env.PINECONE_INDEX!,

      process.env.PINECONE_HOST!

    );

    // NEW corpus index (long-form chunks)

    const corpusIndex = pc.index(

      process.env.PINECONE_CORPUS_INDEX!,

      process.env.PINECONE_HOST!

    );

    const supabase = getSupabase();

    // Store file in Supabase Storage
    // CRITICAL: Supabase Storage path validation is strict
    // Pattern: each segment must be: alphanumeric, dash, dot, or specific special chars
    // NOT allowed: underscore _ in paths
    // Path MUST have folder structure: folder/file.ext (cannot be just file.ext)
    
    // Extract just the filename without path, then sanitize
    const baseFilename = file.name.split("/").pop() || file.name.split("\\").pop() || "file";
    const fileExtension = baseFilename.includes(".") ? baseFilename.substring(baseFilename.lastIndexOf(".")) : "";
    const filenameWithoutExt = baseFilename.replace(/\.[^/.]+$/, "") || "file";
    
    // CRITICAL: Supabase Storage does NOT allow underscores _ anywhere in the path
    // Sanitize to ONLY: alphanumeric, dots, dashes (NO underscores at all!)
    // Replace ALL invalid chars (including underscores) with dashes immediately
    const sanitizedBase = filenameWithoutExt
      .replace(/[^a-zA-Z0-9.-]/g, "-") // Replace ALL invalid chars (including _) with DASH
      .replace(/_/g, "-") // Explicitly replace any underscores that might remain
      .replace(/-{2,}/g, "-") // Replace multiple dashes with single dash
      .replace(/^-+|-$/g, "") // Remove leading/trailing dashes
      .substring(0, 200); // Limit length
    
    // Ensure filename extension also has no underscores
    const safeExtension = fileExtension.replace(/_/g, "-");
    const sanitizedFilename = sanitizedBase + safeExtension;
    
    // Storage folder: MUST have NO underscores
    const storageFolder = "default-user"; // Use dash, NEVER underscore
    const userId = "00000000-0000-0000-0000-000000000000"; // Valid UUID for database
    
    // Generate shortId: remove ALL dashes and underscores, use only alphanumeric
    const uniqueId = crypto.randomUUID().replace(/[-_]/g, "");
    const timestamp = Date.now();
    const shortId = uniqueId.substring(0, 8); // Pure alphanumeric (no dashes, no underscores)
    
    // Path format: folder/timestamp-shortId-filename.pdf
    // CRITICAL: NO underscores ANYWHERE in the path
    let storagePath = `${storageFolder}/${timestamp}-${shortId}-${sanitizedFilename}`;
    
    // Ensure no double slashes or leading/trailing slashes
    storagePath = storagePath.replace(/\/+/g, "/").replace(/^\//, "").replace(/\/$/, "");
    
    // FINAL SAFETY: Replace EVERY underscore in the ENTIRE path (aggressive check)
    // This is the last line of defense - if there's ANY underscore, kill it
    storagePath = storagePath.replace(/_/g, "-");
    
    // Verify path contains NO underscores (sanity check)
    if (storagePath.includes("_")) {
      console.error("[API:ingest/upload] FATAL: Path still contains underscore after all replacements:", storagePath);
      // Force absolute clean path
      storagePath = `default-user/${timestamp}-${shortId}.pdf`;
      storagePath = storagePath.replace(/_/g, "-"); // One more time
    }
    
    // Final validation: ensure path is valid format (folder/file.ext structure required)
    // Check that path has at least one folder segment
    if (!storagePath.includes("/")) {
      console.error("[API:ingest/upload] Path missing folder structure:", storagePath);
      // Add folder if missing
      const safeExt = (fileExtension || "bin").replace(/_/g, "-");
      storagePath = `default-user/${timestamp}-${shortId}.${safeExt}`;
    }
    
    // Final validation: ensure no underscores and basic safety
    if (storagePath.includes("_") || !/^[a-zA-Z0-9\/.\-]+$/.test(storagePath.replace(/\//g, ""))) {
      console.error("[API:ingest/upload] Path contains invalid characters:", storagePath);
      // Force clean path
      const safeExt = (fileExtension || "bin").replace(/_/g, "-");
      storagePath = `default-user/${timestamp}-${shortId}.${safeExt}`;
    }
    
    console.log("[API:ingest/upload] Original filename:", file.name);
    console.log("[API:ingest/upload] Sanitized filename:", sanitizedFilename);
    console.log("[API:ingest/upload] Storage folder:", storageFolder);
    console.log("[API:ingest/upload] Database user_id:", userId);
    console.log("[API:ingest/upload] Final storage path:", storagePath);
    console.log("[API:ingest/upload] Path has folder:", storagePath.includes("/"));
    console.log("[API:ingest/upload] Path contains underscore:", storagePath.includes("_"));
    console.log("[API:ingest/upload] Path segments:", storagePath.split("/"));
    
    let storageUrl = "";
    let documentId: string | null = null;

    try {
      // Note: We now test minimal path on error, not upfront
      
      // DEBUG: Test path format with getPublicUrl (per Grok recommendation)
      // This helps validate the path format before upload
      try {
        const testUrl = supabase.storage.from("documents").getPublicUrl(storagePath);
        console.log("[API:ingest/upload] Path validation via getPublicUrl:", testUrl.data?.publicUrl);
        console.log("[API:ingest/upload] Path has underscores:", storagePath.includes("_"));
        console.log("[API:ingest/upload] Path matches pattern:", /^[a-zA-Z0-9!-.*'()]+(\/[a-zA-Z0-9!-.*'()]+)*$/.test(storagePath));
      } catch (urlErr) {
        console.error("[API:ingest/upload] getPublicUrl test failed:", urlErr);
      }
      
      // Upload to Supabase Storage
      console.log("[API:ingest/upload] Attempting upload with path:", storagePath);
      console.log("[API:ingest/upload] Path character breakdown:", {
        hasUnderscores: storagePath.includes("_"),
        hasDashes: storagePath.includes("-"),
        hasDots: storagePath.includes("."),
        hasSlashes: storagePath.includes("/"),
        length: storagePath.length,
        segments: storagePath.split("/"),
      });
      
      const { error: uploadError, data: uploadData } = await supabase.storage
        .from("documents")
        .upload(storagePath, buffer, {
          contentType: file.type,
          upsert: false,
        });

      if (uploadError) {
        console.error("[API:ingest/upload] Supabase storage upload error:", uploadError);
        console.error("[API:ingest/upload] Error details:", JSON.stringify(uploadError, null, 2));
        console.error("[API:ingest/upload] Attempted storage path:", storagePath);
        console.error("[API:ingest/upload] Path length:", storagePath.length);
        console.error("[API:ingest/upload] Path components:", storagePath.split("/"));
        
        const errorMsg = uploadError.message || String(uploadError);
        const errorStatus = (uploadError as any).statusCode || (uploadError as any).status || 500;
        
        // If pattern error, try absolute minimal path as fallback (per Grok: "test/test.pdf")
        if (errorMsg.toLowerCase().includes("pattern")) {
          // Use minimal path with NO underscores: test/test.pdf
          const minimalPath = `test/test-${timestamp}.pdf`;
          console.log("[API:ingest/upload] Pattern error detected, trying minimal path:", minimalPath);
          console.log("[API:ingest/upload] Minimal path has underscores:", minimalPath.includes("_"));
          
          // Test minimal path with getPublicUrl first
          try {
            const minimalUrl = supabase.storage.from("documents").getPublicUrl(minimalPath);
            console.log("[API:ingest/upload] Minimal path getPublicUrl:", minimalUrl.data?.publicUrl);
          } catch (urlErr) {
            console.error("[API:ingest/upload] Minimal path getPublicUrl failed:", urlErr);
          }
          
          const { error: testError } = await supabase.storage
            .from("documents")
            .upload(minimalPath, buffer, {
              contentType: file.type,
              upsert: false,
            });
          
          if (!testError) {
            // Minimal path worked! Update storagePath to minimalPath
            storagePath = minimalPath;
            console.log("[API:ingest/upload] Minimal path succeeded, using:", minimalPath);
          } else {
            // Even minimal path failed - log full error details
            console.error("[API:ingest/upload] Minimal path also failed:", testError);
            console.error("[API:ingest/upload] Original path was:", storagePath);
            console.error("[API:ingest/upload] Test path was:", testPath);
            console.error("[API:ingest/upload] Error message:", testError.message);
            return NextResponse.json(
              { 
                ok: false, 
                error: `Storage pattern error: ${errorMsg}. Even minimal path '${minimalPath}' failed. Please verify: 1) The 'documents' bucket exists in Supabase Dashboard, 2) Bucket is Public, 3) Check server logs for full error details. Original path: ${storagePath}` 
              },
              { status: 400 }
            );
          }
        } else if (
          errorMsg.toLowerCase().includes("not found") ||
          errorMsg.toLowerCase().includes("bucket") ||
          errorMsg.toLowerCase().includes("does not exist") ||
          errorMsg.toLowerCase().includes("invalid") ||
          errorStatus === 404 ||
          errorStatus === 400
        ) {
          // Bucket/config error
          return NextResponse.json(
            { 
              ok: false, 
              error: `Storage error: ${errorMsg}. Please verify: 1) The 'documents' bucket exists in Supabase Dashboard → Storage → Buckets, 2) The bucket name is exactly 'documents' (case-sensitive), 3) The bucket is Public or has correct RLS policies. Path attempted: ${storagePath}` 
            },
            { status: 400 }
          );
        } else {
          // Other error (including "already exists")
          // If file already exists, try again with a new unique path
          if (errorMsg.toLowerCase().includes("already exists") || errorMsg.toLowerCase().includes("duplicate")) {
            // Ensure NO underscores in retry path
            const safeFilename = sanitizedFilename.replace(/_/g, "-");
            storagePath = `${storageFolder}/${Date.now()}-${shortId}-${safeFilename}`;
            // Final safety: replace any underscores in retry path
            storagePath = storagePath.replace(/_/g, "-");
            console.log("[API:ingest/upload] File exists, retrying with new path:", storagePath);
            const { error: retryError } = await supabase.storage
              .from("documents")
              .upload(storagePath, buffer, {
                contentType: file.type,
                upsert: false,
              });
            
            if (retryError) {
              console.error("[API:ingest/upload] Retry upload error:", retryError);
              return NextResponse.json(
                { ok: false, error: `Storage upload failed: ${retryError.message || String(retryError)}` },
                { status: 500 }
              );
            }
            // Retry succeeded, continue with new storagePath
          } else {
            // Other error - return it
            return NextResponse.json(
              { 
                ok: false, 
                error: `Storage upload failed: ${errorMsg}. Status: ${errorStatus}. Path: ${storagePath}` 
              },
              { status: 500 }
            );
          }
        }
      }

      // Get signed URL for the stored file (valid for 1 hour)
      // Only if upload succeeded
      const { data: urlData, error: urlError } = await supabase.storage
        .from("documents")
        .createSignedUrl(storagePath, 3600);
      
      if (urlError) {
        console.error("[API:ingest/upload] Failed to create signed URL:", urlError);
      } else {
        storageUrl = urlData?.signedUrl || "";
        console.log("[API:ingest/upload] Successfully created signed URL for path:", storagePath);
      }
    } catch (storageErr: any) {
      console.error("Storage operation error:", storageErr);
      return NextResponse.json(
        { ok: false, error: `Storage error: ${storageErr?.message || "Unknown error"}` },
        { status: 500 }
      );
    }



    let concept = "";

    let notes = "";

    let extractedTags: string[] = [];

    let fullRawText = ""; // Store full text for deep chunking (PDF/text only)



    if (fileType === "image") {

      const base64 = buffer.toString("base64");

      const dataUrl = `data:${file.type};base64,${base64}`;



      const systemPrompt = [

        "You are a trading lesson extractor.",

        "You look at trading screenshots, charts, and notes.",

        "You return STRICT JSON only with keys: concept (string), notes (string), tags (string[]).",

        "No prose, no markdown, only JSON."

      ].join(" ");



      const userContent = [

        { type: "text", text: "Extract the main trading lesson from this image." },

        { type: "image_url", image_url: { url: dataUrl } }

      ] as const;



      const chat = await openai.chat.completions.create({

        model: process.env.OPENAI_VISION_MODEL || "gpt-4o-mini",

        messages: [

          { role: "system", content: systemPrompt },

          { role: "user", content: userContent as any }

        ],

        temperature: 0.1

      });



      const rawContent = chat.choices[0]?.message?.content;

      let textContent: string;



      if (typeof rawContent === "string") {

        textContent = rawContent;

      } else if (Array.isArray(rawContent)) {

        textContent = (rawContent as any[])

          .map(part => (typeof part === "string" ? part : (part as any).text || ""))

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

          extractedTags = parsed.tags.map(t => String(t));

        }

      } catch {

        concept = "Lesson from image";

        notesFromImage = textContent.trim();

      }



      notes = [notesFromImage, manualNotes].filter(Boolean).join("\n\n");

    } else if (fileType === "pdf") {

      // Lazy require to avoid build-time evaluation issues
      const pdfParse = eval('require')("pdf-parse");

      const parsed = await pdfParse(buffer);

      const rawText = (parsed.text || "").slice(0, 16000);

      // Store full raw text for deep chunking (before summarization)
      fullRawText = rawText;

      const pdfSystem = [

        "You summarise PDF documents into concise trading lessons.",

        "Return STRICT JSON only: { \"concept\": string, \"notes\": string, \"tags\": string[] }."

      ].join(" ");

      const pdfChat = await openai.chat.completions.create({

        model: process.env.OPENAI_VISION_MODEL || "gpt-4o-mini",

        messages: [

          { role: "system", content: pdfSystem },

          {

            role: "user",

            content: `Turn this document into one main trading lesson.\nReturn JSON only.\n\nDocument:\n${rawText}`

          }

        ],

        temperature: 0.2

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

    } else if (fileType === "text") {

      const text = buffer.toString("utf8");

      concept = text.trim().slice(0, 80) || "Uploaded Note";

      const notesFromText = text.trim();

      // Store full raw text for deep chunking
      fullRawText = notesFromText;

      notes = [notesFromText, manualNotes].filter(Boolean).join("\n\n");

      extractedTags = [];

    } else {

      return NextResponse.json(

        { ok: false, error: "Unsupported file type" },

        { status: 400 }

      );

    }



    // Ensure we have notes before proceeding

    if (!notes || !notes.trim()) {

      return NextResponse.json(

        { ok: false, error: "No lesson text extracted from file" },

        { status: 400 }

      );

    }

    // Combine extracted tags with manual tags

    const allTagsInput = [...extractedTags, ...tags];

    // Auto-generate concept/tags if missing

    const ensured = await ensureConceptAndTags({

      openai,

      notes: notes.trim(),

      concept,

      tags: allTagsInput,

    });

    concept = ensured.concept;

    const allTags = ensured.tags;

    const embedContent = [concept, notes].filter(Boolean).join("\n");

    const embedding = await openai.embeddings.create({

      model: "text-embedding-3-large",

      input: embedContent

    });

    const values = embedding.data[0]?.embedding ?? [];

    if (!values.length) {

      return NextResponse.json(

        { ok: false, error: "Embedding returned empty vector" },

        { status: 500 }

      );

    }

    const vectorId = `${lessonId}-${Date.now()}`;

    // Determine category: "playbook" if source is "playbook", else "corpus"
    const category = normalizedSource === "playbook" ? "playbook" : "corpus";

    // Create document record in documents table FIRST (before embedding)
    try {
      const { data: docData, error: docError } = await supabase
        .from("documents")
        .insert({
          user_id: userId,
          title: concept || file.name,
          filename: file.name,
          category,
          mime_type: file.type,
          storage_path: storagePath,
          size_bytes: file.size,
          lesson_id: lessonId,
          embedded: false, // Will update to true after embedding succeeds
        })
        .select("id")
        .single();

      if (docError) {
        console.error("Supabase documents insert error:", docError);
        // Don't fail the entire upload if documents table insert fails
      } else {
        documentId = docData?.id || null;
      }
    } catch (docErr) {
      console.error("Document insert error:", docErr);
      // Continue with embedding even if documents table insert fails
    }

    // Upsert into Pinecone with storage URL if available
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

          image_url: fileType === "image" ? storageUrl || "" : ""

        }

      }

    ]);

    // Update documents table to mark as embedded
    if (documentId) {
      try {
        await supabase
          .from("documents")
          .update({ embedded: true })
          .eq("id", documentId);
      } catch (updateErr) {
        console.error("Failed to update embedded flag:", updateErr);
      }
    }

    // Also insert into lessons table (existing behavior)

    const { error: sbError } = await supabase

      .from("lessons")

      .insert({

        lesson_id: lessonId,

        concept,

        notes,

        source: normalizedSource,

        tags: allTags,

        image_url: fileType === "image" ? storageUrl : ""

      });



    // After distilled lesson is prepared, add deep chunking for PDFs and text

    if ((fileType === "pdf" || fileType === "text") && fullRawText.trim()) {

      // Use the FULL raw text for deep corpus, not just the distilled notes

      const chunks = chunkText(fullRawText);

      if (chunks.length > 0) {

        // 1) Create embeddings in batch for all chunks

        const embeddingResponses = await Promise.all(

          chunks.map(chunk =>

            openai.embeddings.create({

              model: "text-embedding-3-large",

              input: chunk

            })

          )

        );

        // 2) Upsert into the corpus index

        await corpusIndex.upsert(

          embeddingResponses.map((res, i) => ({

            id: `${lessonId}-chunk-${i}`,

            values: res.data[0].embedding,

            metadata: {

              source: normalizedSource,

              book_title: file.name || "",

              chunk_index: i,

              content: chunks[i]

            }

          }))

        );

        // 3) Mirror into Supabase document_chunks

        const chunkRows = chunks.map((chunk, i) => ({

          source: normalizedSource,

          book_title: file.name || null,

          chunk_index: i,

          content: chunk,

          metadata: {}

        }));

        const { error: chunkError } = await supabase

          .from("document_chunks")

          .insert(chunkRows);

        if (chunkError) {

          console.error("Supabase insert error (document_chunks):", chunkError);

        }

      }

    }



    // Return response with required fields: id, filename, category
    const responseBody: {

      ok: true;

      id: string;

      filename: string;

      category: string;

      lesson_id: string;

      source: string;

      fileType: string;

      concept: string;

      notes: string;

      pineconeVectorId: string;

      storageWarning?: string;

    } = {

      ok: true,

      id: documentId || lessonId, // Use document ID if available, fallback to lesson_id

      filename: file.name,

      category,

      lesson_id: lessonId,

      source: normalizedSource,

      fileType,

      concept,

      notes,

      pineconeVectorId: vectorId

    };



    if (sbError) {

      console.error("Supabase insert error (upload - lessons table):", sbError);

    }



    return NextResponse.json(responseBody);

  } catch (err) {

    console.error("UPLOAD ERROR", err);

    const message = err instanceof Error ? err.message : "Server error in /api/ingest/upload";

    return NextResponse.json({ ok: false, error: message }, { status: 500 });

  }

}

