import { useHomeBasesStore } from "@/state/homeBaseStore";
import { SelectHomeBase } from "@/types/tables/HomeBases";
import { redirect } from "next/navigation";

/**
 * Redirects to a specified path with an encoded message as a query parameter.
 * @param {('error' | 'success')} type - The type of message, either 'error' or 'success'.
 * @param {string} path - The path to redirect to.
 * @param {string} message - The message to be encoded and added as a query parameter.
 * @returns {never} This function doesn't return as it triggers a redirect.
 */
export function encodedRedirect(type: "error" | "success", path: string, message: string) {
  return redirect(`${path}?${type}=${encodeURIComponent(message)}`);
}

export function getHomeBaseIdByName(name: string): number | null {
  const homeBases = useHomeBasesStore.getState().homeBases;

  const match = homeBases.find(
    (hb) => hb.home_base_name.trim().toLowerCase() === name.trim().toLowerCase()
  );

  return match?.home_base_id ?? null;
}

export function getHomeBaseOptions() {
  const homeBases = useHomeBasesStore((s) => s.homeBases) as SelectHomeBase[];

  return homeBases.map((homeBase) => ({
    value: homeBase.home_base_id,
    label: homeBase.home_base_name,
  }));
}
