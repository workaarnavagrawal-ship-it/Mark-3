import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

/** GET /api/strategy — return all strategy slots for current user */
export async function GET() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { data, error } = await supabase
    .from("strategy_choices")
    .select("*")
    .eq("user_id", user.id)
    .order("slot");

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data ?? []);
}

/** POST /api/strategy — upsert a slot */
export async function POST(req: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json();
  const { slot, course_id, university_id, university_name, course_name, degree_type, typical_offer, notes } = body;

  if (!slot || slot < 1 || slot > 5) {
    return NextResponse.json({ error: "slot must be 1–5" }, { status: 400 });
  }
  if (!course_id || !university_name || !course_name) {
    return NextResponse.json({ error: "course_id, university_name, course_name required" }, { status: 400 });
  }

  const { data, error } = await supabase
    .from("strategy_choices")
    .upsert(
      {
        user_id: user.id,
        slot,
        course_id,
        university_id: university_id ?? "",
        university_name,
        course_name,
        degree_type: degree_type ?? null,
        typical_offer: typical_offer ?? null,
        notes: notes ?? null,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "user_id,slot" }
    )
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data, { status: 201 });
}
