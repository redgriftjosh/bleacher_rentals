// export const BleacherTable = () => {
//   // Generate 7 days starting from today
//   const dates = Array.from({ length: 7 }, (_, i) => {
//     const date = new Date();
//     date.setDate(date.getDate() + i);
//     return date.toISOString().split("T")[0];
//   });

//   return (
//     <div className="relative border h-[calc(100vh-170px)]">
//       <div className="overflow-auto h-full">
//         <table className="w-full">
//           <thead>
//             <tr>
//               <th className="w-48 px-4 py-2 border-r text-left bg-gray-50 sticky left-0 top-0 z-20">
//                 Bleacher
//               </th>
//               {dates.map((date, dateIndex) => (
//                 <th
//                   key={`date-header-${dateIndex}`}
//                   className={`border-r px-4 py-2 sticky top-0 z-10 ${
//                     date === new Date().toISOString().split("T")[0]
//                       ? "bg-yellow-300"
//                       : "bg-gray-200"
//                   }`}
//                   style={{ minWidth: "150px", maxWidth: "150px" }}
//                 >
//                   {date}
//                 </th>
//               ))}
//             </tr>
//           </thead>
//           <tbody>
//             {/* Sample bleacher rows */}
//             {[1, 2, 3, 4, 5].map((bleacherNum) => (
//               <tr key={bleacherNum} className="border-t">
//                 <td className="w-48 px-4 py-2 border-r font-medium sticky left-0 bg-white z-10 h-16">
//                   <div className="flex justify-between items-center">
//                     <span>Bleacher {bleacherNum}</span>
//                   </div>
//                 </td>
//                 {dates.map((date, dateIndex) => (
//                   <td
//                     key={`cell-${bleacherNum}-${dateIndex}`}
//                     className="border-r relative p-0 min-w-[100px]"
//                     style={{ minWidth: "150px", maxWidth: "150px", height: "64px" }}
//                   >
//                     {/* Sample event for first bleacher on second day */}
//                     {bleacherNum === 1 && dateIndex === 1 && (
//                       <div
//                         style={{
//                           position: "absolute",
//                           width: "300px", // spans 2 days
//                           height: "80%",
//                           top: "10%",
//                           left: 0,
//                           backgroundColor: "#60A5FA", // light blue
//                           borderRadius: "4px",
//                           zIndex: 3,
//                         }}
//                       >
//                         <div className="px-2 py-1 text-white">Sample Event</div>
//                       </div>
//                     )}
//                     {/* Sample setup period for second bleacher */}
//                     {bleacherNum === 2 && dateIndex === 3 && (
//                       <div
//                         style={{
//                           position: "absolute",
//                           width: "150px",
//                           height: "80%",
//                           top: "10%",
//                           left: 0,
//                           backgroundColor: "#fcba03", // yellow
//                           borderRadius: "4px",
//                           zIndex: 2,
//                         }}
//                       >
//                         <div className="px-2 py-1 text-white">Setup</div>
//                       </div>
//                     )}
//                     {/* Sample storage period for third bleacher */}
//                     {bleacherNum === 3 && dateIndex === 5 && (
//                       <div
//                         style={{
//                           position: "absolute",
//                           width: "150px",
//                           height: "80%",
//                           top: "10%",
//                           left: 0,
//                           backgroundColor: "#dbdbdb", // gray
//                           borderRadius: "4px",
//                           zIndex: 1,
//                         }}
//                       >
//                         <div className="px-2 py-1 text-white">Storage</div>
//                       </div>
//                     )}
//                   </td>
//                 ))}
//               </tr>
//             ))}
//           </tbody>
//         </table>
//       </div>
//     </div>
//   );
// };
