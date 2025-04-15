import type { Metadata, NextPage } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { ClerkProvider, SignedIn, SignedOut, SignIn, UserButton } from "@clerk/nextjs";
import Script from "next/script";
import { SignedInComponents } from "../components/SignedInComponents";
import { ReactElement, ReactNode } from "react";
import { AppProps } from "next/app";
import { Toaster } from "sonner";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Bleacher Rentals Admin",
  description:
    "This application is an internal tool for Bleacher Rentals to manage their customers and logistics.",
  icons: {
    icon: "/favicon.png",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <ClerkProvider>
      <html lang="en">
        <body className={`${geistSans.variable} ${geistMono.variable} antialiased overflow-hidden`}>
          <SignedOut>
            <div className="flex items-center justify-center min-h-screen">
              <SignIn routing="hash" afterSignInUrl="/bleachers-dashboard" />
            </div>
          </SignedOut>
          <Script
            src={`https://maps.googleapis.com/maps/api/js?key=${process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY}&libraries=places`}
            strategy="beforeInteractive"
          />
          <SignedIn>
            <Toaster />
            <SignedInComponents>{children}</SignedInComponents>
          </SignedIn>
        </body>
      </html>
    </ClerkProvider>
  );
}
