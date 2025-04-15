export function BleacherListSkeleton() {
  // Create an array of 5 items to show as loading states
  const skeletonRows = Array.from({ length: 5 }, (_, index) => index);

  return (
    <tbody>
      {skeletonRows.map((index) => (
        <tr
          key={index}
          className="border-b border-gray-200 hover:bg-gray-100 transition-all duration-100 ease-in-out cursor-pointer"
        >
          <td className="p-3">
            <div style={{ float: "left" }}>
              <div className="h-6 w-2 bg-gray-200 rounded animate-pulse mx-auto"></div>
            </div>
          </td>
          <td className="p-3 text-left">
            <div style={{ float: "left" }}>
              <div className="h-6 w-10 bg-gray-200 rounded animate-pulse mx-auto"></div>
            </div>
          </td>
          <td className="p-3 text-left">
            <div style={{ float: "left" }}>
              <div className="h-6 w-12 bg-gray-200 rounded animate-pulse mx-auto"></div>
            </div>
          </td>
          <td className="p-3 text-left">
            <div style={{ float: "left" }}>
              <div className="h-6 w-20 bg-gray-200 rounded animate-pulse mx-auto"></div>
            </div>
          </td>
          <td className="p-3 text-left">
            <div style={{ float: "left" }}>
              <div className="h-6 w-20 bg-gray-200 rounded animate-pulse mx-auto"></div>
            </div>
          </td>
        </tr>
      ))}
    </tbody>
  );
}
