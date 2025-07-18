"use client";
import Image from "next/image";
import { useState } from "react";
import { useRouter } from "next/navigation";
// import { useAuth } from "@/contexts/authContext";
import { UserButton } from "@clerk/nextjs";
import { BellIcon } from "./Icons";
import { Code, Laptop, Lightbulb, List } from "lucide-react";

const Header = () => {
  const [isDropdownOpen, setDropdownOpen] = useState(false);
  const router = useRouter();

  // Mock user data (Replace with real authentication data)
  const user = {
    firstName: "Josh",
    lastName: "Redgrift",
    email: "redgriftjosh@gmail.com",
    profileImage: "/defaultProfile.jpg", // Ensure this image is in the `public/` folder
  };

  //   const { isAuthenticated, setIsAuthenticated } = useAuth();

  const handleSignOut = async () => {
    // try {
    //   // setErrorMessage("Incorrect username or password.asdaa");
    //   const response = await signOut();
    //   // console.log("Logged in user:", response);
    //   setIsAuthenticated(false);
    //   router.push("/login");
    // } catch (err: any) {
    //   console.error("Login error:", err);
    // }
  };

  //   if (!isAuthenticated) return null;

  return (
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
          <UserButton />
          {isDropdownOpen && (
            <div className="absolute top-full right-0 mt-2 w-64 bg-white text-black rounded-lg shadow-lg p-4 z-50">
              {/* User Info */}
              <p className="text-center font-semibold text-lg">
                {user.firstName} {user.lastName}
              </p>
              <p className="text-center text-gray-500 text-sm">{user.email}</p>

              {/* Logout Button */}
              <button
                className="w-full mt-4 bg-red-500 hover:bg-red-600 text-white py-2 rounded-lg"
                onClick={handleSignOut}
              >
                Logout
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
};

export default Header;
