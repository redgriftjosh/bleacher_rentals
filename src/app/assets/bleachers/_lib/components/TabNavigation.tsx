"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
const tabs = [
  { id: "bleachers", label: "Bleachers", path: "/assets/bleachers" },
  { id: "other-assets", label: "Other Assets", path: "/assets/other-assets" },
];

export default function TabNavigation() {
  const pathname = usePathname(); // Get current URL path

  return (
    <div className="flex justify-start mb-6">
      <div className="flex border border-gray-300 bg-gray-100 rounded-lg overflow-hidden">
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
