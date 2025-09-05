import { getSupabaseServer } from "@/utils/supabase/getSupabaseServer";
import { auth } from "@clerk/nextjs/server";
import { NextRequest, NextResponse } from "next/server";

export async function GET(req: NextRequest) {
  const { userId, getToken } = await auth();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  console.log("userId: ", userId);

  const token = await getToken({ template: "supabase" });
  if (!token) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  console.log("token: ", token);

  const supabase = await getSupabaseServer(token);
  const { data, error } = await supabase.from("Users").select("*").limit(1).maybeSingle();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ text: data?.first_name ?? "(no message)" });
}
