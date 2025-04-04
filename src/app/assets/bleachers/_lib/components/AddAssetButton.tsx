"use client";
import { useRouter } from "next/navigation";

export default function AddAssetButton() {
  const router = useRouter();

  return (
    <button
      onClick={() => router.push("/assets/bleachers/edit")} // 🔥 Redirect to Add Asset Page
      className="px-4 py-2 bg-darkBlue text-white text-sm font-semibold rounded-lg shadow-md hover:bg-lightBlue transition cursor-pointer"
      data-testid="add-bleacher-button"
    >
      + Add New Asset
    </button>
  );
}
