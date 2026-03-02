type CountryIndicatorProps = {
  country: "usa" | "canada";
};

export function CountryIndicator({ country }: CountryIndicatorProps) {
  if (country === "usa") {
    return (
      <div className="inline-flex w-[300px] flex-shrink-0 items-center gap-2 rounded-lg border-2 border-blue-500 bg-blue-50 px-4 py-2">
        <span className="text-4xl" role="img" aria-label="USA Flag">
          🇺🇸
        </span>
        <div>
          <p className="text-lg font-bold text-blue-900">USA Driver</p>
          <p className="text-xs text-blue-700">Medical card required</p>
        </div>
      </div>
    );
  }

  return (
    <div className="inline-flex w-[300px] flex-shrink-0 items-center gap-2 rounded-lg border-2 border-red-500 bg-red-50 px-4 py-2">
      <span className="text-4xl" role="img" aria-label="Canada Flag">
        🇨🇦
      </span>
      <div>
        <p className="text-lg font-bold text-red-900">Canadian Driver</p>
        <p className="text-xs text-red-700">No medical card required</p>
      </div>
    </div>
  );
}
