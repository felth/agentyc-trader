import { NextRequest, NextResponse } from "next/server";

import OpenAI from "openai";

import { Pinecone } from "@pinecone-database/pinecone";

import { getSupabase } from "@/lib/supabaseServer";

import { normalizeSource } from "@/lib/agentSources";

import { processFileContent, detectFileType, FileType } from "@/lib/fileProcessing";



export const runtime = "nodejs";



/**
 * Process uploaded file from Supabase Storage path
 * Alternative entry point when file is already in Storage
 */
export async function PUT(req: NextRequest) {
  try {
    const body = await req.json();
    const { storagePath, source, manualNotes, lessonId: providedLessonId } = body;

    if (!storagePath) {
      return NextResponse.json(
        { ok: false, error: "storagePath required" },
        { status: 400 }
      );
    }

    // Fetch file from Supabase Storage
    const supabase = getSupabase();
    const { data: fileData, error: downloadError } = await supabase.storage
      .from("documents")
      .download(storagePath);

    if (downloadError || !fileData) {
      return NextResponse.json(
        { ok: false, error: `Failed to download file from storage: ${downloadError?.message}` },
        { status: 500 }
      );
    }

    // Convert Blob to File-like object for processing
    const arrayBuffer = await fileData.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    const fileName = storagePath.split("/").pop() || "file";
    const fileType = fileData.type || "application/octet-stream";

    // Create a File object for processing (we'll process it inline)
    // Continue with existing processing logic...
    // For now, return a message that this endpoint needs the file to be uploaded via POST first
    return NextResponse.json(
      { ok: false, error: "Use POST endpoint to upload file directly, or use signed URL flow" },
      { status: 400 }
    );
  } catch (err: any) {
    console.error("[API:ingest/upload] PUT error:", err);
    return NextResponse.json(
      { ok: false, error: err?.message || "Processing error" },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {

  try {

    console.log("[API:ingest/upload] Received upload request");

    // Check Content-Length header for large files
    const contentLength = req.headers.get("content-length");
    const sizeInMB = contentLength ? parseInt(contentLength) / (1024 * 1024) : 0;
    
    if (sizeInMB > 4.5) {
      console.warn(`[API:ingest/upload] Large file detected (${sizeInMB.toFixed(2)}MB), may exceed Vercel limit`);
      return NextResponse.json(
        { 
          ok: false, 
          error: `File too large for direct upload (${sizeInMB.toFixed(2)}MB). Vercel has a 4.5MB limit. Please use the signed URL flow for files over 4MB.`,
          useSignedUrl: true 
        },
        { status: 413 }
      );
    }

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
            console.error("[API:ingest/upload] Minimal path was:", minimalPath);
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



    // Use shared processing logic (reuses embedding/chunking helpers)
    const userId = "00000000-0000-0000-0000-000000000000"; // Temporary until real auth

    const result = await processFileContent({

      buffer,

      fileName: file.name,

      fileType: file.type,

      fileSize: file.size,

      fileTypeDetected: fileType,

      source: normalizedSource,

      manualNotes: manualNotes || "",

      tags: tags || [],

      lessonId,

      storagePath,

      storageUrl: storageUrl || "",

      userId,

      documentId: null, // Will be created in processFileContent

    });

    if (!result.ok) {

      return NextResponse.json(

        { ok: false, error: result.error },

        { status: 500 }

      );

    }

    // Extract results from processing

    const concept = result.concept!;

    const notes = result.notes!;

    const allTags = result.tags!;

    const category = result.category!;

    const vectorId = result.pineconeVectorId!;

    if (result.documentId) {

      documentId = result.documentId;

    }

    // All processing (embedding, chunking) now handled by shared processFileContent helper above

    // Build response from processing result
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
      id: result.documentId || result.lessonId!,
      filename: file.name,
      category: result.category!,
      lesson_id: result.lessonId!,
      source: normalizedSource,
      fileType: result.fileType!,
      concept: result.concept!,
      notes: result.notes!,
      pineconeVectorId: result.pineconeVectorId!,
    };

    return NextResponse.json(responseBody);
    console.error("UPLOAD ERROR", err);

    const message = err instanceof Error ? err.message : "Server error in /api/ingest/upload";

    return NextResponse.json({ ok: false, error: message }, { status: 500 });

  }

}

