"use client";

import { useSearchParams, useRouter } from "next/navigation";
import { useEffect, useState, useMemo, Suspense } from "react";
import { PageHeader } from "@/components/PageHeader";
import { useClerkSupabaseClient } from "@/utils/supabase/useClerkSupabaseClient";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { AlertTriangle, CheckCircle2, Plus, X } from "lucide-react";
import { DamageReportModal, EditDamageReport } from "./DamageReportModal";

type DamageSeverity = "none" | "minor" | "major";

type DamageReport = {
  id: string;
  bleacher_uuid: string;
  inspection_uuid: string | null;
  is_safe_to_sit: boolean;
  is_safe_to_haul: boolean;
  seat_damage: DamageSeverity;
  haul_damage: DamageSeverity;
  note: string | null;
  created_at: string;
  resolved_at: string | null;
  maintenance_event_uuid: string | null;
  bleacher: { bleacher_number: number } | null;
  maintenance_event: { event_name: string } | null;
  photos: { id: string; photo_path: string }[];
};

function DamageReportsContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const supabase = useClerkSupabaseClient();
  const queryClient = useQueryClient();
  const [showResolved, setShowResolved] = useState(false);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [editingReport, setEditingReport] = useState<DamageReport | null>(null);

  const bleacherUuid = searchParams.get("bleacher_uuid");

  // Fetch all bleachers for the filter dropdown
  const { data: bleachers = [] } = useQuery({
    queryKey: ["bleachers-for-filter"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("Bleachers")
        .select("id, bleacher_number")
        .eq("deleted", false)
        .order("bleacher_number", { ascending: true });
      if (error) throw error;
      return data;
    },
    enabled: !!supabase,
  });

  // Fetch damage reports
  const { data: reports = [], isLoading } = useQuery({
    queryKey: ["damage-reports", bleacherUuid],
    queryFn: async () => {
      let query = supabase
        .from("DamageReports")
        .select(
          `
          *,
          bleacher:Bleachers!DamageReports_bleacher_uuid_fkey(bleacher_number),
          maintenance_event:MaintenanceEvents!DamageReports_maintenance_event_uuid_fkey(event_name),
          photos:DamageReportPhotos!DamageReportPhotos_damage_report_uuid_fkey(id, photo_path)
        `,
        )
        .order("created_at", { ascending: false });

      if (bleacherUuid) {
        query = query.eq("bleacher_uuid", bleacherUuid);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data as DamageReport[];
    },
    enabled: !!supabase,
  });

  const filteredReports = useMemo(
    () =>
      reports.filter((r) =>
        showResolved ? r.resolved_at !== null : r.resolved_at === null,
      ),
    [reports, showResolved],
  );

  const selectedBleacherNumber = useMemo(() => {
    if (!bleacherUuid) return null;
    return bleachers.find((b) => b.id === bleacherUuid)?.bleacher_number ?? null;
  }, [bleacherUuid, bleachers]);

  const handleFilterChange = (uuid: string) => {
    const params = new URLSearchParams(searchParams.toString());
    if (uuid) {
      params.set("bleacher_uuid", uuid);
    } else {
      params.delete("bleacher_uuid");
    }
    router.push(`/damage-reports?${params.toString()}`);
  };

  return (
    <>
      <PageHeader
        title="Damage Reports"
        subtitle={
          selectedBleacherNumber
            ? `Showing for Bleacher #${selectedBleacherNumber}`
            : "All damage reports across the fleet"
        }
        action={
          <button
            onClick={() => setShowCreateModal(true)}
            className="flex items-center gap-2 px-4 py-2 bg-darkBlue text-white text-sm font-semibold rounded-md shadow-md hover:bg-lightBlue transition cursor-pointer"
          >
            <Plus className="h-4 w-4" />
            Create Damage Report
          </button>
        }
      />

      {/* Filter bar */}
      <div className="flex items-center gap-4 mb-6">
        <label className="text-sm font-medium text-gray-600">Filter by bleacher:</label>
        <select
          value={bleacherUuid ?? ""}
          onChange={(e) => handleFilterChange(e.target.value)}
          className="px-3 py-1.5 border rounded-md text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-darkBlue focus:border-0"
        >
          <option value="">All Bleachers</option>
          {bleachers.map((b) => (
            <option key={b.id} value={b.id}>
              #{b.bleacher_number}
            </option>
          ))}
        </select>
        {bleacherUuid && (
          <button
            onClick={() => handleFilterChange("")}
            className="text-sm text-gray-500 hover:text-gray-700 flex items-center gap-1 cursor-pointer"
          >
            <X className="h-3.5 w-3.5" />
            Clear
          </button>
        )}

        <button
          onClick={() => setShowResolved((v) => !v)}
          className={`ml-auto flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium rounded-md border transition cursor-pointer ${
            showResolved
              ? "border-green-300 bg-green-50 text-green-700 hover:bg-green-100"
              : "border-red-300 bg-red-50 text-red-700 hover:bg-red-100"
          }`}
        >
          {showResolved ? (
            <>
              <CheckCircle2 className="h-3.5 w-3.5" />
              Showing Resolved
            </>
          ) : (
            <>
              <AlertTriangle className="h-3.5 w-3.5" />
              Showing Open
            </>
          )}
        </button>
      </div>

      {isLoading ? (
        <div className="flex justify-center py-12">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-gray-200 border-t-darkBlue" />
        </div>
      ) : filteredReports.length === 0 ? (
        <div className="text-center py-12 text-gray-400">
          <AlertTriangle className="h-10 w-10 mx-auto mb-2 opacity-50" />
          <p className="text-sm">
            No {showResolved ? "resolved" : "open"} damage reports found.
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {filteredReports.map((report) => (
            <DamageReportCard
              key={report.id}
              report={report}
              onClick={() => setEditingReport(report)}
            />
          ))}
        </div>
      )}

      {/* Create modal */}
      {showCreateModal && (
        <DamageReportModal
          open={showCreateModal}
          onOpenChange={setShowCreateModal}
          onSaved={() => {
            setShowCreateModal(false);
            queryClient.invalidateQueries({ queryKey: ["damage-reports"] });
          }}
        />
      )}

      {/* Edit modal */}
      {editingReport && (
        <DamageReportModal
          open={!!editingReport}
          onOpenChange={(open) => {
            if (!open) setEditingReport(null);
          }}
          onSaved={() => {
            setEditingReport(null);
            queryClient.invalidateQueries({ queryKey: ["damage-reports"] });
          }}
          editReport={editingReport as EditDamageReport}
        />
      )}
    </>
  );
}

