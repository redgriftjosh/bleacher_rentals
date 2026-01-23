// import { DateTime } from "luxon";
// import { Grid } from "react-virtualized";
// import scrollbarSize from "dom-helpers/scrollbarSize";

// type StickyTopRowProps = {
//   ROW_HEIGHT: number;
//   width: number;
//   scrollLeft: number;
//   COLUMN_WIDTH: number;
//   COLUMN_COUNT: number;
//   dates: string[];
// };

// export default function StickyTopRow({
//   ROW_HEIGHT,
//   width,
//   scrollLeft,
//   COLUMN_WIDTH,
//   COLUMN_COUNT,
//   dates,
// }: StickyTopRowProps) {
//   return (
//     <div
//       style={{
//         // backgroundColor: `rgb(${topBg.r},${topBg.g},${topBg.b})`,
//         // color: "black",
//         height: ROW_HEIGHT,
//         width: width - scrollbarSize(),
//       }}
//     >
//       <Grid
//         style={{ overflow: "hidden" }}
//         scrollLeft={scrollLeft}
//         columnWidth={COLUMN_WIDTH}
//         columnCount={COLUMN_COUNT}
//         height={ROW_HEIGHT}
//         rowHeight={ROW_HEIGHT}
//         rowCount={1}
//         width={width - scrollbarSize()}
//         cellRenderer={({ columnIndex, key, style }) => (
//           <div
//             style={style}
//             key={key}
//             className={`border-r border-gray-300 sticky top-0 z-10 flex flex-col justify-center items-center ${
//               dates[columnIndex] === DateTime.now().toISODate()
//                 ? "bg-yellow-300"
//                 : DateTime.fromISO(dates[columnIndex]).weekday >= 6
//                 ? "bg-gray-300"
//                 : "bg-gray-200"
//             }`}
//             // style={{ minWidth: `${cellWidth}px`, maxWidth: `${cellWidth}px` }}
//           >
//             <div className="font-medium text-sm -mb-1">
//               {DateTime.fromISO(dates[columnIndex]).toFormat("EEE, MMM d")}
//             </div>
//             <div className="font-light text-xs text-gray-400">
//               {DateTime.fromISO(dates[columnIndex]).toFormat("yyyy")}
//             </div>
//           </div>
//         )}
//       />
//     </div>
//   );
// }
