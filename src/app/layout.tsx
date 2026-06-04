import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { ClerkProvider } from "@clerk/nextjs";
import { auth } from "@clerk/nextjs/server";
import { AuthFallback } from "@/components/AuthFallback";
import Script from "next/script";
import { SignedInComponents } from "../components/SignedInComponents";
import { Toaster } from "sonner";
import { TanstackProvider } from "@/components/providers/TanstackProvider";
import { DynamicSystemProvider } from "@/components/providers/DynamicSystemProvider";

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

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const { userId } = await auth();

  return (
    <ClerkProvider>
      <html lang="en">
        <body className={`${geistSans.variable} ${geistMono.variable} antialiased overflow-hidden`}>
          {userId ? (
            <>
              <Script
                src={`https://maps.googleapis.com/maps/api/js?key=${process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY}&libraries=places`}
                strategy="beforeInteractive"
              />
              <Toaster />
              <TanstackProvider>
                <DynamicSystemProvider>
                  <SignedInComponents>{children}</SignedInComponents>
                </DynamicSystemProvider>
              </TanstackProvider>
            </>
          ) : (
            <AuthFallback>{children}</AuthFallback>
          )}
        </body>
      </html>
    </ClerkProvider>
  );
}

