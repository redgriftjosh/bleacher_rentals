import { db } from "@/components/providers/SystemProvider";
import { expect, typedExecute, typedGetAll } from "@/lib/powersync/typedQuery";
import { diffSprintLabels } from "../util/diffSprintLabels";
import type { FeatureForm } from "../forms";
import { DEFAULT_FEATURE_STATUS } from "../constants";
import type { FeatureStatus } from "../types";

/**
 * Insert an empty feature the moment "+ New Feature" is clicked.
 *
 * The row exists from the first click on: the modal always edits a real record, and
 * `title = ''` marks it as a draft that `discardFeatureDraft` cleans up if abandoned.
 */
export async function createDraftFeature(quarterId: string): Promise<string> {
  const id = crypto.randomUUID();
  await typedExecute(
    db
      .insertInto("RoadmapFeatures")
      .values({
        id,
        created_at: new Date().toISOString(),
        quarter_id: quarterId,
        title: "",
        description: null,
        status: DEFAULT_FEATURE_STATUS,
        sort_order: 0,
      })
      .compile(),
  );
  return id;
}

export async function updateFeature(featureId: string, form: FeatureForm): Promise<void> {
  await typedExecute(
    db
      .updateTable("RoadmapFeatures")
      .set({
        title: form.title.trim(),
        description: form.description.trim() ? form.description : null,
        status: form.status,
      })
      .where("id", "=", featureId)
      .compile(),
  );

  await syncFeatureSprintLabels(featureId, form.sprintIds);
}

/** Brings the junction table in line with the selection, writing only the difference. */
export async function syncFeatureSprintLabels(
  featureId: string,
  sprintIds: string[],
): Promise<void> {
  const existingRows = await typedGetAll(
    db
      .selectFrom("RoadmapFeatureSprintLabels")
      .select(["sprint_id"])
      .where("feature_id", "=", featureId)
      .compile(),
    expect<{ sprint_id: string | null }>(),
  );

  const existing = existingRows.map((r) => r.sprint_id).filter((id): id is string => id !== null);

  const { toAdd, toRemove } = diffSprintLabels(existing, sprintIds);

  if (toRemove.length > 0) {
    await typedExecute(
      db
        .deleteFrom("RoadmapFeatureSprintLabels")
        .where("feature_id", "=", featureId)
        .where("sprint_id", "in", toRemove)
        .compile(),
    );
  }

  for (const sprintId of toAdd) {
    await typedExecute(
      db
        .insertInto("RoadmapFeatureSprintLabels")
        .values({
          id: crypto.randomUUID(),
          feature_id: featureId,
          sprint_id: sprintId,
          created_at: new Date().toISOString(),
        })
        .compile(),
    );
  }
}

/** Soft delete — the Delete button. Restorable, and linked tasks keep their `feature_id`. */
export async function softDeleteFeature(featureId: string): Promise<void> {
  await typedExecute(
    db
      .updateTable("RoadmapFeatures")
      .set({ deleted_at: new Date().toISOString() })
      .where("id", "=", featureId)
      .compile(),
  );
}

export async function restoreFeature(featureId: string): Promise<void> {
  await typedExecute(
    db
      .updateTable("RoadmapFeatures")
      .set({ deleted_at: null })
      .where("id", "=", featureId)
      .compile(),
  );
}

/**
 * Hard-delete an abandoned draft. Unlike `softDeleteFeature` this leaves no trace:
 * the user opened "+ New Feature", typed nothing and closed the modal.
 */
export async function discardFeatureDraft(featureId: string): Promise<void> {
  await typedExecute(
    db.deleteFrom("RoadmapFeatureSprintLabels").where("feature_id", "=", featureId).compile(),
  );
  await typedExecute(db.deleteFrom("RoadmapFeatures").where("id", "=", featureId).compile());
}

export async function setFeatureStatus(featureId: string, status: FeatureStatus) {
  await typedExecute(
    db.updateTable("RoadmapFeatures").set({ status }).where("id", "=", featureId).compile(),
  );
}
