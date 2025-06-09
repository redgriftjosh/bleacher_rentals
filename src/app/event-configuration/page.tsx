import { redirect } from "next/navigation";

export default function EventConfigurationPage() {
  redirect("/event-configuration/requirements");
  return null; // This page is never displayed, it just redirects
}
