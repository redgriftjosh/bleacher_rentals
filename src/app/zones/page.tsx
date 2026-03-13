"use client";

import React, { useState, useCallback, useEffect } from "react";
import { PageHeader } from "@/components/PageHeader";
import { PrimaryButton } from "@/components/PrimaryButton";
import { ZoneForm, ZoneQboClassMapping } from "./_components/ZoneForm";
import { ZoneCard } from "./_components/ZoneCard";
import { ZoneWithStateProvinces } from "./_lib/types";
import { fetchZones, createZone, updateZone, uploadZonePhoto } from "./_lib/db";
import { NAME_TO_ABBREV } from "./_components/mapData";
import { useClerkSupabaseClient } from "@/utils/supabase/useClerkSupabaseClient";
import { createSuccessToast } from "@/components/toasts/SuccessToast";
import { createErrorToastNoThrow } from "@/components/toasts/ErrorToast";
import LoadingSpinner from "@/components/LoadingSpinner";

type Mode = "list" | "create" | "edit";

export default function ZonesPage() {
  const supabase = useClerkSupabaseClient();
  const [zones, setZones] = useState<ZoneWithStateProvinces[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [mode, setMode] = useState<Mode>("list");
  const [editingZone, setEditingZone] = useState<ZoneWithStateProvinces | undefined>(undefined);

  const loadZones = useCallback(async () => {
    try {
      setLoading(true);
      const data = await fetchZones(supabase);
      setZones(data);
    } catch (err) {
      createErrorToastNoThrow(["Failed to load zones"]);
    } finally {
      setLoading(false);
    }
  }, [supabase]);

  useEffect(() => {
    loadZones();
  }, [loadZones]);

  // Compute which regions are unavailable (assigned to other zones)
  const getUnavailableRegions = useCallback((): Set<string> => {
    const unavailable = new Set<string>();
    for (const zone of zones) {
      // When editing, don't mark the current zone's regions as unavailable
      if (editingZone && zone.id === editingZone.id) continue;
      for (const sp of zone.state_provinces) {
        unavailable.add(NAME_TO_ABBREV[sp.state_province] ?? sp.state_province);
      }
    }
    return unavailable;
  }, [zones, editingZone]);

  const handleCreate = useCallback(
    async (
      displayName: string,
      description: string | null,
      stateProvinces: string[],
      mapImageBlob: Blob | null,
      qboClassMappings: ZoneQboClassMapping[],
    ) => {
      try {
        setSaving(true);
        const zoneId = await createZone(
          supabase,
          displayName,
          description,
          stateProvinces,
          qboClassMappings,
        );
        if (mapImageBlob) {
          await uploadZonePhoto(supabase, zoneId, mapImageBlob);
        }
        createSuccessToast([`Zone "${displayName}" created successfully`]);
        setMode("list");
        await loadZones();
      } catch (err) {
        createErrorToastNoThrow(["Failed to create zone"]);
      } finally {
        setSaving(false);
      }
    },
    [supabase, loadZones],
  );

  const handleUpdate = useCallback(
    async (
      displayName: string,
      description: string | null,
      stateProvinces: string[],
      mapImageBlob: Blob | null,
      qboClassMappings: ZoneQboClassMapping[],
    ) => {
      if (!editingZone) return;
      try {
        setSaving(true);
        await updateZone(
          supabase,
          editingZone.id,
          displayName,
          description,
          stateProvinces,
          qboClassMappings,
        );
        if (mapImageBlob) {
          await uploadZonePhoto(supabase, editingZone.id, mapImageBlob, editingZone.photo_path);
        }
        createSuccessToast([`Zone "${displayName}" updated successfully`]);
        setMode("list");
        setEditingZone(undefined);
        await loadZones();
      } catch (err) {
        createErrorToastNoThrow(["Failed to update zone"]);
      } finally {
        setSaving(false);
      }
    },
    [supabase, editingZone, loadZones],
  );

  const handleEdit = useCallback((zone: ZoneWithStateProvinces) => {
    setEditingZone(zone);
    setMode("edit");
  }, []);

  const handleCancel = useCallback(() => {
    setMode("list");
    setEditingZone(undefined);
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <LoadingSpinner />
      </div>
    );
  }

  if (mode === "create") {
    return (
      <div>
        <PageHeader
          title="Create New Zone"
          subtitle="Select states and provinces on the map to define this zone."
        />
        <ZoneForm
          unavailableRegions={getUnavailableRegions()}
          onSave={handleCreate}
          onCancel={handleCancel}
          saving={saving}
        />
      </div>
    );
  }

  if (mode === "edit" && editingZone) {
    return (
      <div>
        <PageHeader
          title={`Edit Zone: ${editingZone.display_name}`}
          subtitle="Update the zone name and selected states/provinces."
        />
        <ZoneForm
          zone={editingZone}
          unavailableRegions={getUnavailableRegions()}
          onSave={handleUpdate}
          onCancel={handleCancel}
          saving={saving}
        />
      </div>
    );
  }

  return (
    <div>
      <PageHeader
        title="Zones"
        subtitle="Manage geographic zones for scheduling and billing."
        action={<PrimaryButton onClick={() => setMode("create")}>+ Create New Zone</PrimaryButton>}
      />
      {zones.length === 0 ? (
        <div className="text-center py-16 text-gray-400">
          <p className="text-lg mb-2">No zones yet</p>
          <p className="text-sm">
            Create your first zone to start organizing states and provinces.
          </p>
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {zones.map((zone) => (
            <ZoneCard key={zone.id} zone={zone} onEdit={handleEdit} />
          ))}
        </div>
      )}
    </div>
  );
}
