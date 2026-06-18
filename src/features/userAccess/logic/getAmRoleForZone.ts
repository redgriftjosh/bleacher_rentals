export function getAmRoleForZone(params: {
  zoneUuid: string | null | undefined;
  leadZoneIds: string[];
  accountManagerZoneIds: string[];
}): "lead" | "junior" | "none" {
  const { zoneUuid, leadZoneIds, accountManagerZoneIds } = params;

  if (!zoneUuid) return "none";
  if (leadZoneIds.includes(zoneUuid)) return "lead";
  if (accountManagerZoneIds.includes(zoneUuid)) return "junior";
  return "none";
}
