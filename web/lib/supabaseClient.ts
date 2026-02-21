import { createClient, type SupabaseClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  // Build time error avoid karne ke liye (Render/Vercel)
  // Actual runtime par env vars required honge
  console.warn(
    "⚠️ Missing NEXT_PUBLIC_SUPABASE_URL or NEXT_PUBLIC_SUPABASE_ANON_KEY",
  );
}

export const supabase: SupabaseClient = createClient(
  (supabaseUrl || "https://ggsqublasivptmjxzkgw.supabase.co").trim(),
  (supabaseAnonKey || "sb_publishable_XSqmz68dJcKFxsDoVXCj8A_4NWKbivX").trim(),
);

export const getSupabaseClient = () => supabase;
