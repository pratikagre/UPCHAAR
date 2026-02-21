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
  (supabaseUrl || "https://wewvjsnsroqvharbtjrd.supabase.co").replace(/\\r\\n|\\n|\\r/g, '').replace(/[\r\n]+/g, '').trim(),
  (supabaseAnonKey || "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Indld3Zqc25zcm9xdmhhcmJ0anJkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzE2NzU0ODksImV4cCI6MjA4NzI1MTQ4OX0.fBKepQYxNIVWns92NRPwX8yeXtir4dU2EgPDfkQ8gmY").replace(/\\r\\n|\\n|\\r/g, '').replace(/[\r\n]+/g, '').trim(),
);

export const getSupabaseClient = () => supabase;
