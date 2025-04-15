// "use client";
// import {
//   apiCreateBleacher,
//   apiGetBleacherById,
//   apiUpdateBleacher,
// } from "@/functions/api/bleachers";
// import { useRouter, useSearchParams } from "next/navigation";
// import { useEffect, useCallback, useState } from "react";
// import SelectHomeBaseDropDown from "./dropdowns/selectHomeBaseDropDown";
// import SelectRowsDropDown from "./dropdowns/selectRowsDropDown";
// import { apiListAllHomeBases } from "./api";
// // import SelectHomeBaseDropDown from "./selectHomeBaseDropDown";

// interface Bleacher {
//   bleacher_number: number;
//   rows: number;
//   seats: number;
//   home_base_id: number;
//   winter_home_base_id: number;
//   model_number: string;
//   license_number: string;
//   license_expiration: string;
//   safety_expiration: string;
// }

// interface HomeBase {
//   homeBaseId: number;
//   homeBaseName: string;
// }

// export default function EditBleacherPage() {
//   const router = useRouter();
//   const searchParams = useSearchParams();
//   const bleacherId = searchParams.get("id") ? Number(searchParams.get("id")) : null;

//   // Form State
//   const [bleacherNumber, setBleacherNumber] = useState<number | null>(null);
//   const [rows, setRows] = useState<number | null>(null);
//   const [seats, setSeats] = useState<number | null>(null);
//   const [homeBases, setHomeBases] = useState<HomeBase[] | null>(null);
//   const [selectedHomeBaseId, setSelectedHomeBaseId] = useState<number | null>(null);
//   const [selectedWinterHomeBaseId, setSelectedWinterHomeBaseId] = useState<number | null>(null);
//   const [modelNumber, setModelNumber] = useState("");
//   const [licenseNumber, setLicenseNumber] = useState("");
//   const [licenseExpiration, setLicenseExpiration] = useState("");
//   const [safetyExpiration, setSafetyExpiration] = useState("");

//   // UI State
//   const [loading, setLoading] = useState(false);
//   const [error, setError] = useState<string | null>(null);
//   const [success, setSuccess] = useState<boolean>(false);

//   useEffect(() => {
//     if (bleacherId !== null) {
//       fetchBleacher();
//     }
//     fetchHomeBases();
//   }, [bleacherId]);

//   async function fetchBleacher() {
//     setLoading(true);
//     try {
//       const bleachers = (await apiGetBleacherById(bleacherId!)) as Bleacher[];
//       const bleacher = bleachers[0];
//       console.log("apiGetBleacherById: ", bleacher);
//       setBleacherNumber(bleacher.bleacher_number);
//       setRows(bleacher.rows);
//       setSeats(bleacher.seats);
//       setSelectedHomeBaseId(bleacher.home_base_id);
//       setSelectedWinterHomeBaseId(bleacher.winter_home_base_id);
//       setModelNumber(bleacher.model_number);
//       setLicenseNumber(bleacher.license_number);
//       setLicenseExpiration(bleacher.license_expiration);
//       setSafetyExpiration(bleacher.safety_expiration);
//     } catch (err) {
//       console.error("Error loading bleacher:", err);
//       setError("Could not load bleacher.");
//     }
//     setLoading(false);
//   }

//   async function fetchHomeBases() {
//     try {
//       const result = (await apiListAllHomeBases()) as HomeBase[];

//       setHomeBases(result);
//     } catch (error) {
//       console.error("Error fetching home bases:", error);
//     }
//   }

//   // Handle Form Submission
//   const handleSubmit = async (event: React.FormEvent) => {
//     event.preventDefault();
//     setLoading(true);
//     setError(null);
//     setSuccess(false);

//     try {
//       if (bleacherId) {
//         if (
//           bleacherNumber !== null &&
//           rows !== null &&
//           seats !== null &&
//           selectedHomeBaseId !== null &&
//           selectedWinterHomeBaseId !== null
//         ) {
//           await apiUpdateBleacher(
//             bleacherId,
//             bleacherNumber,
//             rows,
//             seats,
//             selectedHomeBaseId,
//             selectedWinterHomeBaseId,
//             modelNumber,
//             licenseNumber,
//             licenseExpiration,
//             safetyExpiration,
//           );
//         }
//       } else {
//         // Create new bleacher
//         if (
//           bleacherNumber !== null &&
//           rows !== null &&
//           seats !== null &&
//           selectedHomeBaseId !== null &&
//           selectedWinterHomeBaseId !== null
//         ) {
//           await apiCreateBleacher(
//             bleacherNumber,
//             rows,
//             seats,
//             selectedHomeBaseId,
//             selectedWinterHomeBaseId,
//             modelNumber,
//             licenseNumber,
//             licenseExpiration,
//             safetyExpiration,
//           );
//         }
//       }

//       setSuccess(true);
//       setTimeout(() => router.back(), 1000); // Close modal after success
//     } catch (err) {
//       console.error("Error saving bleacher:", err);
//       setError("There was an issue saving the bleacher...");
//     } finally {
//       setLoading(false);
//     }
//   };

