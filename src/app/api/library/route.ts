import { NextRequest, NextResponse } from "next/server";
import { getSupabase } from "@/lib/supabaseServer";

export const runtime = "nodejs";

export async function GET(req: NextRequest) {
  try {
    const supabase = getSupabase();

    // Always return all documents (no category filtering)
    const query = supabase.from("documents").select("*").order("created_at", { ascending: false });

    const { data, error } = await query;

    if (error) {
      console.error("Supabase fetch error (/api/library):", error);
      return NextResponse.json(
        { ok: false, error: error.message },
        { status: 500 }
      );
    }

    // Generate signed URLs for each document
    const documentsWithUrls = await Promise.all(
      (data || []).map(async (doc) => {
        const { data: urlData } = await supabase.storage
          .from("documents")
          .createSignedUrl(doc.storage_path, 3600);

        return {
          ...doc,
          storage_url: urlData?.signedUrl || "",
        };
      })
    );

    return NextResponse.json({ ok: true, documents: documentsWithUrls });
  } catch (err: any) {
    console.error("Library API error:", err);
    return NextResponse.json(
      { ok: false, error: err.message || "Server error" },
      { status: 500 }
    );
  }
}

