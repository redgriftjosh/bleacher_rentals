// import { useState, useEffect } from "react";
// import { Bleacher } from "../functions";
// import AddressAutocomplete from "../../../_lib/_components/AddressAutoComplete";
// import { createUpdateEvent, deleteEvent, fetchEventById } from "@/app/(dashboards)/_lib/functions";

// interface AddEventModalProps {
//   isOpen: boolean;
//   onClose: () => void;
//   onSuccess?: () => void;
//   bleachers: Bleacher[] | null;
//   eventId: number | null;
// }

// export default function AddEventModal({
//   isOpen,
//   onClose,
//   onSuccess,
//   bleachers,
//   eventId,
// }: AddEventModalProps) {
//   const [eventName, setEventName] = useState("");
//   const [loading, setLoading] = useState(false);
//   const [error, setError] = useState<string | null>(null);
//   const [addressData, setAddressData] = useState<{
//     address: string;
//     city?: string;
//     state?: string;
//     postalCode?: string;
//   } | null>(null);
//   const [selectedBleachers, setSelectedBleachers] = useState<number[]>([]);
//   const [filteredBleachers, setFilteredBleachers] = useState<Bleacher[] | null>(bleachers);
//   const [lenient, setLenient] = useState(false);
//   const [showTooltip, setShowTooltip] = useState(false);
//   const [rows, setRows] = useState(0);
//   const [bleacherCount, setBleacherCount] = useState(0);
//   const [seats, setSeats] = useState(0);
//   const [canStoreBefore, setCanStoreBefore] = useState(false);
//   const [canStoreAfter, setCanStoreAfter] = useState(false);

//   // All the date range inputs
//   const [eventStart, setEventStart] = useState("");
//   const [eventEnd, setEventEnd] = useState("");
//   const [setupStart, setSetupStart] = useState("");
//   const [setupEnd, setSetupEnd] = useState("");
//   const [teardownStart, setTeardownStart] = useState("");
//   const [teardownEnd, setTeardownEnd] = useState("");
//   const [storeBeforeStart, setStoreBeforeStart] = useState<string | null>(null);
//   const [storeBeforeEnd, setStoreBeforeEnd] = useState<string | null>(null);
//   const [storeAfterStart, setStoreAfterStart] = useState<string | null>(null);
//   const [storeAfterEnd, setStoreAfterEnd] = useState<string | null>(null);
//   const [loadedEventData, setLoadedEventData] = useState<any | null>(null);

//   useEffect(() => {
//     // console.log("eventId: ", eventId);
//     loadEvent();
//   }, [isOpen]);

//   useEffect(() => {
//     // Reset all states to defaults when modal closes
//     setEventName("");
//     setLoading(false);
//     setError(null);
//     setAddressData(null);
//     setSelectedBleachers([]);
//     setFilteredBleachers(bleachers);
//     setLenient(false);
//     setShowTooltip(false);
//     setRows(0);
//     setBleacherCount(0);
//     setSeats(0);
//     setCanStoreBefore(false);
//     setCanStoreAfter(false);

//     // Reset all date states
//     setEventStart("");
//     setEventEnd("");
//     setSetupStart("");
//     setSetupEnd("");
//     setTeardownStart("");
//     setTeardownEnd("");
//     setStoreBeforeStart(null);
//     setStoreBeforeEnd(null);
//     setStoreAfterStart(null);
//     setStoreAfterEnd(null);
//     setLoadedEventData(null);
//   }, [onClose]);

//   async function loadEvent() {
//     // set all states from the loadEventData
//     if (isOpen && eventId) {
//       const loadEventData = await fetchEventById(eventId);
//       // console.log("loadEventData: ", loadEventData);
//       setLoadedEventData(loadEventData);

