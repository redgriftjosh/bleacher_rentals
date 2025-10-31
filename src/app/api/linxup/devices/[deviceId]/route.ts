// app/api/linxup/devices/[deviceId]/route.ts
import { NextResponse, NextRequest } from "next/server";

const HOST = (process.env.LINXUP_API_HOST || "").replace(/\/+$/, "");
const TOKEN = process.env.LINXUP_API_TOKEN || "";
const BASE = `${HOST}/ibis/rest/api/v2`;

export async function GET(req: NextRequest, { params }: { params: Promise<{ deviceId: string }> }) {
  try {
    const { deviceId } = await params;

    if (!HOST || !TOKEN) {
      console.error("[linxup] Missing env vars");
      return NextResponse.json(
        { error: "LINXUP_API_HOST or LINXUP_API_TOKEN missing" },
        { status: 503 }
      );
    }

    const url = `${BASE}/locations`;
    console.log(`[linxup] Fetching device: ${deviceId}`);

    const r = await fetch(url, {
      headers: {
        Authorization: `Bearer ${TOKEN}`,
        Accept: "application/json",
      },
      cache: "no-store",
    });

    if (!r.ok) {
      console.error("[linxup] Non-OK response:", r.status);
      return NextResponse.json({ error: `Linxup ${r.status}` }, { status: 502 });
    }

    const json = await r.json();
    const locations = json?.data?.locations || [];

    // Find the specific device
    const device = locations.find(
      (d: any) =>
        d.imei === deviceId ||
        d.deviceUUID === deviceId ||
        d.deviceSerialNumber === deviceId ||
        String(d.imei) === deviceId
    );

    if (!device) {
      return NextResponse.json({ error: "Device not found" }, { status: 404 });
    }

    // Normalize the device data
    const normalized = {
      deviceId: device.imei || device.deviceUUID || deviceId,
      name: device.firstName || device.personName || "Unnamed Device",
      imei: device.imei || null,
      uuid: device.deviceUUID || null,
      vin: device.vin || null,
      status: device.status || null,
      lat: device.latitude || null,
      lng: device.longitude || null,
      speed: device.speed || null,
      updatedAt: device.date ? String(device.date) : null,
    };

    console.log("[linxup] Found device:", normalized.name);

    return NextResponse.json(normalized);
  } catch (e: any) {
    console.error("[linxup] Error fetching device:", e);
    return NextResponse.json({ error: e?.message ?? "Internal server error" }, { status: 500 });
  }
}
