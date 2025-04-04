// "use client";
// import { Color } from "@/types/Color";
// import { useEffect, useRef, useState } from "react";
// import { DateTime } from "luxon";
// import { fetchBleachersWithEvents } from "./_lib/functions";
// import AddEventModal from "./_lib/_components/AddEventModal";
// import { BleacherTable } from "./_lib/_components/BleacherTable";
// import LoadingSpinner from "@/components/loadingSpinner";
import Head from "next/head";

const BleachersDashboardPage = () => {
  // const initialDays = 50; // Initial ±50 days range
  // const cellWidth = 150; // in pixels
  // const daysToAdd = 30; // Number of days to add when scrolling
  // // const [startDate, setStartDate] = useState(DateTime.now().startOf("day").minus({ days: 365 }));
  // const [startDate, setStartDate] = useState(
  //   new Date(new Date().setDate(new Date().getDate() - initialDays))
  // ); // Start 50 days before today
  // const [daysToShow, setDaysToShow] = useState(initialDays * 2); // 365 days past + today + 365 days future
  // const [bleachers, setBleachers] = useState<any[] | null>([]);
  // const [isLoading, setIsLoading] = useState(true);
  // const [modalOpen, setModalOpen] = useState(false);
  // const tableRef = useRef<HTMLDivElement>(null);
  // const [eventId, setEventId] = useState<number | null>(null);

  // // Function to generate a range of dates dynamically
  // const generateDates = (startDate: Date, days: number) => {
  //   return Array.from({ length: days }, (_, i) => {
  //     const date = new Date(startDate);
  //     date.setDate(startDate.getDate() + i);
  //     return date.toISOString().split("T")[0]; // Format as YYYY-MM-DD
  //   });
  // };

  // useEffect(() => {
  //   handleFetchBleachersWithEvents();
  // }, []); // Run once on mount

  // useEffect(() => {
  //   if (!tableRef.current) {
  //     // console.warn("🚨 tableRef is null, waiting...");
  //     return;
  //   }

  //   setTimeout(() => {
  //     const todayCell = tableRef.current?.querySelector("#today");
  //     if (!todayCell) {
  //       console.warn("🚨 Could not find today cell (#today)");
  //     } else {
  //       todayCell.scrollIntoView({ behavior: "instant", block: "nearest", inline: "center" });
  //     }
  //   }, 0);
  // }, [tableRef.current]); // 👈 Runs again when `tableRef` updates

  // useEffect(() => {
  //   if (eventId !== null) {
  //     setModalOpen(true);
  //   }
  // }, [eventId]);

  // const handleFetchBleachersWithEvents = async () => {
  //   setIsLoading(true);
  //   const bleachers = await fetchBleachersWithEvents();
  //   // console.log("bleachers 1: ", bleachers);
  //   setBleachers(bleachers ? bleachers : null);
  //   setIsLoading(false);
  // };

  // const handleScroll = () => {
  //   if (!tableRef.current) return;
  //   const { scrollLeft, scrollWidth, clientWidth } = tableRef.current;
  //   // console.log("scrollLeft", scrollLeft, "scrollWidth", scrollWidth, "clientWidth", clientWidth);

  //   if (scrollLeft === 0) {
  //     tableRef.current.scrollLeft = cellWidth * daysToAdd;
  //     setStartDate((prev) => {
  //       const newStart = new Date(prev);
  //       newStart.setDate(newStart.getDate() - daysToAdd); // Extend 30 more days
  //       return newStart;
  //     });
  //     setDaysToShow((prev) => prev + daysToAdd);
  //   } else if (scrollLeft + clientWidth >= scrollWidth - 10) {
  //     // console.log("scrollRight");
  //     setDaysToShow((prev) => prev + daysToAdd);
  //   }
  // };

  // const handleLoadEvent = (eventId: number) => {
  //   setEventId(eventId);
  // };

  // const NoBleachersFound = () => {
  //   if (!isLoading) {
  //     if (bleachers === null || bleachers.length === 0) {
  //       return (
  //         <>
  //           <h1 className="text-2xl text-darkBlue font-bold text-center mt-60">
  //             Can't Find Any Bleachers!
  //           </h1>
  //           <p className="text-md text-center" style={{ color: Color.GRAY }}>
  //             Go to the bleachers page to add some.
  //           </p>
  //         </>
  //       );
  //     }
  //   }
  //   return null;
  // };

  // const Loading = () => {
  //   if (isLoading) {
  //     return <LoadingSpinner />;
  //   }
  //   return null;
  // };

  // const dates = generateDates(startDate, daysToShow); // Generate updated dates
  // console.log("dates: ", dates);

  return (
    // <div>
    //   <AddEventModal
    //     isOpen={modalOpen}
    //     onClose={() => {
    //       setModalOpen(false);
    //       setEventId(null);
    //     }}
    //     onSuccess={handleFetchBleachersWithEvents}
    //     bleachers={bleachers}
    //     eventId={eventId}
    //   />
    //   <div className="flex justify-between items-center mb-4">
    //     {/* Left Side: Title & Description */}
    //     <div>
    //       <h1 className="text-2xl text-darkBlue font-bold">Bleacher Dashboard</h1>
    //       <p className="text-sm" style={{ color: Color.GRAY }}>
    //         See all your bleachers and their events.
    //       </p>
    //     </div>

    //     {/* Right Side: Invite New Member Button */}
    //     <button
    //       onClick={() => {
    //         setModalOpen(true);
    //       }}
    //       className="px-4 py-2 bg-darkBlue text-white text-sm font-semibold rounded-lg shadow-md hover:bg-lightBlue transition"
    //     >
    //       + Create New Event
    //     </button>
    //   </div>
    //   {NoBleachersFound()}
    //   {Loading()}
    //   {BleacherTable(
    //     bleachers,
    //     dates,
    //     tableRef,
    //     handleScroll,
    //     handleLoadEvent,
    //     cellWidth,
    //     Color,
    //     DateTime
    //   )}
    // </div>
    <div className="flex flex-col items-center justify-between h-screen overflow-x-hidden xl:overflow-hidden min-w-[320px]">
      <Head>
        <title>Welcome to Bleacher Rentals</title>
      </Head>
      Bleacher Dashboard
    </div>
  );
};

export default BleachersDashboardPage;