//   const inputStyle = "w-full border border-gray-300 px-2 py-1 p-2 rounded-md";

//   return (
//     <div className="fixed inset-0 bg-white flex items-center justify-center z-50 p-8">
//       <div className="w-full max-w-xl p-8 rounded-lg relative">
//         <h2 className="text-2xl font-semibold text-darkBlue mb-6">
//           {bleacherId !== null ? "Edit Bleacher" : "Add New Bleacher"}
//         </h2>

//         {/* Close Button */}
//         <button
//           onClick={() => router.back()}
//           className="absolute top-4 right-4 text-gray-500 text-xl hover:text-gray-700"
//         >
//           ✕
//         </button>

//         {/* Error Message */}
//         {error && <p className="text-red-500 mb-4">{error}</p>}

//         {/* Success Message */}
//         {success && <p className="text-green-500 mb-4">Bleacher saved successfully!</p>}

//         {/* Form */}
//         <form onSubmit={handleSubmit} className="space-y-6">
//           <div className="flex gap-4">
//             {/* Bleacher Number */}
//             <div className="flex-1">
//               <label className="block text-gray-700">Bleacher Number</label>
//               <input
//                 type="number"
//                 step="1"
//                 value={bleacherNumber ?? ""}
//                 onChange={(e) => setBleacherNumber(Number(e.target.value))}
//                 className={inputStyle}
//                 required
//                 data-testid="bleacher-number"
//               />
//             </div>

//             {/* Seats */}
//             <div className="flex-1">
//               <label className="block text-gray-700">Seats</label>
//               <input
//                 type="number"
//                 step="1"
//                 value={seats ?? ""}
//                 onChange={(e) => setSeats(Number(e.target.value))} // Set seats to the value of this number
//                 className={inputStyle}
//                 required
//                 data-testid="bleacher-number"
//               />
//             </div>
//             <div className="flex-1">
//               <div className="flex-col">
//                 <label className="block text-gray-700">Rows</label>
//                 <SelectRowsDropDown
//                   onSelect={(e) => setRows(Number(e))}
//                   value={rows ?? undefined}
//                 />
//               </div>
//             </div>
//           </div>
//           <div className="flex gap-4">
//             {/* Model Number */}
//             <div className="flex-1">
//               <label className="block text-gray-700">Model Number</label>
//               <input
//                 type="text"
//                 value={modelNumber}
//                 onChange={(e) => setModelNumber(e.target.value)}
//                 className={inputStyle}
//                 required
//                 data-testid="bleacher-model"
//               />
//             </div>

//             {/* License Number */}
//             <div className="flex-1">
//               <label className="block text-gray-700">License Number</label>
//               <input
//                 type="text"
//                 value={licenseNumber}
//                 onChange={(e) => setLicenseNumber(e.target.value)}
//                 className={inputStyle}
//                 required
//                 data-testid="bleacher-license"
//               />
//             </div>
//           </div>

//           <div className="flex gap-4">
//             {/* License Renewal Date */}
//             <div className="flex-1">
//               <label className="block text-gray-700">License Expiration</label>
//               <input
//                 type="date"
//                 value={licenseExpiration}
//                 onChange={(e) => setLicenseExpiration(e.target.value)}
//                 className={inputStyle}
//                 required
//                 data-testid="license-expiry"
//               />
//             </div>

//             {/* Safety Renewal Date */}
//             <div className="flex-1">
//               <label className="block text-gray-700">Safety Expiration</label>
//               <input
//                 type="date"
//                 value={safetyExpiration}
//                 onChange={(e) => setSafetyExpiration(e.target.value)}
//                 className={inputStyle}
//                 required
//                 data-testid="safety-expiry"
//               />
//             </div>
//           </div>
//           <div className="flex gap-4">
//             <SelectHomeBaseDropDown
//               options={homeBases ?? []} // Add your home base options here
//               onSelect={(e) => setSelectedHomeBaseId(Number(e.homeBaseId))}
//               placeholder="Select Home Base"
//               value={selectedHomeBaseId ?? undefined}
//             />
//             <SelectHomeBaseDropDown
//               options={homeBases ?? []} // Add your home base options here
//               onSelect={(e) => setSelectedWinterHomeBaseId(Number(e.homeBaseId))}
//               placeholder="Select Winter Home Base"
//               value={selectedWinterHomeBaseId ?? undefined}
//             />
//           </div>

//           {/* Save Button */}
//           <button
//             type="submit"
//             data-testid="save-bleacher-button"
//             disabled={loading}
//             className={`w-full bg-darkBlue text-white p-3 rounded-lg hover:bg-lightBlue transition ${loading ? "opacity-50 cursor-not-allowed" : ""}`}
//           >
//             {loading ? "Saving..." : "Save Changes"}
//           </button>
//         </form>
//       </div>
//     </div>
//   );
// }
