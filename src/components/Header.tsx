"use client";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { UserButton } from "@clerk/nextjs";
import { Code, Laptop, Lightbulb, List } from "lucide-react";
import { AlertsDropDown } from "@/features/alerts/components/AlertsDropDown";

const Header = () => {
  const router = useRouter();
  const environment = process.env.NEXT_PUBLIC_ENVIRONMENT;

  const getEnvironmentConfig = () => {
    if (environment === "development") {
      return {
        show: true,
        bgColor: "bg-green-700",
        message: "Development - Changes won't affect production data",
      };
    } else if (environment === "staging") {
      return {
        show: true,
        bgColor: "bg-red-700",
        message: "Staging - Changes won't affect production data",
      };
    }
    return { show: false, bgColor: "", message: "" };
  };

  const envConfig = getEnvironmentConfig();

  return (
    <>
      {envConfig.show && (
        <div
          className={`${envConfig.bgColor} text-white text-center py-1 px-4 text-sm font-medium`}
        >
          {envConfig.message}
        </div>
      )}
      <header className="bg-darkBlue text-white py-2 px-2 shadow-md">
        <div className="flex justify-between items-center">
          {/* <p className="text-2xl font-bold ml-6">Bleacher Rentals</p> */}
          <Image
            className="ml-2"
            src="/logo.png"
            alt="Bleacher Rentals Logo"
            width={120} // Adjust width as needed
            height={40} // Adjust height as needed
            priority // Optimized for faster loading
          />
          <div className="flex items-center mr-2 relative">
            <div className="flex items-center  mr-4">
              <button
                className="flex text-white/70 items-center gap-1 rounded py-1 ml-2 text-sm hover:font-bold hover:underline hover:text-white cursor-pointer transition-all duration-300"
                onClick={() => router.push("/roadmap")}
              >
                <Lightbulb size={20} />
                Request a Feature
              </button>
            </div>
            <div className="mr-3">
              <AlertsDropDown />
            </div>
            <UserButton />
          </div>
        </div>
      </header>
    </>
  );
};

export default Header;
