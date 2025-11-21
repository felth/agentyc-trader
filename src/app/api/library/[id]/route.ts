import { NextRequest, NextResponse } from "next/server";
import { getSupabase } from "@/lib/supabaseServer";

export const runtime = "nodejs";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const supabase = getSupabase();

    const { data, error } = await supabase
      .from("documents")
      .select("*")
      .eq("id", id)
      .single();

    if (error) {
      console.error("Supabase fetch error (/api/library/[id]):", error);
      return NextResponse.json(
        { ok: false, error: error.message },
        { status: 500 }
      );
    }

    if (!data) {
      return NextResponse.json(
        { ok: false, error: "Document not found" },
        { status: 404 }
      );
    }

    // Generate signed URL
    const { data: urlData } = await supabase.storage
      .from("documents")
      .createSignedUrl(data.storage_path, 3600);

    return NextResponse.json({
      ok: true,
      document: {
        ...data,
        storage_url: urlData?.signedUrl || "",
      },
    });
  } catch (err: any) {
    console.error("Library API error:", err);
    return NextResponse.json(
      { ok: false, error: err.message || "Server error" },
      { status: 500 }
    );
  }
}

// PATCH handler removed - category updates no longer supported in UI
// Category field remains in DB but is not exposed in the UI

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const supabase = getSupabase();

    // First get the document to get storage_path
    const { data: doc, error: fetchError } = await supabase
      .from("documents")
      .select("storage_path, lesson_id")
      .eq("id", id)
      .single();

    if (fetchError || !doc) {
      return NextResponse.json(
        { ok: false, error: "Document not found" },
        { status: 404 }
      );
    }

    // Delete from storage
    const { error: storageError } = await supabase.storage
      .from("documents")
      .remove([doc.storage_path]);

    if (storageError) {
      console.error("Storage delete error:", storageError);
      // Continue with DB delete even if storage delete fails
    }

    // Delete from database
    const { error: dbError } = await supabase.from("documents").delete().eq("id", id);

    if (dbError) {
      console.error("Supabase delete error (/api/library/[id]):", dbError);
      return NextResponse.json(
        { ok: false, error: dbError.message },
        { status: 500 }
      );
    }

    // TODO: Clean up embeddings if needed (delete from Pinecone by lesson_id)

    return NextResponse.json({ ok: true });
  } catch (err: any) {
    console.error("Library API error:", err);
    return NextResponse.json(
      { ok: false, error: err.message || "Server error" },
      { status: 500 }
    );
  }
}

