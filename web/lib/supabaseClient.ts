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
  (supabaseUrl || "https://tztlwifjqcmkfribxwlx.supabase.co").replace(/\\r\\n|\\n|\\r/g, '').replace(/[\r\n]+/g, '').trim(),
  (supabaseAnonKey || "sb_publishable_Ci2EZd9BQN1qnSPi32vQNQ_4pmrWb3N").replace(/\\r\\n|\\n|\\r/g, '').replace(/[\r\n]+/g, '').trim(),
);

export const getSupabaseClient = () => supabase;
