import { CompactDetailedStatWithGraph } from "../components/CompactDetailedStatWithGraph";

export default function Overview() {
  return (
    <>
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4 mb-6">
        {/* <CompactDetailedStatWithGraph />
        <CompactDetailedStatWithGraph />
        <CompactDetailedStatWithGraph /> */}
        {/* <CompactDetailedStatWithGraph /> */}
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-2 gap-4 mb-6">
        {/* <CompactDetailedStatWithGraph />
        <CompactDetailedStatWithGraph /> */}
        {/* <CompactDetailedStatWithGraph /> */}
      </div>
      <h2 className="text-lg font-semibold text-gray-800 mb-4">Account Managers</h2>
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
        {/* {scorecards.map((sc) => (
          <AccountManagerCard key={sc.manager.userUuid} scorecard={sc} timeRange={activeRange} />
        ))} */}
      </div>
    </>
  );
}
