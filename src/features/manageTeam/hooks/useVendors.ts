"use client";

import { sql } from "@powersync/kysely-driver";
import { db } from "@/components/providers/SystemProvider";
import { expect, useTypedQuery } from "@/lib/powersync/typedQuery";
import { useMemo } from "react";

type VendorRow = {
  id: string;
  display_name: string | null;
  logo_url: string | null;
  qbo_vendor_id: string | null;
  qbo_connection_uuid: string | null;
  is_active: number | null;
  ein: string | null;
  hst: string | null;
};

type DriverCountRow = {
  vendor_uuid: string | null;
  count: string;
};

export type VendorOption = {
  id: string;
  displayName: string;
  logoUrl: string | null;
  qboVendorId: string | null;
  qboConnectionUuid: string | null;
  isActive: boolean;
  driverCount: number;
  ein: string | null;
  hst: string | null;
};

/**
 * Hook to fetch all vendors with driver counts using PowerSync
 */
export function useVendors(includeInactive: boolean = false) {
  // Build vendor query
  const vendorQuery = useMemo(() => {
    let query = db
      .selectFrom("Vendors")
      .select(["id", "display_name", "logo_url", "qbo_vendor_id", "qbo_connection_uuid", "is_active", "ein", "hst"])
      .orderBy("display_name", "asc");

    if (!includeInactive) {
      query = query.where("is_active", "=", 1);
    }

    return query.compile();
  }, [includeInactive]);

  // Build driver count query
  const driverCountQuery = useMemo(() => {
    return db
      .selectFrom("Drivers")
      .select(["vendor_uuid", sql<string>`count(id)`.as("count")])
      .where("vendor_uuid", "is not", null)
      .groupBy("vendor_uuid")
      .compile();
  }, []);

  const { data: vendors = [] } = useTypedQuery(vendorQuery, expect<VendorRow>());
  const { data: driverCounts = [] } = useTypedQuery(driverCountQuery, expect<DriverCountRow>());

  // Create a map of vendor_uuid -> driver count
  const driverCountMap = useMemo(() => {
    const map = new Map<string, number>();
    driverCounts.forEach((row) => {
      if (row.vendor_uuid) {
        map.set(row.vendor_uuid, parseInt(row.count, 10));
      }
    });
    return map;
  }, [driverCounts]);

  // Combine vendors with their driver counts
  const vendorList: VendorOption[] = useMemo(() => {
    return vendors.map((v) => ({
      id: v.id,
      displayName: v.display_name || "Unknown Vendor",
      logoUrl: v.logo_url,
      qboVendorId: v.qbo_vendor_id,
      qboConnectionUuid: v.qbo_connection_uuid,
      isActive: v.is_active === 1,
      driverCount: driverCountMap.get(v.id) || 0,
      ein: v.ein,
      hst: v.hst,
    }));
  }, [vendors, driverCountMap]);

  return { data: vendorList, isLoading: false };
}
