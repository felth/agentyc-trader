import { NextRequest, NextResponse } from "next/server";
import { getSupabase } from "@/lib/supabaseServer";
import { processFileContent, detectFileType, FileType } from "@/lib/fileProcessing";

export const runtime = "nodejs";

/**
 * Process a file already uploaded to Supabase Storage
 * Reuses the same embedding/chunking logic as /api/ingest/upload
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { storagePath, source, manualNotes, tags, lessonId: providedLessonId, fileName, fileType: providedFileType, fileSize } = body;

    if (!storagePath) {
      return NextResponse.json(
        { ok: false, error: "storagePath required" },
        { status: 400 }
      );
    }

    if (!fileName) {
      return NextResponse.json(
        { ok: false, error: "fileName required" },
        { status: 400 }
      );
    }

    console.log("[API:ingest/process] Processing file from storage:", storagePath);

    const supabase = getSupabase();

    // Check if document already exists in documents table
    const { data: existingDoc } = await supabase
      .from("documents")
      .select("id, lesson_id, mime_type, size_bytes")
      .eq("storage_path", storagePath)
      .single();

    let documentId: string | null = existingDoc?.id || null;
    const lessonId = providedLessonId || existingDoc?.lesson_id || crypto.randomUUID();
    const detectedFileType = detectFileType(providedFileType || existingDoc?.mime_type || "application/octet-stream", fileName);
    const actualFileSize = fileSize || existingDoc?.size_bytes || 0;

    // Download file from Supabase Storage
    const { data: fileData, error: downloadError } = await supabase.storage
      .from("documents")
      .download(storagePath);

    if (downloadError || !fileData) {
      console.error("[API:ingest/process] Failed to download file:", downloadError);
      return NextResponse.json(
        {
          ok: false,
          error: `Failed to download file from storage: ${downloadError?.message || "Unknown error"}`,
        },
        { status: 500 }
      );
    }

    // Get signed URL for the stored file
    const { data: urlData } = await supabase.storage
      .from("documents")
      .createSignedUrl(storagePath, 3600);
    const storageUrl = urlData?.signedUrl || "";

    // Convert Blob to Buffer
    const arrayBuffer = await fileData.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    // Use shared processing logic
    const userId = "00000000-0000-0000-0000-000000000000"; // Temporary until real auth

    const result = await processFileContent({
      buffer,
      fileName,
      fileType: providedFileType || existingDoc?.mime_type || fileData.type || "application/octet-stream",
      fileSize: actualFileSize,
      fileTypeDetected: detectedFileType,
      source: source || "playbook",
      manualNotes: manualNotes || "",
      tags: tags || [],
      lessonId,
      storagePath,
      storageUrl,
      userId,
      documentId,
    });

    if (!result.ok) {
      return NextResponse.json(
        { ok: false, error: result.error },
        { status: 500 }
      );
    }

    return NextResponse.json({
      ok: true,
      id: result.documentId || result.lessonId,
      filename: fileName,
      category: result.category,
      lesson_id: result.lessonId,
      source: source || "playbook",
      fileType: result.fileType,
      concept: result.concept,
      notes: result.notes,
      pineconeVectorId: result.pineconeVectorId,
    });
  } catch (err: any) {
    console.error("[API:ingest/process] Error:", err);
    return NextResponse.json(
      { ok: false, error: err?.message || "Processing error" },
      { status: 500 }
    );
  }
}

