import { createClient } from "./supabase/client";
import type { Profile, ProfileWithSubjects, SubjectEntry, TrackerEntry } from "./types";

// ── Profile ──────────────────────────────────────────────────────
export async function getProfile(): Promise<ProfileWithSubjects | null> {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;

  const { data: profile } = await supabase
    .from("profiles")
    .select("*")
    .eq("user_id", user.id)
    .single();

  if (!profile) return null;

  const { data: subjects } = await supabase
    .from("subjects")
    .select("*")
    .eq("profile_id", profile.id)
    .order("level");

  return { ...profile, subjects: subjects || [] };
}

export async function upsertProfile(data: Partial<Profile>): Promise<Profile | null> {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;

  const { data: profile, error } = await supabase
    .from("profiles")
    .upsert({ ...data, user_id: user.id, updated_at: new Date().toISOString() }, { onConflict: "user_id" })
    .select()
    .single();

  if (error) throw error;
  return profile;
}

export async function upsertSubjects(profileId: string, subjects: SubjectEntry[]): Promise<void> {
  const supabase = createClient();
  // Delete existing
  await supabase.from("subjects").delete().eq("profile_id", profileId);
  // Insert new
  if (subjects.length > 0) {
    await supabase.from("subjects").insert(
      subjects.map((s) => ({ ...s, profile_id: profileId }))
    );
  }
}

// ── Tracker ──────────────────────────────────────────────────────
export async function getTrackerEntries(): Promise<TrackerEntry[]> {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return [];
  const { data } = await supabase
    .from("assessments")
    .select("*")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false });
  return data || [];
}

export async function saveTrackerEntry(entry: Omit<TrackerEntry, "id" | "created_at">): Promise<TrackerEntry | null> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("assessments")
    .insert(entry)
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function updateTrackerLabel(id: string, label: string): Promise<void> {
  const supabase = createClient();
  await supabase.from("assessments").update({ label }).eq("id", id);
}

export async function deleteTrackerEntry(id: string): Promise<void> {
  const supabase = createClient();
  await supabase.from("assessments").delete().eq("id", id);
}
