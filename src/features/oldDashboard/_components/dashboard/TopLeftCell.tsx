// import { Grid } from "react-virtualized";
// import { useEffect, useRef } from "react";
// import { useCurrentEventStore } from "../../../eventConfiguration/state/useCurrentEventStore";
// import { YAxis } from "../../../dashboardOptions/useFilterDashboardStore";

// type TopLeftCellProps = {
//   ROW_HEIGHT: number;
//   STICKY_LEFT_COLUMN_WIDTH: number;
//   STICKY_LEFT_COLUMN_WIDTH_EXPANDED: number;
//   yAxis: YAxis;
// };

// export default function TopLeftCell({
//   ROW_HEIGHT,
//   STICKY_LEFT_COLUMN_WIDTH,
//   STICKY_LEFT_COLUMN_WIDTH_EXPANDED,
//   yAxis,
// }: TopLeftCellProps) {
//   const isFormExpanded = useCurrentEventStore((s) => s.isFormExpanded);
//   const gridRef = useRef<Grid>(null);

//   // This helps us change the width of the top left cell when the form is expanded
//   // to match the width of the stickyLeftColumn
//   useEffect(() => {
//     if (gridRef.current) {
//       gridRef.current.recomputeGridSize();
//       gridRef.current.forceUpdate(); // optional, but helps ensure render
//     }
//   }, [isFormExpanded]);
//   return (
//     <div
//       className="absolute z-20 border-r border-b bg-white transition-all duration-1000 ease-in-out"
//       style={{
//         width: isFormExpanded ? STICKY_LEFT_COLUMN_WIDTH_EXPANDED : STICKY_LEFT_COLUMN_WIDTH,
//         height: ROW_HEIGHT,
//         // backgroundColor: `rgb(${topBg.r},${topBg.g},${topBg.b})`,
//       }}
//     >
//       <Grid
//         ref={gridRef}
//         cellRenderer={({ key, style }) => (
//           <div
//             key={key}
//             style={style}
//             className="px-4 py-2 text-left text-md font-bold w-full h-full"
//           >
//             {yAxis}
//           </div>
//         )}
//         width={isFormExpanded ? STICKY_LEFT_COLUMN_WIDTH_EXPANDED : STICKY_LEFT_COLUMN_WIDTH}
//         height={ROW_HEIGHT}
//         rowHeight={ROW_HEIGHT}
//         columnWidth={isFormExpanded ? STICKY_LEFT_COLUMN_WIDTH_EXPANDED : STICKY_LEFT_COLUMN_WIDTH}
//         rowCount={1}
//         columnCount={1}
//       />
//     </div>
//   );
// }
