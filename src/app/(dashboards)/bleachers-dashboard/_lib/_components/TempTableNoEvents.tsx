import { FormattedBleacher } from "@/app/assets/bleachers/_lib/types";

export const TempTableNoEvents = (
  bleachers: FormattedBleacher[] | null,
  dates: string[],
  tableRef: any,
  handleScroll: any,
  // handleLoadEvent: any,
  cellWidth: number,
  // Color: any,
  DateTime: any
) => {
  if (bleachers !== null && bleachers.length > 0) {
    return (
      // <div className="relative border rounded-lg h-[calc(100vh-170px)]">
      <div className="relative border h-[calc(100vh-170px)]">
        <div ref={tableRef} className="overflow-auto h-full" onScroll={handleScroll}>
          <table className="w-full">
            <thead>
              <tr>
                <th className="w-48 px-4 py-2 border-r text-left bg-gray-50 sticky left-0 top-0 z-20">
                  Bleacher
                </th>
                {/* {getDayHeaders()} */}
                {dates.map((date, dateIndex) => (
                  <th
                    key={`date-header-${dateIndex}-${date}`}
                    id={date === new Date().toISOString().split("T")[0] ? "today" : undefined}
                    className={`border-r px-4 py-2 sticky top-0 z-10 ${
                      date === new Date().toISOString().split("T")[0]
                        ? "bg-yellow-300"
                        : "bg-gray-200"
                    }`}
                    style={{ minWidth: `${cellWidth}px`, maxWidth: `${cellWidth}px` }}
                  >
                    {DateTime.fromISO(date).toFormat("MM/dd/yyyy")}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {bleachers?.map((bleacher) => (
                <tr key={`${bleacher.bleacherNumber}`} className="border-t">
                  <td className="w-48 px-4 py-2 border-r font-medium sticky left-0 bg-white z-10 h-16">
                    <div className="flex justify-between items-center">
                      <span>{bleacher.bleacherNumber}</span>
                    </div>
                  </td>
                  {dates.map((date, dateIndex) => (
                    <th
                      key={`events-cell-${bleacher.bleacherNumber}-${dateIndex}-${date}`}
                      id={date === new Date().toISOString().split("T")[0] ? "today" : undefined}
                      className="border-r relative p-0 min-w-[100px]"
                      style={{ minWidth: `${cellWidth}px`, maxWidth: `${cellWidth}px` }}
                    ></th>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    );
  }
  return null;
};