//       setEventName(loadEventData.eventName || "");
//       setAddressData({
//         address: loadEventData.street,
//         city: loadEventData.city,
//         state: loadEventData.stateProvince,
//         postalCode: loadEventData.zipPostal,
//       });
//       setSelectedBleachers(loadEventData.selectedBleachers || []);
//       // setRows(loadEventData.rows);
//       // setBleacherCount(loadEventData.bleacherCount);
//       // setSeats(loadEventData.seats);
//       setEventStart(loadEventData.eventStart || "");
//       setEventEnd(loadEventData.eventEnd || "");
//       setSetupStart(loadEventData.setupStart || "");
//       setSetupEnd(loadEventData.setupEnd || "");
//       setTeardownStart(loadEventData.teardownStart || "");
//       setTeardownEnd(loadEventData.teardownEnd || "");
//       setStoreBeforeStart(loadEventData.storeBeforeStart || null);
//       setStoreBeforeEnd(loadEventData.storeBeforeEnd || null);
//       setStoreAfterStart(loadEventData.storeAfterStart || null);
//       setStoreAfterEnd(loadEventData.storeAfterEnd || null);
//       setRows(loadEventData.rowsPerBleacher || 0);
//       setBleacherCount(loadEventData.bleacherCount || 0);
//       setSeats(loadEventData.seatsTotal || 0);

//       if (loadEventData.storeBeforeStart) {
//         setCanStoreBefore(true);
//       }
//       if (loadEventData.storeAfterStart) {
//         setCanStoreAfter(true);
//       }
//       if (loadEventData.rowsPerBleacher && loadEventData.bleacherCount) {
//         setLenient(false);
//       } else {
//         setLenient(true);
//       }
//     }
//   }

//   useEffect(() => {
//     // console.log("addressData: ", addressData);
//     if (!bleachers) {
//       setFilteredBleachers(bleachers);
//       return;
//     }
//     let filtered = bleachers;
//     if (addressData !== null) {
//       filtered = bleachers.filter(
//         (bleacher) =>
//           bleacher.homeBase !== null &&
//           bleacher.homeBase.toLowerCase() === addressData.state?.toLowerCase(),
//       );
//     }

//     if (lenient == false && rows > 0) {
//       filtered = filtered.filter((bleacher) => bleacher.rows === rows);
//     }

//     setFilteredBleachers(filtered);

//     if (loadedEventData?.selectedBleachers) {
//       const validBleachers = loadedEventData.selectedBleachers.filter((id: number) =>
//         filtered.some((bleacher) => bleacher.bleacherId === id),
//       );
//       setSelectedBleachers(validBleachers);
//     }
//   }, [addressData?.state, bleachers, rows, loadedEventData]);

//   if (!isOpen) return null;

//   const handleSubmit = async (e: React.FormEvent) => {
//     e.preventDefault();
//     setLoading(true);
//     setError(null);

//     try {
//       // createEventMock();
//       await createUpdateEvent({
//         eventId: loadedEventData?.eventId,
//         addressId: loadedEventData?.addressId,
//         eventName,
//         address: {
//           street: addressData?.address ?? "",
//           city: addressData?.city ?? "",
//           stateProvince: addressData?.state ?? "",
//           zipPostal: addressData?.postalCode ?? "",
//         },
//         bleacherIds: selectedBleachers,
//         eventStart,
//         eventEnd,
//         setupStart,
//         setupEnd,
//         teardownStart,
//         teardownEnd,
//         storeBeforeStart,
//         storeBeforeEnd,
//         storeAfterStart,
//         storeAfterEnd,
//         rowsPerBleacher: lenient ? undefined : rows,
//         seatsTotal: seats,
//         bleacherCount: lenient ? undefined : bleacherCount,
//       });

//       // Notify parent of success
//       if (onSuccess) {
//         onSuccess();
//       }

//       onClose();
//     } catch (err) {
//       console.error("Error creating event:", err);
//       setError("Failed to create event. Please try again.");
//     } finally {
//       setLoading(false);
//     }
//   };

//   const handleDelete = async () => {
//     setLoading(true);
//     setError(null);

//     try {
//       // createEventMock();
//       await deleteEvent(loadedEventData?.eventId);

//       // Notify parent of success
//       if (onSuccess) {
//         onSuccess();
//       }

