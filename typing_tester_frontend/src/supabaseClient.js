import { createClient } from "@supabase/supabase-js";

const SUPABASE_URL = "https://rquvaaymanduddbwktxk.supabase.co";
const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJxdXZhYXltYW5kdWRkYndrdHhrIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTA4MTkwOTcsImV4cCI6MjA2NjM5NTA5N30.iT_cuWebAjeMangmiYSbyutvYab4TlEBZU19QZhR0ss";

// PUBLIC_INTERFACE
export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// ---- Authentication ----

// PUBLIC_INTERFACE
export async function signUpWithEmail(email, password) {
  /** Create a user with email and password */
  return supabase.auth.signUp({ email, password });
}

// PUBLIC_INTERFACE
export async function signInWithEmail(email, password) {
  /** Sign in existing user */
  return supabase.auth.signInWithPassword({ email, password });
}

// PUBLIC_INTERFACE
export async function signOut() {
  /** Sign out current user */
  return supabase.auth.signOut();
}

// PUBLIC_INTERFACE
export async function getCurrentUserProfile() {
  /** Fetches profile and high score for the currently logged-in user */
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;
  const { data: profile } = await supabase
    .from("profiles")
    .select("id, email, username, high_score")
    .eq("id", user.id)
    .single();
  return profile;
}

// PUBLIC_INTERFACE
export async function updateUserHighScore(newScore) {
  /** Updates user's high score if newScore is higher */
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;
  // Upsert new high score
  const { data, error } = await supabase
    .from("profiles")
    .update({ high_score: newScore })
    .eq("id", user.id)
    .select()
    .single();
  if (error) throw error;
  return data;
}

// PUBLIC_INTERFACE
export async function saveScore(score) {
  /**
   * Stores the score in the scores table with user_id foreign key
   * (Assumes auth is required by RLS; score is WPM.)
   */
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("User not logged in.");
  const resp = await supabase
    .from("scores")
    .insert([{ user_id: user.id, score }]);
  return resp;
}

// PUBLIC_INTERFACE
export async function fetchLeaderboard(limit = 10) {
  /** Gets top scores across all users, join with profile usernames */
  // If usernames are not set, email is fallback.
  const { data, error } = await supabase
    .from("profiles")
    .select("id, username, email, high_score")
    .order("high_score", { ascending: false })
    .limit(limit);
  if (error) throw error;
  return data;
}

// PUBLIC_INTERFACE
export function generateInviteLink(userId) {
  /**
   * Generates a link to the app with an invite code (user id of inviter).
   * Recipient can use this to compare scores after sign up.
   */
  // For demo, the app expects to be hosted on current host.
  const url = new URL(window.location.href);
  url.searchParams.set("invite", userId);
  return url.toString();
}

// PUBLIC_INTERFACE
export async function getInviterProfile(inviteUserId) {
  /** Given an inviter's user id, fetch their profile (no auth required). */
  if (!inviteUserId) return null;
  const { data, error } = await supabase
    .from("profiles")
    .select("id, username, high_score, email")
    .eq("id", inviteUserId)
    .single();
  if (error) return null;
  return data;
}
