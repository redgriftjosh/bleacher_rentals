import { BleachersResponse } from "@/app/api/dashboard/bleachers/route";

type Bleacher = { bleacher_number: number };

export async function fetchBleachers(): Promise<Bleacher[]> {
  const res = await fetch("/api/dashboard/bleachers", { cache: "no-store" });
  console.log("Feched bleachers, server:", res);
  const json = (await res.json()) as BleachersResponse;
  if (!res.ok) throw new Error((json as any)?.error ?? res.statusText);
  return (json.bleachers ?? []) as Bleacher[];
}
