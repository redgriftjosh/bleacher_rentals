"use client";

import { Button } from "@/components/ui/button";
import { SignOutButton } from "@clerk/nextjs";
import { Apple, LogOut } from "lucide-react";

function AppStoreBadge() {
  return (
    <a
      href="https://apps.apple.com/us/app/bleacher-rentals-driver/id6755205570"
      target="_blank"
      rel="noreferrer"
      className="group flex items-center gap-3 rounded-xl bg-black px-5 py-3 text-left text-white shadow-md transition hover:bg-black/90 hover:shadow-lg active:scale-[0.99]"
      aria-label="Download on the App Store"
    >
      <span className="grid h-10 w-10 place-items-center rounded-lg bg-white/10 ring-1 ring-white/15">
        <Apple className="h-6 w-6" />
      </span>
      <span className="flex flex-col leading-none">
        <span className="text-[11px] text-white/80">Download on the</span>
        <span className="text-base font-semibold tracking-tight">App Store</span>
      </span>
    </a>
  );
}

function GooglePlayBadge() {
  const APKUrl =
    "https://play.google.com/store/apps/details?id=com.bleacherrentals.driver&pcampaignid=web_share";

  return (
    <a
      href={APKUrl}
      target="_blank"
      rel="noreferrer"
      className="group flex items-center gap-3 rounded-xl bg-gradient-to-br from-zinc-900 to-zinc-800 px-5 py-3 text-left text-white shadow-md ring-1 ring-black/10 transition hover:shadow-lg active:scale-[0.99]"
      aria-label="Get it on Google Play"
    >
      <span className="grid h-10 w-10 place-items-center rounded-lg bg-white/10 ring-1 ring-white/15">
        <svg viewBox="0 0 512 512" className="h-6 w-6" aria-hidden="true">
          <path d="M48 48c-9 9-14 22-14 38v340c0 16 5 29 14 38l196-208L48 48z" fill="#00d2ff" />
          <path d="M270 256l57-60L86 60l184 196z" fill="#00e676" />
          <path d="M270 256l57 60L86 452l184-196z" fill="#ffea00" />
          <path
            d="M486 256c0-12-6-23-17-29l-95-55-62 84 62 84 95-55c11-6 17-17 17-29z"
            fill="#ff3d00"
          />
        </svg>
      </span>
      <span className="flex flex-col leading-none">
        <span className="text-[11px] text-white/80">Get it on</span>
        <span className="text-base font-semibold tracking-tight">Google Play</span>
      </span>
    </a>
  );
}

export function DriverWelcome() {
  return (
    <div className="flex flex-col items-center justify-center min-h-screen text-center bg-gradient-to-br from-gray-50 to-gray-100 p-6">
      <div className="max-w-2xl bg-white rounded-lg shadow-xl p-8 md:p-12">
        {/* Icon */}
        {/* <div className="mb-6 flex justify-center">
          <div className="bg-greenAccent/10 p-4 rounded-full">
            <Smartphone className="h-16 w-16 text-greenAccent" />
          </div>
        </div> */}

        {/* Welcome Message */}
        <h1 className="text-3xl md:text-4xl font-bold text-darkBlue mb-4">Welcome, Driver!</h1>
        <p className="text-lg text-gray-600 mb-6">
          Thanks for being part of the Bleacher Rentals team!
        </p>

        {/* Instructions */}
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-6 mb-8">
          <p className="text-gray-700 mb-4">
            The admin dashboard is for office staff only. As a driver, you'll use our{" "}
            <span className="font-semibold text-darkBlue">mobile app</span> to manage your work
            trackers and daily tasks.
          </p>
          <p className="text-gray-700 font-medium">
            Download the app below and sign in with the same email and password you just used.
          </p>
        </div>

        {/* App Store Buttons */}
        <div className="mb-8 flex flex-col items-center">
          <p className="text-sm text-gray-500 mb-4 font-medium">Download the Driver App:</p>
          <div className="flex flex-col gap-3 sm:flex-row">
            <AppStoreBadge />
            <GooglePlayBadge />
          </div>

          <p className="mt-3 text-xs text-gray-500">
            Having trouble? Try opening the links in a new tab.
          </p>
        </div>

        {/* Coming Soon Notice */}
        {/* <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-6">
          <p className="text-sm text-yellow-800">
            📱 <span className="font-semibold">Coming Soon:</span> The mobile app is currently in
            development. Check back soon!
          </p>
        </div> */}

        {/* Sign Out Button */}
        <SignOutButton>
          <Button variant="outline" className="gap-2">
            <LogOut className="h-4 w-4" />
            Sign Out
          </Button>
        </SignOutButton>

        {/* Support */}
        <p className="text-sm text-gray-500 mt-6">
          Need help?{" "}
          <a href="mailto:josh@bleacherrentals.com" className="text-greenAccent hover:underline">
            Contact Support
          </a>
        </p>
      </div>
    </div>
  );
}
