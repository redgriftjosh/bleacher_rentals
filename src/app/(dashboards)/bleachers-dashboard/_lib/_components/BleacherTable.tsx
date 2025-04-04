// export const BleacherTable = (
//   bleachers: any[] | null,
//   dates: string[],
//   tableRef: any,
//   handleScroll: any,
//   handleLoadEvent: any,
//   cellWidth: number,
//   Color: any,
//   DateTime: any,
// ) => {
//   if (bleachers !== null && bleachers.length > 0) {
//     return (
//       // <div className="relative border rounded-lg h-[calc(100vh-170px)]">
//       <div className="relative border h-[calc(100vh-170px)]">
//         <div ref={tableRef} className="overflow-auto h-full" onScroll={handleScroll}>
//           <table className="w-full">
//             <thead>
//               <tr>
//                 <th className="w-48 px-4 py-2 border-r text-left bg-gray-50 sticky left-0 top-0 z-20">
//                   Bleacher
//                 </th>
//                 {/* {getDayHeaders()} */}
//                 {dates.map((date, dateIndex) => (
//                   <th
//                     key={`date-header-${dateIndex}-${date}`}
//                     id={date === new Date().toISOString().split("T")[0] ? "today" : undefined}
//                     className={`border-r px-4 py-2 sticky top-0 z-10 ${
//                       date === new Date().toISOString().split("T")[0]
//                         ? "bg-yellow-300"
//                         : "bg-gray-200"
//                     }`}
//                     style={{ minWidth: `${cellWidth}px`, maxWidth: `${cellWidth}px` }}
//                   >
//                     {DateTime.fromISO(date).toFormat("MM/dd/yyyy")}
//                   </th>
//                 ))}
//               </tr>
//             </thead>
//             <tbody>
//               {bleachers?.map((bleacher) => (
//                 <tr key={bleacher.bleacherId} className="border-t">
//                   <td className="w-48 px-4 py-2 border-r font-medium sticky left-0 bg-white z-10 h-16">
//                     <div className="flex justify-between items-center">
//                       <span>{bleacher.bleacherNumber}</span>
//                     </div>
//                   </td>
//                   {dates.map((date, dateIndex) => (
//                     <th
//                       key={`events-cell-${bleacher.bleacherId}-${dateIndex}-${date}`}
//                       id={date === new Date().toISOString().split("T")[0] ? "today" : undefined}
//                       className="border-r relative p-0 min-w-[100px]"
//                       style={{ minWidth: `${cellWidth}px`, maxWidth: `${cellWidth}px` }}
//                     >
//                       {bleacher.events.map((event: any, eventIndex: number) => {
//                         return (
//                           <div key={`${eventIndex}`}>
//                             {event.eventStart.split("T")[0] === date && (
//                               <div
//                                 key={`event${eventIndex}`}
//                                 style={{
//                                   position: "absolute",
//                                   width: event.eventWidth,
//                                   height: "80%",
//                                   top: "10%",
//                                   left: event.eventLeft,
//                                   backgroundColor: Color.LIGHT_BLUE,
//                                   borderRadius: "4px",
//                                   zIndex: 3,
//                                   overflow: "visible",
//                                 }}
//                                 onClick={() => handleLoadEvent(event.eventId)}
//                               >
//                                 <div
//                                   style={{
//                                     position: "sticky",
//                                     left: 0,
//                                     top: 0,
//                                     padding: "0 8px",
//                                     whiteSpace: "nowrap",
//                                     width: "fit-content",
//                                     minWidth: "100%",
//                                   }}
//                                 >
//                                   <span
//                                     className="text-white"
//                                     style={{
//                                       position: "absolute",
//                                       left: "8px",
//                                     }}
//                                   >
//                                     {event.eventName}
//                                   </span>
//                                 </div>
//                               </div>
//                             )}
//                             {event.setupStart.split("T")[0] === date && (
//                               <div
//                                 key={`setup${eventIndex}`}
//                                 style={{
//                                   position: "absolute",
//                                   width: event.setupWidth,
//                                   height: "80%",
//                                   top: "10%",
//                                   left: event.setupLeft,
//                                   backgroundColor: "#fcba03",
//                                   borderRadius: "4px",
//                                   zIndex: 2,
//                                   overflow: "visible",
//                                 }}
//                               >
//                                 <div
//                                   style={{
//                                     position: "sticky",
//                                     left: 0,
//                                     top: 0,
//                                     padding: "0 8px",
//                                     whiteSpace: "nowrap",
//                                     width: "fit-content",
//                                     minWidth: "100%",
//                                   }}
//                                 >
//                                   <span
//                                     className="text-white"
//                                     style={{
//                                       position: "absolute",
//                                       left: "8px",
//                                     }}
//                                   >
//                                     Setup
//                                   </span>
//                                 </div>
//                               </div>
//                             )}
//                             {event.teardownStart.split("T")[0] === date && (
//                               <div
//                                 key={`teardown${eventIndex}`}
//                                 style={{
//                                   position: "absolute",
//                                   width: event.teardownWidth,
//                                   height: "80%",
//                                   top: "10%",
//                                   left: event.teardownLeft,
//                                   backgroundColor: "#fcba03",
//                                   borderRadius: "4px",
//                                   zIndex: 2,
//                                   overflow: "visible",
//                                 }}
//                               >
//                                 <div
//                                   style={{
//                                     position: "sticky",
//                                     left: 0,
//                                     top: 0,
//                                     padding: "0 8px",
//                                     whiteSpace: "nowrap",
//                                     width: "fit-content",
//                                     minWidth: "100%",
//                                   }}
//                                 >
//                                   <span
//                                     className="text-white"
//                                     style={{
//                                       position: "absolute",
//                                       left: "8px",
//                                     }}
//                                   >
//                                     Teardown
//                                   </span>
//                                 </div>
//                               </div>
//                             )}