//       onClose();
//     } catch (err) {
//       console.error("Error creating event:", err);
//       setError("Failed to create event. Please try again.");
//     } finally {
//       setLoading(false);
//     }
//   };

//   return (
//     <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
//       <div className="bg-white p-6 rounded-lg w-[768px]">
//         <h2 className="text-xl font-bold mb-4">Add Event</h2>

//         {error && <div className="mb-4 text-red-500">{error}</div>}

//         <form onSubmit={handleSubmit} className="">
//           <div className="flex gap-6">
//             {/* Left column */}
//             <div className="flex-1 max-h-[70vh] overflow-y-auto">
//               <div className="mb-2">
//                 <label className="block text-sm font-medium text-gray-700">Event Name</label>
//                 <input
//                   type="text"
//                   value={eventName}
//                   onChange={(e) => setEventName(e.target.value)}
//                   className=" block w-full border rounded-md shadow-sm p-2"
//                   required
//                 />
//               </div>

//               <div>
//                 <label className="block text-sm font-medium text-gray-700">Address</label>
//                 <AddressAutocomplete
//                   onAddressSelect={(data) => setAddressData(data)}
//                   initialValue={addressData?.address || ""}
//                 />

//                 {addressData && (
//                   <div className="mt-2 p-2 border rounded bg-gray-100">
//                     <p>
//                       <strong>Address:</strong> {addressData.address}
//                     </p>
//                     <p>
//                       <strong>City:</strong> {addressData.city ?? "N/A"}
//                     </p>
//                     <p>
//                       <strong>State/Province:</strong> {addressData.state ?? "N/A"}
//                     </p>
//                     <p>
//                       <strong>Postal/Zip:</strong> {addressData.postalCode ?? "N/A"}
//                     </p>
//                   </div>
//                 )}
//               </div>
//               <div className="mt-2 flex items-center">
//                 <label className="relative inline-flex items-center cursor-pointer">
//                   <input
//                     type="checkbox"
//                     className="sr-only peer"
//                     onChange={(e) => setLenient(e.target.checked)}
//                     checked={lenient}
//                   />
//                   <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-darkBlue"></div>
//                   <span className="ml-3 text-sm font-medium text-gray-700">Lenient Booking?</span>
//                 </label>
//                 <div className="relative inline-block ml-2">
//                   <svg
//                     className="w-4 h-4 text-gray-500 cursor-pointer"
//                     fill="none"
//                     stroke="currentColor"
//                     viewBox="0 0 24 24"
//                     xmlns="http://www.w3.org/2000/svg"
//                     onClick={() => setShowTooltip(!showTooltip)}
//                   >
//                     <path
//                       strokeLinecap="round"
//                       strokeLinejoin="round"
//                       strokeWidth="2"
//                       d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
//                     />
//                   </svg>
//                   <div
//                     className={`absolute bottom-6 left-1/2 -translate-x-1/2 ${
//                       showTooltip ? "block" : "hidden"
//                     } bg-darkBlue text-white text-xs rounded py-1 px-2 w-48`}
//                   >
//                     Lenient Booking means the customer doesn't care about the number of bleachers or
//                     size of bleachers, they just require the number of seats. This gives us more
//                     options to choose from so we offer a 10% discount if they opt in.
//                   </div>
//                 </div>
//               </div>

