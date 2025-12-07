/**
 * Helper functions for formatting library document names into display titles
 */

export type ParsedDocumentName = {
  title: string;
  author?: string;
};

/**
 * Parse a document filename into a display title and optional author
 * 
 * Example: "6288261955-Trading-in-the-Zone-Mark-Douglas-IND-230120-201317.pdf"
 *   → { title: "Trading in the Zone", author: "Mark Douglas" }
 */
export function parseDocumentName(rawName: string): ParsedDocumentName {
  // Remove file extension
  let nameWithoutExt = rawName.replace(/\.(pdf|epub|txt|docx?)$/i, "");
  
  // Remove leading numeric IDs and underscores
  nameWithoutExt = nameWithoutExt.replace(/^\d+[-_]?/, "");
  
  // Split on dashes
  const parts = nameWithoutExt.split("-").filter(p => p.length > 0);
  
  if (parts.length === 0) {
    return { title: rawName };
  }
  
  // Remove trailing junk tokens (dates, codes like "IND", numeric codes)
  const junkPatterns = [
    /^\d{6,}$/, // 6+ digit numbers (dates like 230120)
    /^IND$/i,
    /^[A-Z]{2,4}$/, // Short codes
  ];
  
  let cleanParts = parts.filter(p => !junkPatterns.some(pattern => pattern.test(p)));
  
  // Try to identify author: last 2 tokens if both start with uppercase
  let authorParts: string[] = [];
  let titleParts: string[] = [];
  
  if (cleanParts.length >= 3) {
    const lastTwo = cleanParts.slice(-2);
    const rest = cleanParts.slice(0, -2);
    
    // Check if last two look like "First Last" (both start with uppercase, reasonable length)
    if (
      lastTwo.length === 2 &&
      lastTwo[0].length >= 2 &&
      lastTwo[1].length >= 2 &&
      /^[A-Z]/.test(lastTwo[0]) &&
      /^[A-Z]/.test(lastTwo[1])
    ) {
      authorParts = lastTwo;
      titleParts = rest;
    } else {
      titleParts = cleanParts;
    }
  } else {
    titleParts = cleanParts;
  }
  
  // Format title: join with spaces and capitalize words
  const title = titleParts
    .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join(" ");
  
  // Format author: join with space
  const author = authorParts.length > 0
    ? authorParts.map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase()).join(" ")
    : undefined;
  
  return {
    title: title || rawName,
    author,
  };
}

