import { redirect } from "next/navigation";

export default function AssetsPage() {
  redirect("/assets/bleachers");
  return null; // This page is never displayed, it just redirects
}