//               <div className="mt-2 grid grid-cols-3 gap-4">
//                 <div>
//                   <label className="block text-sm font-medium text-gray-700">Seats</label>
//                   <input
//                     type="number"
//                     min="1"
//                     className="block w-full border rounded-md shadow-sm p-2"
//                     value={seats}
//                     onChange={(e) => setSeats(Number(e.target.value))}
//                     required
//                   />
//                 </div>
//                 {!lenient && (
//                   <div>
//                     <label className="block text-sm font-medium text-gray-700">Rows</label>
//                     <input
//                       type="number"
//                       min="1"
//                       className="block w-full border rounded-md shadow-sm p-2"
//                       value={rows}
//                       onChange={(e) => setRows(Number(e.target.value))}
//                       required
//                     />
//                   </div>
//                 )}
//                 {!lenient && (
//                   <div>
//                     <label className="block text-sm font-medium text-gray-700">Bleachers</label>
//                     <input
//                       type="number"
//                       min="1"
//                       className=" block w-full border rounded-md shadow-sm p-2"
//                       value={bleacherCount}
//                       onChange={(e) => setBleacherCount(Number(e.target.value))}
//                       required
//                     />
//                   </div>
//                 )}
//               </div>
//               <div className="">
//                 <label className="block text-sm font-medium text-gray-700">Start Setup</label>
//                 <div className="flex gap-2">
//                   <input
//                     type="date"
//                     value={setupStart}
//                     onChange={(e) => setSetupStart(e.target.value)}
//                     className="block w-full border rounded-md shadow-sm p-2"
//                   />
//                 </div>
//               </div>
//               <div className="">
//                 <label className="block text-sm font-medium text-gray-700">Start Event</label>
//                 <div className="flex gap-2">
//                   <input
//                     type="date"
//                     value={eventStart}
//                     onChange={(e) => setEventStart(e.target.value)}
//                     className="block w-full border rounded-md shadow-sm p-2"
//                   />
//                 </div>
//               </div>
//               <div className="">
//                 <label className="text-sm font-medium text-gray-700">Start Teardown</label>
//                 <div className="flex gap-2">
//                   <input
//                     type="date"
//                     value={teardownStart}
//                     onChange={(e) => setTeardownStart(e.target.value)}
//                     className="block w-full border rounded-md shadow-sm p-2"
//                   />
//                 </div>
//               </div>

//               <div className=" mt-1">
//                 <label className="block text-sm font-medium text-gray-700">End Teardown</label>
//                 <div className="flex gap-2">
//                   <input
//                     type="date"
//                     value={teardownEnd}
//                     onChange={(e) => setTeardownEnd(e.target.value)}
//                     className="block w-full border rounded-md shadow-sm p-2"
//                   />
//                 </div>
//               </div>

//               <div className="flex items-end">
//                 <label className="mt-4 mr-2 block text-lg font-bold text-gray-700">
//                   Storage Before{" "}
//                 </label>
//                 <label className="relative inline-flex items-center cursor-pointer">
//                   <input
//                     type="checkbox"
//                     className="sr-only peer"
//                     onChange={(e) => setCanStoreBefore(e.target.checked)}
//                     checked={canStoreBefore}
//                   />
//                   <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-darkBlue"></div>
//                 </label>
//               </div>
//               {canStoreBefore && (
//                 <div className="ml-2">
//                   <label className="text-sm font-medium text-gray-700">Start</label>
//                   <div className="flex gap-2">
//                     <input
//                       type="datetime-local"
//                       value={storeBeforeStart || ""}
//                       onChange={(e) => setStoreBeforeStart(e.target.value)}
//                       className="block w-full border rounded-md shadow-sm p-2"
//                     />
//                   </div>
//                 </div>
//               )}
//               {canStoreBefore && (
//                 <div className=" ml-2 mt-1">
//                   <label className="block text-sm font-medium text-gray-700">End</label>
//                   <div className="flex gap-2">
//                     <input
//                       type="datetime-local"
//                       value={storeBeforeEnd || ""}
//                       onChange={(e) => setStoreBeforeEnd(e.target.value)}
//                       className="block w-full border rounded-md shadow-sm p-2"
//                     />
//                   </div>
//                 </div>
//               )}

