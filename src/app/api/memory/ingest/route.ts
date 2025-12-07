import { NextRequest, NextResponse } from "next/server";
import OpenAI from "openai";
import { Pinecone } from "@pinecone-database/pinecone";
import { createClient } from "@supabase/supabase-js";
import { MemoryIndex, IngestMode, INDEX_NAME_MAP } from "@/lib/constants/memory";
import { ensureConceptAndTags } from "@/lib/lessonUtils";
import { chunkForCorpus, chunkForPlaybook, extractRuleBullets } from "@/lib/memory/chunking";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type IngestBody = {
  source: "journal" | "library";
  index: MemoryIndex;
  mode: IngestMode;
  text?: string;
  fileId?: string;
  fileName?: string;
};

/**
 * Get Pinecone index by memory index type
 */
function getPineconeIndex(indexType: MemoryIndex) {
  const pc = new Pinecone({
    apiKey: process.env.PINECONE_API_KEY!,
  });

  const indexName = INDEX_NAME_MAP[indexType];
  
  return pc.index(
    process.env.PINECONE_INDEX!,
    process.env.PINECONE_HOST!
  );
}

/**
 * Insert text chunks into a Pinecone index
 */
async function insertChunks(
  index: any,
  chunks: string[],
  openai: OpenAI,
  metadata: {
    lesson_id: string;
    source: string;
    indexType: MemoryIndex;
    concept?: string;
    tags?: string[];
  }
): Promise<number> {
  if (chunks.length === 0) return 0;

  const vectors = await Promise.all(
    chunks.map(async (chunk, idx) => {
      const embed = await openai.embeddings.create({
        model: "text-embedding-3-large",
        input: chunk,
      });

      const values = embed.data?.[0]?.embedding ?? [];
      if (!values.length) return null;

      return {
        id: `${metadata.lesson_id}-chunk-${idx}-${Date.now()}`,
        values,
        metadata: {
          lesson_id: metadata.lesson_id,
          chunk_index: idx,
          text: chunk,
          concept: metadata.concept,
          tags: metadata.tags || [],
          source: metadata.source,
          index_type: metadata.indexType,
        },
      };
    })
  );

  const validVectors = vectors.filter((v): v is NonNullable<typeof v> => v !== null);
  
  if (validVectors.length > 0) {
    await index.upsert(validVectors);
  }

  return validVectors.length;
}

export async function POST(req: NextRequest) {
  try {
    const body = (await req.json()) as IngestBody;

    // Validate input
    if (!body.text && !body.fileId) {
      return NextResponse.json(
        { ok: false, error: "Either text or fileId must be provided" },
        { status: 400 }
      );
    }

    const source = body.source || "library";
    const index = body.index || MemoryIndex.CORPUS;
    const mode = body.mode || IngestMode.HYBRID;

    // Get text content
    let text = body.text || "";
    
    // TODO: If fileId is provided, fetch file content from Supabase
    // For now, we'll just use text directly

    if (!text.trim()) {
      return NextResponse.json(
        { ok: false, error: "Text content is required" },
        { status: 400 }
      );
    }

    const openai = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY!,
    });

    // Generate concept and tags
    const { concept, tags } = await ensureConceptAndTags({
      openai,
      notes: text,
      concept: undefined,
      tags: undefined,
    });

    const lesson_id = `ingest-${source}-${Date.now()}`;

    let corpusInserted = 0;
    let playbookInserted = 0;

    // Handle different ingest modes
    if (mode === IngestMode.HYBRID) {
      // Insert full chunks into CORPUS
      const corpusChunks = chunkForCorpus(text);
      const corpusIndex = getPineconeIndex(MemoryIndex.CORPUS);
      corpusInserted = await insertChunks(corpusIndex, corpusChunks, openai, {
        lesson_id,
        source,
        indexType: MemoryIndex.CORPUS,
        concept,
        tags,
      });

      // Extract rules and insert into PLAYBOOK
      const ruleText = extractRuleBullets(text);
      const playbookChunks = chunkForPlaybook(ruleText);
      const playbookIndex = getPineconeIndex(MemoryIndex.PLAYBOOK);
      playbookInserted = await insertChunks(playbookIndex, playbookChunks, openai, {
        lesson_id,
        source,
        indexType: MemoryIndex.PLAYBOOK,
        concept,
        tags,
      });
    } else if (mode === IngestMode.REFERENCE_ONLY) {
      // Insert only into CORPUS
      const chunks = chunkForCorpus(text);
      const corpusIndex = getPineconeIndex(MemoryIndex.CORPUS);
      corpusInserted = await insertChunks(corpusIndex, chunks, openai, {
        lesson_id,
        source,
        indexType: MemoryIndex.CORPUS,
        concept,
        tags,
      });
    } else if (mode === IngestMode.RULES_ONLY) {
      // Insert only into PLAYBOOK
      const chunks = chunkForPlaybook(text);
      const playbookIndex = getPineconeIndex(MemoryIndex.PLAYBOOK);
      playbookInserted = await insertChunks(playbookIndex, chunks, openai, {
        lesson_id,
        source,
        indexType: MemoryIndex.PLAYBOOK,
        concept,
        tags,
      });
    }

    // Log ingest event (for diagnostics)
    console.log(`[MEMORY INGEST] ${source} -> ${index} (${mode}): corpus=${corpusInserted}, playbook=${playbookInserted}`);

    // TODO: Store metadata in Supabase documents table if fileId provided

    return NextResponse.json({
      ok: true,
      status: "ok",
      corpusInserted,
      playbookInserted,
      lesson_id,
    });
  } catch (err: any) {
    console.error("[MEMORY INGEST ERROR]:", err);
    return NextResponse.json(
      { ok: false, error: err?.message ?? "Server error in /api/memory/ingest" },
      { status: 500 }
    );
  }
}

