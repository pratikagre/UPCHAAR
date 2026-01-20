import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || "";
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "";

// ✅ Always export supabase so imports never break
export const supabase =
  supabaseUrl && supabaseAnonKey
    ? createClient(supabaseUrl, supabaseAnonKey)
    : createClient("http://localhost:54321", "dummy_anon_key");

// Optional helper
export const isSupabaseConfigured = Boolean(supabaseUrl && supabaseAnonKey);
