import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

interface Params {
  params: { course_key: string };
}

export async function DELETE(_: Request, { params }: Params) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  const courseKey = decodeURIComponent(params.course_key);
  if (!courseKey) {
    return NextResponse.json({ error: "Missing course_key" }, { status: 400 });
  }

  const { error } = await supabase
    .from("shortlisted_courses")
    .delete()
    .eq("user_id", user.id)
    .eq("course_key", courseKey);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}