//                             {event.storeBeforeStart &&
//                               event.storeBeforeStart.split("T")[0] === date && (
//                                 <div
//                                   key={`teardown${eventIndex}`}
//                                   style={{
//                                     position: "absolute",
//                                     width: event.storeBeforeWidth,
//                                     height: "80%",
//                                     top: "10%",
//                                     left: event.storeBeforeLeft,
//                                     backgroundColor: "#dbdbdb",
//                                     borderRadius: "4px",
//                                     zIndex: 1,
//                                     overflow: "visible",
//                                   }}
//                                 >
//                                   <div
//                                     style={{
//                                       position: "sticky",
//                                       left: 0,
//                                       top: 0,
//                                       padding: "0 8px",
//                                       whiteSpace: "nowrap",
//                                       width: "fit-content",
//                                       minWidth: "100%",
//                                     }}
//                                   >
//                                     <span
//                                       className="text-white"
//                                       style={{
//                                         position: "absolute",
//                                         left: "8px",
//                                       }}
//                                     >
//                                       Storage
//                                     </span>
//                                   </div>
//                                 </div>
//                               )}

//                             {event.storeAfterStart &&
//                               event.storeAfterStart.split("T")[0] === date && (
//                                 <div
//                                   key={`teardown${eventIndex}`}
//                                   style={{
//                                     position: "absolute",
//                                     width: event.storeAfterWidth,
//                                     height: "80%",
//                                     top: "10%",
//                                     left: event.storeAfterLeft,
//                                     backgroundColor: "#dbdbdb",
//                                     borderRadius: "4px",
//                                     zIndex: 1,
//                                     overflow: "visible",
//                                   }}
//                                 >
//                                   <div
//                                     style={{
//                                       position: "sticky",
//                                       left: 0,
//                                       top: 0,
//                                       padding: "0 8px",
//                                       whiteSpace: "nowrap",
//                                       width: "fit-content",
//                                       minWidth: "100%",
//                                     }}
//                                   >
//                                     <span
//                                       className="text-white"
//                                       style={{
//                                         position: "absolute",
//                                         left: "8px",
//                                       }}
//                                     >
//                                       Storage
//                                     </span>
//                                   </div>
//                                 </div>
//                               )}
//                           </div>
//                         );
//                       })}
//                     </th>
//                   ))}
//                 </tr>
//               ))}
//             </tbody>
//           </table>
//         </div>
//       </div>
//     );
//   }
//   return null;
// };
