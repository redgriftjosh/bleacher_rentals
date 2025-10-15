import { getSupabaseServer } from "@/utils/supabase/getSupabaseServer";
import { auth } from "@clerk/nextjs/server";
import { NextRequest, NextResponse } from "next/server";
import { Tables } from "../../../../../database.types";

type Bleacher = Pick<Tables<"Bleachers">, "bleacher_number">;
export type BleachersResponse = { bleachers: Bleacher[] };

export async function GET(req: NextRequest) {
  const { userId, getToken } = await auth();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const token = await getToken({ template: "supabase" });
  if (!token) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const supabase = await getSupabaseServer(token);
  const { data, error } = await supabase
    .from("Bleachers")
    .select("bleacher_number")
    .overrideTypes<Bleacher[], { merge: false }>();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ bleachers: data ?? [] } satisfies BleachersResponse);
}
