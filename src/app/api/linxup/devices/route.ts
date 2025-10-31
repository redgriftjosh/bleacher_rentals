// app/api/linxup/devices/route.ts
import { NextResponse, NextRequest } from "next/server";

const HOST = (process.env.LINXUP_API_HOST || "").replace(/\/+$/, ""); // e.g. https://app02.linxup.com
const TOKEN = process.env.LINXUP_API_TOKEN || ""; // Bearer token from Linxup portal
const BASE = `${HOST}/ibis/rest/api/v2`; // Linxup REST base path

export async function GET(req: NextRequest) {
  try {
    if (!HOST || !TOKEN) {
      console.error("[linxup] Missing env vars", { hasHost: !!HOST, hasToken: !!TOKEN });
      return NextResponse.json(
        { error: "LINXUP_API_HOST or LINXUP_API_TOKEN missing" },
        { status: 503 }
      );
    }

    const url = `${BASE}/locations`;
    const debug = req.nextUrl.searchParams.get("debug") === "1";
    console.log(`[linxup] Fetching: ${url}`);

    const r = await fetch(url, {
      headers: {
        Authorization: `Bearer ${TOKEN}`,
        Accept: "application/json",
      },
      cache: "no-store",
    });

    const text = await r.text();
    console.log("[linxup] HTTP", r.status, r.statusText, "| raw bytes:", text.length);

    if (!r.ok) {
      console.error("[linxup] Non-OK response body preview:", text.slice(0, 300));
      return NextResponse.json({ error: `Linxup ${r.status}: ${text}` }, { status: 502 });
    }

    // Parse JSON
    let json: any = null;
    try {
      json = JSON.parse(text);
    } catch (e) {
      console.error("[linxup] Failed to parse JSON:", (e as Error)?.message);
      if (debug && process.env.NODE_ENV !== "production") {
        return NextResponse.json({ raw: text, devices: [] });
      }
      return NextResponse.json({ error: "Invalid JSON from Linxup" }, { status: 502 });
    }

    const topKeys = json && typeof json === "object" ? Object.keys(json) : [];
    console.log("[linxup] Top-level JSON keys:", topKeys);

    // Log a bit about json.data (since we saw responseType+data)
    if (json?.data && typeof json.data === "object") {
      console.log("[linxup] data.type:", Array.isArray(json.data) ? "array" : typeof json.data);
      console.log(
        "[linxup] data.keys:",
        !Array.isArray(json.data)
          ? Object.keys(json.data).slice(0, 20)
          : `length=${json.data.length}`
      );
    }

    // ---- Smart array finder -------------------------------------------------
    // We’ll look in common spots, then recursively search the object graph for
    // the first non-empty array of objects (likely the locations/devices list).
    const candidate =
      (Array.isArray(json) && json) ||
      (Array.isArray(json?.locations) && json.locations) ||
      (Array.isArray(json?.items) && json.items) ||
      (Array.isArray(json?.data) && json.data) ||
      (Array.isArray(json?.data?.locations) && json.data.locations) ||
      (Array.isArray(json?.data?.items) && json.data.items) ||
      findFirstArrayOfObjects(json?.data) ||
      findFirstArrayOfObjects(json);

    const arr: any[] = Array.isArray(candidate) ? candidate : [];
    console.log("[linxup] Located array length:", arr.length);

    if (arr.length === 0) {
      // Give more hints in logs: show a short preview of json.data if it's an object
      if (json?.data && typeof json.data === "object" && !Array.isArray(json.data)) {
        const sampleEntryKey = Object.keys(json.data).find((k) =>
          Array.isArray((json.data as any)[k])
        );
        console.warn(
          "[linxup] Could not find array; sample array-like key under data:",
          sampleEntryKey
        );
        if (sampleEntryKey) {
          console.warn(
            "[linxup] Example first item keys:",
            Object.keys(json.data[sampleEntryKey][0] || {}).slice(0, 20)
          );
        }
      }
    } else {
      console.log("[linxup] First item keys:", Object.keys(arr[0]).slice(0, 20));
    }

    // ---- Normalization ------------------------------------------------------
    const devices = arr.map((d: any, index: number) => {
      // Log first 3 items in detail for debugging
      if (index < 3) {
        console.log(`\n[linxup] === Device ${index + 1} Raw Data ===`);
        Object.entries(d).forEach(([key, value]) => {
          console.log(
            `[linxup]   ${key}:`,
            typeof value === "object" ? JSON.stringify(value) : value
          );
        });
      }

      // Some payloads nest the device meta under "device", "vehicle", or similar.
      const dev = pickFirst(d, d?.device, d?.tracker, d?.vehicle, d?.unit);

      const lat = pickNumber(d?.latitude, d?.lat, d?.position?.lat, d?.gps?.lat, d?.location?.lat);
      const lng = pickNumber(d?.longitude, d?.lng, d?.position?.lng, d?.gps?.lng, d?.location?.lng);

      const deviceId =
        pickString(
          dev?.uuid,
          d?.uuid,
          dev?.deviceUuid,
          d?.deviceUuid,
          dev?.deviceId,
          d?.deviceId,
          d?.device_id,
          dev?.imei,
          d?.imei,
          dev?.id,
          d?.id
        ) || "";

      const name =
        pickString(
          d?.firstName,
          d?.personName,
          dev?.deviceName,
          d?.deviceName,
          dev?.name,
          d?.name,
          d?.label,
          d?.description,
          d?.vehicleName,
          dev?.friendlyName,
          d?.friendlyName,
          d?.vin ? `VIN ${d.vin}` : undefined
        ) || "Unnamed device";

      const updatedAt =
        pickString(
          d?.timestamp,
          d?.recordedAt,
          d?.gpsTimestamp,
          d?.lastUpdate,
          d?.lastUpdatedTime,
          d?.updateTime
        ) || null;

      return {
        deviceId: String(deviceId),
        name,
        imei: pickString(dev?.imei, d?.imei) || null,
        uuid: pickString(dev?.uuid, d?.uuid, dev?.deviceUuid, d?.deviceUuid) || null,
        vin: pickString(dev?.vin, d?.vin) || null,
        status: pickString(d?.status) || null,
        group: pickString(d?.groupName, dev?.groupName, d?.group) || null,
        lat: isFiniteNumber(lat) ? lat : null,
        lng: isFiniteNumber(lng) ? lng : null,
        updatedAt,
      };
    });

    console.log("[linxup] Normalized devices count:", devices.length);
    if (devices[0]) {
      console.log("[linxup] Sample device:", {
        deviceId: devices[0].deviceId,
        name: devices[0].name,
        imei: devices[0].imei,
        uuid: devices[0].uuid,
        lat: devices[0].lat,
        lng: devices[0].lng,
        updatedAt: devices[0].updatedAt,
      });
    }

    // Optional debug response (dev-only) with raw payload
    if (debug && process.env.NODE_ENV !== "production") {
      return NextResponse.json({ raw: json, devices });
    }

    return NextResponse.json(devices);
  } catch (e: any) {
    console.error("[linxup] Unhandled error:", e);
    return NextResponse.json({ error: e?.message ?? "Internal server error" }, { status: 500 });
  }
}

