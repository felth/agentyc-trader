import { createClient } from "@supabase/supabase-js";

/**
 * Server-side Supabase client for API routes
 * Uses service role key for full database access
 */
export function getSupabase() {
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url) {
    throw new Error("SUPABASE_URL environment variable is required");
  }

  if (!key) {
    throw new Error("SUPABASE_SERVICE_ROLE_KEY environment variable is required");
  }

  return createClient(url, key, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });
}

