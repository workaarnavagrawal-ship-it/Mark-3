import { createClient } from "./supabase/client";
import type {
  Profile,
  ProfileWithSubjects,
  PSAnalysisResponse,
  SubjectEntry,
  TrackerEntry,
  StrategyChoice,
  ShortlistItem,
} from "./types";

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

// ── PS analysis persistence ────────────────────────────────────────
export async function savePSAnalysis(result: PSAnalysisResponse): Promise<void> {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return;
  await supabase
    .from("profiles")
    .update({ ps_last_analysis: result, updated_at: new Date().toISOString() })
    .eq("user_id", user.id);
}

// ── Strategy choices ──────────────────────────────────────────────

export async function getStrategyChoices(): Promise<StrategyChoice[]> {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return [];
  const { data } = await supabase
    .from("strategy_choices")
    .select("*")
    .eq("user_id", user.id)
    .order("slot");
  return data || [];
}

export async function upsertStrategySlot(
  choice: Omit<StrategyChoice, "id">
): Promise<StrategyChoice | null> {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;
  const { data, error } = await supabase
    .from("strategy_choices")
    .upsert(
      { ...choice, user_id: user.id, updated_at: new Date().toISOString() },
      { onConflict: "user_id,slot" }
    )
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function clearStrategySlot(slot: number): Promise<void> {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return;
  await supabase
    .from("strategy_choices")
    .delete()
    .eq("user_id", user.id)
    .eq("slot", slot);
}

// ── Shortlist items ───────────────────────────────────────────────

export async function getShortlistItems(): Promise<ShortlistItem[]> {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return [];
  const { data } = await supabase
    .from("shortlist_items")
    .select("*")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false });
  return data || [];
}

export async function addShortlistItem(
  item: Omit<ShortlistItem, "id" | "user_id" | "created_at">
): Promise<ShortlistItem | null> {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;
  const { data, error } = await supabase
    .from("shortlist_items")
    .insert({ ...item, user_id: user.id })
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function removeShortlistItem(id: string): Promise<void> {
  const supabase = createClient();
  await supabase.from("shortlist_items").delete().eq("id", id);
}

export async function isShortlisted(
  item_type: "COURSE_GROUP" | "OFFERING",
  key: string
): Promise<string | null> {
  // Returns the item id if shortlisted, otherwise null
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;

  const col = item_type === "COURSE_GROUP" ? "course_group_key" : "course_id";
  const { data } = await supabase
    .from("shortlist_items")
    .select("id")
    .eq("user_id", user.id)
    .eq("item_type", item_type)
    .eq(col, key)
    .maybeSingle();
  return data?.id ?? null;
}
