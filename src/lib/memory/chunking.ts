/**
 * Text chunking utilities for memory ingestion
 */

const CORPUS_CHUNK_SIZE = 1000; // Larger chunks for reference material
const PLAYBOOK_CHUNK_SIZE = 500; // Smaller chunks for rules/checklists
const CHUNK_OVERLAP = 100; // Overlap between chunks

/**
 * Split text into chunks for CORPUS (reference material)
 */
export function chunkForCorpus(text: string): string[] {
  const chunks: string[] = [];
  let start = 0;

  while (start < text.length) {
    const end = Math.min(start + CORPUS_CHUNK_SIZE, text.length);
    const chunk = text.slice(start, end);
    
    // Try to break at sentence boundary
    if (end < text.length) {
      const lastPeriod = chunk.lastIndexOf('.');
      const lastNewline = chunk.lastIndexOf('\n');
      const breakPoint = Math.max(lastPeriod, lastNewline);
      
      if (breakPoint > start + CORPUS_CHUNK_SIZE * 0.7) {
        chunks.push(text.slice(start, start + breakPoint + 1).trim());
        start = start + breakPoint + 1 - CHUNK_OVERLAP;
        continue;
      }
    }
    
    chunks.push(chunk.trim());
    start = end - CHUNK_OVERLAP;
  }

  return chunks.filter(c => c.length > 0);
}

/**
 * Split text into chunks for PLAYBOOK (rules/checklists)
 */
export function chunkForPlaybook(text: string): string[] {
  const chunks: string[] = [];
  let start = 0;

  while (start < text.length) {
    const end = Math.min(start + PLAYBOOK_CHUNK_SIZE, text.length);
    const chunk = text.slice(start, end);
    
    // Try to break at sentence or list item boundary
    if (end < text.length) {
      const lastPeriod = chunk.lastIndexOf('.');
      const lastBullet = chunk.lastIndexOf('\n-');
      const lastNewline = chunk.lastIndexOf('\n');
      const breakPoint = Math.max(lastPeriod, lastBullet, lastNewline);
      
      if (breakPoint > start + PLAYBOOK_CHUNK_SIZE * 0.6) {
        chunks.push(text.slice(start, start + breakPoint + 1).trim());
        start = start + breakPoint + 1 - CHUNK_OVERLAP;
        continue;
      }
    }
    
    chunks.push(chunk.trim());
    start = end - CHUNK_OVERLAP;
  }

  return chunks.filter(c => c.length > 0);
}

/**
 * Extract summary/rule bullets from text (for HYBRID mode playbook ingestion)
 * TODO: Replace with LLM summarization when available
 */
export function extractRuleBullets(text: string): string {
  // Simple heuristic: extract sentences that look like rules
  const sentences = text
    .split(/[.!?]\s+/)
    .filter(s => s.length > 20 && s.length < 200)
    .filter(s => 
      s.toLowerCase().includes('always') ||
      s.toLowerCase().includes('never') ||
      s.toLowerCase().includes('when') ||
      s.toLowerCase().includes('if') ||
      s.match(/^\d+\./) || // Numbered list
      s.match(/^[-•]/) // Bullet list
    )
    .slice(0, 5); // Limit to 5 bullets

  return sentences.join('. ') || text.slice(0, 300); // Fallback to first 300 chars
}

