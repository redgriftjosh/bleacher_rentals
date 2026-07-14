import {
  LayoutDashboard,
  FileText,
  Users,
  Truck,
  ClipboardList,
  BarChart3,
  Trophy,
  CalendarDays,
  ClipboardCheck,
  MapPinned,
  ShieldAlert,
  ShieldCheck,
  BookText,
  Settings,
  Building2,
  ScrollText,
  DollarSign,
  BookUser,
  Warehouse,
  MessageSquare,
} from "lucide-react";
import { QuickBooksIcon } from "@/components/Icons";
import type { WebRole } from "@/features/userAccess/logic/determineAccess";

type SidebarButtonItem = {
  type: "button";
  key: string;
  label: string;
  href: string;
  icon: React.ComponentType<any>;
};

type SidebarDropdownItem = {
  type: "dropdown";
  key: string;
  label: string;
  icon: React.ComponentType<any>;
  children: { label: string; href: string }[];
};

type SidebarSectionItem = {
  type: "section";
  key: string;
  label: string;
  icon: React.ComponentType<any>;
  children: SidebarItemConfig[];
};

export type SidebarItemConfig = SidebarButtonItem | SidebarDropdownItem | SidebarSectionItem;

const ALL_ITEMS: SidebarItemConfig[] = [
  {
    type: "button",
    key: "dashboard",
    label: "Dashboard",
    href: "/dashboard",
    icon: LayoutDashboard,
  },
  {
    type: "button",
    key: "quotes-bookings",
    label: "Quotes & Bookings",
    href: "/quotes-bookings",
    icon: FileText,
  },
  {
    type: "button",
    key: "team",
    label: "Team",
    href: "/team",
    icon: Users,
  },
  {
    type: "button",
    key: "assets",
    label: "Assets",
    href: "/assets",
    icon: Truck,
  },
  {
    type: "dropdown",
    key: "quality-assurance",
    label: "Quality Assurance",
    icon: ShieldAlert,
    children: [
      { label: "Damage Reports", href: "/damage-reports" },
      { label: "Inspections", href: "/inspections" },
      { label: "Repairs", href: "/repairs" },
    ],
  },
  {
    type: "button",
    key: "work-trackers",
    label: "Work Trackers",
    href: "/work-trackers",
    icon: ClipboardList,
  },
  {
    type: "dropdown",
    key: "scorecard",
    label: "Scorecard",
    icon: BarChart3,
    children: [
      { label: "Sales Scorecard", href: "/scorecard" },
      { label: "Driver Scorecard", href: "/driver-scorecard" },
    ],
  },
  {
    type: "button",
    key: "leaderboard",
    label: "Leaderboard",
    href: "/leaderboard",
    icon: Trophy,
  },
  {
    type: "button",
    key: "driver-calendar",
    label: "Driver Calendar",
    href: "/driver-calendar",
    icon: CalendarDays,
  },
  {
    type: "dropdown",
    key: "messages",
    label: "Messages",
    icon: MessageSquare,
    children: [
      { label: "Internal", href: "/messages/internal" },
      { label: "External", href: "/messages/external" },
    ],
  },
  {
    type: "button",
    key: "companies-contacts",
    label: "Companies & Contacts",
    href: "/companies-contacts",
    icon: BookUser,
  },
  {
    type: "section",
    key: "configuration",
    label: "Configuration",
    icon: Settings,
    children: [
      {
        type: "button",
        key: "zones",
        label: "Zone Manager",
        href: "/zones",
        icon: MapPinned,
      },
      {
        type: "button",
        key: "inspection-questions",
        label: "Inspection Form",
        href: "/inspection-questions",
        icon: ClipboardCheck,
      },
      {
        type: "button",
        key: "quickbooks",
        label: "QuickBooks",
        href: "/quickbooks",
        icon: QuickBooksIcon,
      },
      {
        type: "button",
        key: "pricing-matrix",
        label: "Pricing Matrix",
        href: "/pricing-matrix",
        icon: DollarSign,
      },
      {
        type: "button",
        key: "terms-and-conditions",
        label: "Terms & Conditions",
        href: "/terms-and-conditions",
        icon: ScrollText,
      },
      {
        type: "button",
        key: "sales-offices",
        label: "Sales Offices",
        href: "/sales-offices",
        icon: Building2,
      },
      {
        type: "button",
        key: "storage-locations",
        label: "Storage Locations",
        href: "/storage-locations",
        icon: Warehouse,
      },
    ],
  },

  {
    type: "section",
    key: "documentation",
    label: "Documentation",
    icon: BookText,
    children: [
      {
        type: "button",
        key: "permissions",
        label: "Role Permissions",
        href: "/permissions",
        icon: ShieldCheck,
      },
    ],
  },
];

const ROLE_SIDEBAR_KEYS: Record<WebRole, string[]> = {
  admin: [
    "dashboard",
    "quotes-bookings",
    "messages",
    "companies-contacts",
    "sales-offices",
    "team",
    "assets",
    "quality-assurance",
    "work-trackers",
    "scorecard",
    "leaderboard",
    "driver-calendar",
    "configuration",
    "documentation",
  ],
  account_manager: [
    "dashboard",
    "quotes-bookings",
    "messages",
    "companies-contacts",
    "sales-offices",
    "team",
    "assets",
    "quality-assurance",
    "work-trackers",
    "scorecard",
    "leaderboard",
    "driver-calendar",
    "documentation",
  ],
  developer: ["roadmap"],
  viewer: [
    "dashboard",
    "quotes-bookings",
    "sales-offices",
    "team",
    "assets",
    "quality-assurance",
    "work-trackers",
    "scorecard",
    "leaderboard",
    "driver-calendar",
    "documentation",
  ],
  driver: [],
};

export function useSidebarItems(roles: WebRole[]): SidebarItemConfig[] {
  const keySet = new Set<string>();
  for (const role of roles) {
    for (const key of ROLE_SIDEBAR_KEYS[role]) {
      keySet.add(key);
    }
  }
  return ALL_ITEMS.filter((item) => keySet.has(item.key));
}
