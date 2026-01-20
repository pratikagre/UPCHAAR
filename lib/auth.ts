import { supabase } from "./supabaseClient";

/**
 * This function is used to sign up a new user with email and password.
 */
export async function signUp(email: string, password: string) {
  if (!supabase) throw new Error("Supabase not configured");

  const emailRedirectTo =
    process.env.NEXT_PUBLIC_SUPABASE_REDIRECT_URL || "http://localhost:3000";

  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: { emailRedirectTo },
  });

  if (error) throw error;

  return data;
}

/**
 * This function is used to sign in an existing user with email and password.
 */
export async function signIn(email: string, password: string) {
  if (!supabase) throw new Error("Supabase not configured");

  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password,
  });

  if (error) throw error;

  return data;
}

/**
 * This function is used to sign out the current user.
 */
export async function signOut() {
  if (!supabase) throw new Error("Supabase not configured");

  const { error } = await supabase.auth.signOut();

  if (error) throw error;
}
