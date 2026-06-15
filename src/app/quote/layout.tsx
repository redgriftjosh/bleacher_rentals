import { Dancing_Script } from "next/font/google";

const dancingScript = Dancing_Script({
  subsets: ["latin"],
  variable: "--font-dancing-script",
});

export default function QuotePublicLayout({ children }: { children: React.ReactNode }) {
  return <div className={dancingScript.variable}>{children}</div>;
}
