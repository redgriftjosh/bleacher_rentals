export function WeekTableHeader() {
  return (
    <thead className="bg-gray-100">
      <tr className="border-b border-gray-200">
        <th className="p-3 text-left font-semibold w-96">Event</th>
        <th className="p-3 text-left font-semibold">Date Quoted</th>
        <th className="p-3 text-left font-semibold">Invoice Amount</th>
        <th className="p-3 text-left font-semibold">Status</th>
      </tr>
    </thead>
  );
}