// ─── Severity Badge ──────────────────────────────────────────────────────────

const SEVERITY_COLORS: Record<DamageSeverity, string> = {
  none: "text-green-700",
  minor: "text-yellow-700",
  major: "text-red-700",
};

function SeverityBadge({ label, severity }: { label: string; severity: DamageSeverity }) {
  return (
    <span className={`font-medium capitalize ${SEVERITY_COLORS[severity]}`}>
      {label}: {severity}
    </span>
  );
}

// ─── Damage Report Card ───────────────────────────────────────────────────────

function DamageReportCard({ report, onClick }: { report: DamageReport; onClick: () => void }) {
  const isResolved = !!report.resolved_at;

  return (
    <div
      onClick={onClick}
      className={`border rounded-lg p-4 bg-white shadow-sm cursor-pointer hover:shadow-md transition ${
        isResolved ? "border-gray-200" : "border-red-300 bg-red-50/30"
      }`}
    >
      <div className="flex items-start justify-between gap-4">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <span className="font-semibold text-sm text-gray-900">
              Bleacher #{report.bleacher?.bleacher_number ?? "?"}
            </span>
            {isResolved ? (
              <span className="inline-flex items-center gap-1 text-xs font-medium text-green-700 bg-green-100 px-2 py-0.5 rounded-full">
                <CheckCircle2 className="h-3 w-3" />
                Resolved
              </span>
            ) : (
              <span className="inline-flex items-center gap-1 text-xs font-medium text-red-700 bg-red-100 px-2 py-0.5 rounded-full">
                <AlertTriangle className="h-3 w-3" />
                Open
              </span>
            )}
          </div>

          <div className="flex gap-4 text-xs text-gray-500 mb-2">
            <span>Created {new Date(report.created_at).toLocaleDateString()}</span>
            {isResolved && (
              <span>Resolved {new Date(report.resolved_at!).toLocaleDateString()}</span>
            )}
          </div>

          <div className="flex gap-4 text-xs mb-2">
            <SeverityBadge label="Seat" severity={report.seat_damage} />
            <SeverityBadge label="Haul" severity={report.haul_damage} />
          </div>

          {report.note && <p className="text-sm text-gray-700 mb-2">{report.note}</p>}

          {report.maintenance_event && (
            <p className="text-xs text-gray-500">
              Linked to: <span className="font-medium">{report.maintenance_event.event_name}</span>
            </p>
          )}
        </div>

        {report.photos.length > 0 && (
          <div className="flex gap-2 flex-shrink-0">
            {report.photos.slice(0, 3).map((photo) => (
              <PhotoThumbnail key={photo.id} photoPath={photo.photo_path} />
            ))}
            {report.photos.length > 3 && (
              <span className="text-xs text-gray-400 self-end">
                +{report.photos.length - 3} more
              </span>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

function PhotoThumbnail({ photoPath }: { photoPath: string }) {
  const supabase = useClerkSupabaseClient();
  const [url, setUrl] = useState<string | null>(null);

  useEffect(() => {
    if (!supabase || !photoPath) return;
    const { data } = supabase.storage.from("damage-report-photos").getPublicUrl(photoPath);
    if (data?.publicUrl) setUrl(data.publicUrl);
  }, [supabase, photoPath]);

  if (!url) return <div className="w-16 h-16 bg-gray-100 rounded animate-pulse" />;

  return (
    <a href={url} target="_blank" rel="noopener noreferrer">
      <img
        src={url}
        alt="Damage report photo"
        className="w-16 h-16 object-cover rounded border border-gray-200 hover:opacity-80 transition"
      />
    </a>
  );
}

export default function DamageReportsPage() {
  return (
    <Suspense
      fallback={
        <div className="flex justify-center py-12">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-gray-200 border-t-darkBlue" />
        </div>
      }
    >
      <DamageReportsContent />
    </Suspense>
  );
}
