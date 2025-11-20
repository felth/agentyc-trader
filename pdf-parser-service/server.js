/**
 * External PDF Parsing Service
 * 
 * This service runs separately from the AGENTYC Vercel app and handles PDF text extraction
 * using native pdf-parse library (which doesn't work well in serverless environments).
 * 
 * Deploy this to Railway, Fly.io, or any Node.js hosting service.
 * 
 * Environment Variables Required:
 * - SUPABASE_URL: Your Supabase project URL
 * - SUPABASE_SERVICE_ROLE_KEY: Supabase service role key (for storage access)
 * - PORT: Server port (default: 3001)
 * 
 * API:
 * POST /parse-pdf
 * 
 * Request body:
 * {
 *   "storagePath": "default-user/1734672000000-a1b2c3d4-book.pdf"
 * }
 * 
 * Response:
 * {
 *   "text": "extracted text from PDF..."
 * }
 * 
 * Error response:
 * {
 *   "error": "error message..."
 * }
 */

const express = require("express");
const { createClient } = require("@supabase/supabase-js");
const pdfParse = require("pdf-parse");

const app = express();
app.use(express.json());

const PORT = process.env.PORT || 3001;
const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
  console.error("Missing required environment variables: SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY");
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

/**
 * Health check endpoint
 */
app.get("/health", (req, res) => {
  res.json({ status: "ok", service: "pdf-parser" });
});

/**
 * Parse PDF endpoint
 * POST /parse-pdf
 */
app.post("/parse-pdf", async (req, res) => {
  try {
    const { storagePath } = req.body;

    if (!storagePath || typeof storagePath !== "string") {
      return res.status(400).json({
        error: "storagePath is required and must be a string",
      });
    }

    console.log(`[parse-pdf] Processing PDF: ${storagePath}`);

    // Download PDF from Supabase Storage
    const { data: pdfBlob, error: downloadError } = await supabase.storage
      .from("documents")
      .download(storagePath);

    if (downloadError || !pdfBlob) {
      console.error(`[parse-pdf] Download error:`, downloadError);
      return res.status(404).json({
        error: `Failed to download PDF from storage: ${downloadError?.message || "File not found"}`,
      });
    }

    // Convert Blob to Buffer for pdf-parse
    const arrayBuffer = await pdfBlob.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    // Parse PDF using pdf-parse
    const parsed = await pdfParse(buffer);
    const text = parsed.text || "";

    if (!text.trim()) {
      return res.status(422).json({
        error: "PDF parsed but no text content found. The PDF may be image-based or empty.",
      });
    }

    console.log(`[parse-pdf] Successfully extracted ${text.length} characters from PDF`);

    // Return extracted text
    res.json({
      text: text,
    });
  } catch (error) {
    console.error("[parse-pdf] Error:", error);
    res.status(500).json({
      error: error.message || "Internal server error while parsing PDF",
    });
  }
});

// Start server
app.listen(PORT, () => {
  console.log(`PDF Parser Service running on port ${PORT}`);
  console.log(`Health check: http://localhost:${PORT}/health`);
  console.log(`Parse PDF: POST http://localhost:${PORT}/parse-pdf`);
});

