import { NextRequest, NextResponse } from "next/server";
import { getSupabase } from "@/lib/supabaseServer";

export const runtime = "nodejs";

/**
 * Generate a signed upload URL for direct client-side upload to Supabase Storage
 * This bypasses Vercel's 4.5MB function payload limit for large files
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { filename, contentType } = body;

    if (!filename) {
      return NextResponse.json(
        { ok: false, error: "filename required" },
        { status: 400 }
      );
    }

    const supabase = getSupabase();
    
    // Generate storage path (same format as upload route)
    const storageFolder = "default-user";
    const timestamp = Date.now();
    const uniqueId = crypto.randomUUID().replace(/[-_]/g, "");
    const shortId = uniqueId.substring(0, 8);
    
    // Sanitize filename (no underscores)
    const baseFilename = filename.split("/").pop() || filename.split("\\").pop() || "file";
    const fileExtension = baseFilename.includes(".") ? baseFilename.substring(baseFilename.lastIndexOf(".")) : "";
    const filenameWithoutExt = baseFilename.replace(/\.[^/.]+$/, "") || "file";
    
    const sanitizedBase = filenameWithoutExt
      .replace(/[^a-zA-Z0-9.-]/g, "-")
      .replace(/_/g, "-")
      .replace(/-{2,}/g, "-")
      .replace(/^-+|-$/g, "")
      .substring(0, 200);
    
    const safeExtension = fileExtension.replace(/_/g, "-");
    const safeFilename = sanitizedBase + safeExtension;
    
    const storagePath = `${storageFolder}/${timestamp}-${shortId}-${safeFilename}`.replace(/_/g, "-");

    // Generate signed upload URL (valid for 1 hour)
    const { data, error } = await supabase.storage
      .from("documents")
      .createSignedUploadUrl(storagePath, {
        upsert: false,
      });

    if (error) {
      console.error("[API:ingest/upload-url] Failed to create signed URL:", error);
      return NextResponse.json(
        { ok: false, error: `Failed to generate upload URL: ${error.message}` },
        { status: 500 }
      );
    }

    // Create placeholder document record (will be updated by /api/ingest/process after upload)
    const userId = "00000000-0000-0000-0000-000000000000"; // Temporary until real auth
    const lessonId = crypto.randomUUID();
    
    const { error: docError } = await supabase.from("documents").insert({
      user_id: userId,
      filename: filename,
      category: (body.source || "playbook") === "playbook" ? "playbook" : "corpus",
      mime_type: contentType || "application/octet-stream",
      storage_path: storagePath,
      size_bytes: body.fileSize || null,
      embedded: false,
      lesson_id: lessonId,
    });

    if (docError) {
      console.error("[API:ingest/upload-url] Failed to create document record:", docError);
      // Don't fail the request - the process endpoint can create it if needed
    }

    return NextResponse.json({
      ok: true,
      uploadUrl: data.signedUrl,
      path: storagePath,
      token: data.token,
      lessonId: lessonId,
    });
  } catch (err: any) {
    console.error("[API:ingest/upload-url] Error:", err);
    return NextResponse.json(
      { ok: false, error: err?.message || "Failed to generate upload URL" },
      { status: 500 }
    );
  }
}

