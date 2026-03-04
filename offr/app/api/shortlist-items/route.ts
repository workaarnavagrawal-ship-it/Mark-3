import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

/** GET /api/shortlist-items — all shortlist items for current user */
export async function GET() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { data, error } = await supabase
    .from("shortlist_items")
    .select("*")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data ?? []);
}

/** POST /api/shortlist-items — add an item (upsert by type + key) */
export async function POST(req: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json();
  const {
    item_type,
    course_group_key,
    course_id,
    course_name,
    university_name,
    reason,
    fit_score,
  } = body;

  if (!item_type || !["COURSE_GROUP", "OFFERING"].includes(item_type)) {
    return NextResponse.json({ error: "item_type must be COURSE_GROUP or OFFERING" }, { status: 400 });
  }
  if (!course_name) {
    return NextResponse.json({ error: "course_name required" }, { status: 400 });
  }
  if (item_type === "COURSE_GROUP" && !course_group_key) {
    return NextResponse.json({ error: "course_group_key required for COURSE_GROUP" }, { status: 400 });
  }
  if (item_type === "OFFERING" && !course_id) {
    return NextResponse.json({ error: "course_id required for OFFERING" }, { status: 400 });
  }

  // Check if already shortlisted
  let existingQuery = supabase
    .from("shortlist_items")
    .select("id")
    .eq("user_id", user.id)
    .eq("item_type", item_type);

  if (item_type === "COURSE_GROUP") {
    existingQuery = existingQuery.eq("course_group_key", course_group_key);
  } else {
    existingQuery = existingQuery.eq("course_id", course_id);
  }

  const { data: existing } = await existingQuery.maybeSingle();
  if (existing) {
    return NextResponse.json({ error: "Already shortlisted", id: existing.id }, { status: 409 });
  }

  const { data, error } = await supabase
    .from("shortlist_items")
    .insert({
      user_id: user.id,
      item_type,
      course_group_key: course_group_key ?? null,
      course_id: course_id ?? null,
      course_name,
      university_name: university_name ?? null,
      reason: reason ?? null,
      fit_score: fit_score ?? null,
    })
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data, { status: 201 });
}
