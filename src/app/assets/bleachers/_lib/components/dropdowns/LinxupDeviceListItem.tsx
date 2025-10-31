import React from "react";

type LinxupDevice = {
  deviceId: string;
  name: string;
  imei: string | null;
  uuid: string | null;
  vin: string | null;
  status: string | null;
  group: string | null;
  lat: number | null;
  lng: number | null;
  updatedAt: string | null;
};

type LinxupDeviceListItemProps = {
  device: LinxupDevice;
  onClick: () => void;
};

const getStatusStyles = (status: string | null) => {
  if (!status) return "bg-gray-100 text-gray-600";

  const statusLower = status.toLowerCase();
  if (statusLower === "moving") {
    return "bg-green-50 text-green-700 border border-green-200";
  }
  if (statusLower === "stopped") {
    return "bg-amber-50 text-amber-700 border border-amber-200";
  }
  if (statusLower === "idle") {
    return "bg-blue-50 text-blue-700 border border-blue-200";
  }
  return "bg-gray-50 text-gray-600 border border-gray-200";
};

const LinxupDeviceListItem: React.FC<LinxupDeviceListItemProps> = ({ device, onClick }) => {
  return (
    <li
      className="px-4 py-3 hover:bg-gray-50 cursor-pointer transition-colors border-b border-gray-100 last:border-b-0"
      onClick={onClick}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1 min-w-0">
          <div className="text-sm font-semibold text-gray-900 truncate mb-1">{device.name}</div>
          {device.vin && <div className="text-xs text-gray-600 font-mono">{device.vin}</div>}
        </div>
        {device.status && (
          <div
            className={`px-1.5 py-0.5 rounded text-[10px] font-medium whitespace-nowrap ${getStatusStyles(
              device.status
            )}`}
          >
            {device.status}
          </div>
        )}
      </div>
    </li>
  );
};

export default LinxupDeviceListItem;