/** Find the first non-empty array of objects anywhere in an object graph (depth-limited). */
function findFirstArrayOfObjects(root: any, maxDepth = 4): any[] | null {
  const seen = new Set<any>();
  function dfs(node: any, depth: number, path: string): any[] | null {
    if (node == null || depth > maxDepth || typeof node !== "object") return null;
    if (seen.has(node)) return null;
    seen.add(node);

    if (Array.isArray(node)) {
      if (node.length > 0 && typeof node[0] === "object") {
        console.log("[linxup] Found array at", path, "len=", node.length);
        return node;
      }
      return null;
    }
    // Prefer common keys first
    for (const key of ["locations", "items", "results", "data", "list", "records"]) {
      if (node[key]) {
        const found = dfs(node[key], depth + 1, `${path}.${key}`);
        if (found) return found;
      }
    }
    // Fallback: generic scan
    for (const k of Object.keys(node)) {
      const found = dfs(node[k], depth + 1, `${path}.${k}`);
      if (found) return found;
    }
    return null;
  }
  return dfs(root, 0, "root");
}

function pickFirst<T>(...vals: (T | undefined)[]): T | undefined {
  return vals.find((v) => v !== undefined && v !== null);
}
function pickString(...vals: (any | undefined)[]): string | undefined {
  const v = pickFirst(...vals);
  return typeof v === "string" ? v : v != null ? String(v) : undefined;
}
function pickNumber(...vals: (any | undefined)[]): number | undefined {
  for (const v of vals) {
    const n = typeof v === "number" ? v : v != null ? Number(v) : NaN;
    if (!Number.isNaN(n)) return n;
  }
  return undefined;
}
function isFiniteNumber(n: any): n is number {
  return typeof n === "number" && Number.isFinite(n);
}
