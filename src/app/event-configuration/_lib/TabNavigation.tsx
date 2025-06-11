"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
export const tabs = [
  {
    id: "requirements",
    label: "Requirements",
    path: "/event-configuration/requirements",
    description:
      'This section defines what is required by the event. Think of it as defining "Rules" and if any of these rules are broken in the "Activities" tab, then an Alert will notify you.',
  },
  {
    id: "activities",
    label: "Activities",
    path: "/event-configuration/activities",
    description:
      "This section defines what we're choosing to do for this event. If any of the requirements are not met, then an Alert will notify you.",
  },
  {
    id: "alerts",
    label: "Alerts",
    path: "/event-configuration/alerts",
    description: "Configure the requirements for the event.",
  },
];

export default function TabNavigation() {
  const pathname = usePathname(); // Get current URL path

  return (
    <div className="flex justify-start mb-2">
      <div className="flex border border-gray-300 bg-gray-100 rounded overflow-hidden">
        {tabs.map((tab) => (
          <Link
            key={tab.id}
            href={tab.path}
            className={`px-4 py-2 text-sm font-semibold transition ${
              pathname === tab.path
                ? "bg-darkBlue text-white"
                : "bg-gray-100 text-gray-600 hover:bg-gray-200"
            }`}
          >
            {tab.label}
          </Link>
        ))}
      </div>
    </div>
  );
}
