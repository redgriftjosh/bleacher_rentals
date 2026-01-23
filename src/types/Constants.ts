export const UNAUTHENTICATED_ROUTES = [
  "/login",
  "/forgot-password",
  "/reset-password",
  "/create-account",
];
export const AUTHENTICATED_ROUTES = [
  "/old-dashboard",
  "/events-dashboard",
  "/team",
  "/assets",
  "/assets/bleachers",
  "/assets/other-assets",
  "/assets/bleachers/edit",
  "/testing",
];

export const USER_ROLES = {
  ADMIN: 2,
  ACCOUNT_MANAGER: 1,
  DRIVER: 3,
} as const;

export type UserRoleKey = keyof typeof USER_ROLES;
export type UserRoleValue = (typeof USER_ROLES)[UserRoleKey];

// How many rows are available for bleachers?
export const ROW_OPTIONS = [4, 7, 8, 9, 10, 15];
export const ROW_OPTIONS_STR = ["4", "7", "8", "9", "10", "15"];
export const STATES = [
  "Alabama",
  "Alaska",
  "Arizona",
  "Arkansas",
  "California",
  "Colorado",
  "Connecticut",
  "Delaware",
  "Florida",
  "Georgia",
  "Hawaii",
  "Idaho",
  "Illinois",
  "Indiana",
  "Iowa",
  "Kansas",
  "Kentucky",
  "Louisiana",
  "Maine",
  "Maryland",
  "Massachusetts",
  "Michigan",
  "Minnesota",
  "Mississippi",
  "Missouri",
  "Montana",
  "Nebraska",
  "Nevada",
  "New Hampshire",
  "New Jersey",
  "New Mexico",
  "New York",
  "North Carolina",
  "North Dakota",
  "Ohio",
  "Oklahoma",
  "Oregon",
  "Pennsylvania",
  "Rhode Island",
  "South Carolina",
  "South Dakota",
  "Tennessee",
  "Texas",
  "Utah",
  "Vermont",
  "Virginia",
  "Washington",
  "West Virginia",
  "Wisconsin",
  "Wyoming",
];
export const PROVINCES = [
  "Alberta",
  "British Columbia",
  "Manitoba",
  "New Brunswick",
  "Newfoundland and Labrador",
  "Nova Scotia",
  "Ontario",
  "Prince Edward Island",
  "Quebec",
  "Saskatchewan",
  "Northwest Territories",
  "Nunavut",
  "Yukon",
];

export const setupTeardownHsl = "hsl(54, 90%, 60%)";
export const confirmedHsl = "hsl(0, 0%, 80%)";
