"use client";
import { SignOutButton } from "@clerk/nextjs";
import { Button } from "./ui/button";
import { AppStoreButton, GooglePlayButton, ButtonsContainer } from "react-mobile-app-button";
import { Smartphone, LogOut } from "lucide-react";

export function DriverWelcome() {
  const APKUrl =
    "https://play.google.com/store/apps/details?id=com.bleacherrentals.driver&pcampaignid=web_share";
  const iOSUrl = "https://apps.apple.com/us/app/your-app-name/id123456789";

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
        <h1 className="text-3xl md:text-4xl font-bold text-darkBlue mb-4">Welcome, Driver! 👋</h1>
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
          <ButtonsContainer>
            <AppStoreButton url={iOSUrl} theme="dark" height={60} width={200} />
            <GooglePlayButton url={APKUrl} theme="dark" height={60} width={200} />
          </ButtonsContainer>
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
          <a href="mailto:support@bleacherrentals.com" className="text-greenAccent hover:underline">
            Contact Support
          </a>
        </p>
      </div>
    </div>
  );
}
