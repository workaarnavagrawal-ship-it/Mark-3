import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

/** DELETE /api/strategy/[slot] — clear a single strategy slot */
export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ slot: string }> }
) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { slot: slotStr } = await params;
  const slot = parseInt(slotStr, 10);
  if (isNaN(slot) || slot < 1 || slot > 5) {
    return NextResponse.json({ error: "slot must be 1–5" }, { status: 400 });
  }

  const { error } = await supabase
    .from("strategy_choices")
    .delete()
    .eq("user_id", user.id)
    .eq("slot", slot);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ success: true });
}