//               <div className="flex items-end">
//                 <label className="mt-4 mr-2 block text-lg font-bold text-gray-700">
//                   Storage After{" "}
//                 </label>
//                 <label className="relative inline-flex items-center cursor-pointer">
//                   <input
//                     type="checkbox"
//                     className="sr-only peer"
//                     onChange={(e) => setCanStoreAfter(e.target.checked)}
//                     checked={canStoreAfter}
//                   />
//                   <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-darkBlue"></div>
//                 </label>
//               </div>
//               {canStoreAfter && (
//                 <div className="ml-2">
//                   <label className="text-sm font-medium text-gray-700">Start</label>
//                   <div className="flex gap-2">
//                     <input
//                       type="datetime-local"
//                       value={storeAfterStart || ""}
//                       onChange={(e) => setStoreAfterStart(e.target.value)}
//                       className="block w-full border rounded-md shadow-sm p-2"
//                     />
//                   </div>
//                 </div>
//               )}
//               {canStoreAfter && (
//                 <div className=" ml-2 mt-1">
//                   <label className="block text-sm font-medium text-gray-700">End</label>
//                   <div className="flex gap-2">
//                     <input
//                       type="datetime-local"
//                       value={storeAfterEnd || ""}
//                       onChange={(e) => setStoreAfterEnd(e.target.value)}
//                       className="block w-full border rounded-md shadow-sm p-2"
//                     />
//                   </div>
//                 </div>
//               )}
//             </div>

//             {/* Right column - Bleacher selection */}
//             <div className="flex-1">
//               <label className="block text-sm font-medium text-gray-700">Available Bleachers</label>
//               <div className="mt-1 border rounded-md shadow-sm max-h-[300px] overflow-y-auto">
//                 {filteredBleachers?.map((bleacher) => (
//                   <div
//                     key={bleacher.bleacherId}
//                     className="p-2 hover:bg-gray-50 flex items-center space-x-2"
//                   >
//                     <input
//                       type="checkbox"
//                       id={`bleacher-${bleacher.bleacherId}`}
//                       checked={selectedBleachers.includes(bleacher.bleacherId)}
//                       onChange={(e) => {
//                         if (e.target.checked) {
//                           setSelectedBleachers([...selectedBleachers, bleacher.bleacherId]);
//                         } else {
//                           setSelectedBleachers(
//                             selectedBleachers.filter((id) => id !== bleacher.bleacherId),
//                           );
//                         }
//                       }}
//                       className="h-4 w-4 text-darkBlue focus:ring-lightBlue border-gray-300 rounded"
//                     />
//                     <label
//                       htmlFor={`bleacher-${bleacher.bleacherId}`}
//                       className="block text-sm text-gray-900"
//                     >
//                       {`Num: ${bleacher.bleacherNumber} - Rows: ${bleacher.rows} - HomeBase: ${bleacher.homeBase}`}
//                     </label>
//                   </div>
//                 ))}
//               </div>
//               {selectedBleachers.length === 0 && (
//                 <p className="mt-1 text-sm text-red-500">Please select at least one bleacher</p>
//               )}
//             </div>
//           </div>

//           <div className="flex justify-between space-x-2 pt-4">
//             {/* Delete button - only show if eventId exists */}
//             <div>
//               {eventId && (
//                 <button
//                   type="button"
//                   onClick={() => {
//                     if (window.confirm("Are you sure you want to delete this event?")) {
//                       handleDelete();
//                     }
//                   }}
//                   className="px-4 py-2 border rounded-md text-red-600 hover:bg-red-50"
//                   disabled={loading}
//                 >
//                   Delete
//                 </button>
//               )}
//             </div>
//             {/* Right side buttons */}
//             <div className="flex space-x-2">
//               <button
//                 type="button"
//                 onClick={onClose}
//                 className="px-4 py-2 border rounded-md text-gray-600 hover:bg-gray-50"
//                 disabled={loading}
//               >
//                 Cancel
//               </button>
//               <button
//                 type="submit"
//                 className="px-4 py-2 bg-darkBlue text-white rounded-md hover:bg-lightBlue"
//                 disabled={loading}
//               >
//                 {loading
//                   ? eventId
//                     ? "Updating..."
//                     : "Creating..."
//                   : eventId
//                     ? "Update Event"
//                     : "Create Event"}
//               </button>
//             </div>
//           </div>
//         </form>
//       </div>
//     </div>
//   );
// }
