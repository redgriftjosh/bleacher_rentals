"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";

type SideNavButtonProps = {
  label: string;
  href: string;
  icon: React.ComponentType<any>;
};

export const SideNavButton = ({ label, href, icon: Icon }: SideNavButtonProps) => {
  const pathname = usePathname();
  const isSelected = pathname.startsWith(href);

  return (
    <Link
      href={href}
      prefetch={true}
      className={`flex items-center text-base px-4 py-1 rounded m-1 space-x-3 ${
        isSelected ? " font-medium text-darkBlue bg-gray-200" : "text-gray-500 hover:bg-gray-200"
      }`}
    >
      <Icon className="h-4 w-4" />
      <span>{label}</span>
    </Link>
  );
};
