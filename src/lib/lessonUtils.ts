// src/lib/lessonUtils.ts

import OpenAI from "openai";

export type LessonTag = string;

export type EnsureConceptAndTagsParams = {

  openai: OpenAI;

  notes: string;

  concept?: string | null;

  tags?: LessonTag[] | null;

  maxTags?: number;

};

export type EnsureConceptAndTagsResult = {

  concept: string;

  tags: LessonTag[];

};

/**

 * Ensure every lesson has a short playbook-style concept and a set of tags.

 * - If concept + tags already exist, they're returned unchanged.

 * - Otherwise we ask the model to propose them from the notes.

 * - On any model/JSON error we fall back to:

 *   concept = first 80 chars of notes

 *   tags = existing tags or []

 */

export async function ensureConceptAndTags(

  params: EnsureConceptAndTagsParams

): Promise<EnsureConceptAndTagsResult> {

  const { openai } = params;

  const notes = (params.notes || "").trim();

  let concept = (params.concept || "").trim();

  let tags = (params.tags || []).map((t) => t.trim()).filter(Boolean);

  const maxTags = params.maxTags ?? 6;

  if (!notes) {

    throw new Error("Notes text is required to generate concept/tags");

  }

  // If both concept and at least one tag already exist, respect them

  if (concept && tags.length > 0) {

    return { concept, tags };

  }

  // Helper fallback if anything goes wrong

  const fallbackConcept =

    concept || (notes.length > 80 ? notes.slice(0, 77) + "…" : notes);

  const fallbackTags = tags;

  try {

    const systemMessage =

      "You are a trading playbook editor. " +

      "Given a trader's notes, invent a short, clear rule-style title " +

      "and 3–6 compact tags. Respond with STRICT JSON only: " +

      `{"concept": "short title", "tags": ["tag1","tag2"]}. ` +

      "Tags must be lowercase, hyphen/word based, no spaces, no explanations.";

    const userMessage = `Notes:\n${notes}`;

    const completion = await openai.chat.completions.create({

      model: process.env.OPENAI_AGENT_MODEL || "gpt-4o-mini",

      temperature: 0.2,

      messages: [

        { role: "system", content: systemMessage },

        { role: "user", content: userMessage },

      ],

    });

    const content = completion.choices[0]?.message?.content;

    let jsonText = "";

    if (typeof content === "string") {

      jsonText = content;

    } else if (Array.isArray(content)) {

      jsonText = (content as any[])

        .map((part: any) => {

          if (typeof part === "string") return part;

          if (part && typeof part.text === "string") return part.text;

          if (part && typeof part.content === "string") return part.content;

          return "";

        })

        .join("\n");

    }

    const match = jsonText.match(/\{[\s\S]*\}/);

    if (!match) {

      return { concept: fallbackConcept, tags: fallbackTags };

    }

    const parsed = JSON.parse(match[0]) as {

      concept?: string;

      tags?: string[];

    };

    const finalConcept =

      (parsed.concept || fallbackConcept || "").trim() || fallbackConcept;

    const finalTags = (parsed.tags || fallbackTags || [])

      .map((t) => String(t).trim())

      .filter(Boolean)

      .slice(0, maxTags);

    return {

      concept: finalConcept,

      tags: finalTags,

    };

  } catch (err) {

    console.error("ensureConceptAndTags error:", err);

    return {

      concept: fallbackConcept,

      tags: fallbackTags,

    };

  }

}

