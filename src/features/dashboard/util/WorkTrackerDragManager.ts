import { Application, Container, Graphics, Text, FederatedPointerEvent } from "pixi.js";
import {
  CELL_HEIGHT,
  CELL_WIDTH,
  BLEACHER_COLUMN_WIDTH,
  HEADER_ROW_HEIGHT,
} from "../values/constants";
import type { BleacherWorkTracker } from "../types";
import { STATUS_TINT } from "../ui/event/worktracker/statusTint";
import { useDashboardBleachersStore } from "../state/useDashboardBleachersStore";
import { createErrorToast } from "@/components/toasts/ErrorToast";
import { createSuccessToast } from "@/components/toasts/SuccessToast";
import { moveWorkTracker } from "@/features/dashboard/db/client/db";
import { canEditWorkTrackerByUuid } from "@/features/workTrackers/db/workTrackerEditAccess";
import { isWorkTrackerBlockedFromEdit } from "@/features/workTrackers/util/workTrackerEditPolicy";
import { useWorkTrackerDragConfirmStore } from "@/features/workTrackers/state/useWorkTrackerDragConfirmStore";

interface GridInfo {
  getCurrentScrollX: () => number;
  getCurrentScrollY: () => number;
  getGlobalPosition: () => { x: number; y: number };
}

interface DragContext {
  tracker: BleacherWorkTracker;
  sourceBleacherUuid: string;
  sourceDate: string;
}

interface PendingDrag {
  ctx: DragContext;
  startX: number;
  startY: number;
  onClick: () => void;
  onEnd: () => void;
}

const DRAG_THRESHOLD = 6;

/**
 * Singleton manager for work tracker drag-and-drop on the PixiJS dashboard.
 *
 * Lifecycle:
 *  1. `init(app, gridInfo, dates, rowBleacherUuids)` — called once when the dashboard boots
 *  2. `startDrag(ctx, globalX, globalY)` — called from WorkTrackerGroup on pointerdown
 *  3. Internally tracks pointer → shows ghost → on pointerup resolves target cell
 *  4. Persists via PowerSync (`moveWorkTracker`)
 *  5. Optimistically updates the dashboard store
 */
class _WorkTrackerDragManager {
  private app: Application | null = null;
  private gridInfo: GridInfo | null = null;
  private dates: string[] = [];
  private rowBleacherUuids: string[] = [];

  private isDragging = false;
  private dragCtx: DragContext | null = null;
  private pendingDrag: PendingDrag | null = null;
  private ghost: Container | null = null;
  private highlight: Graphics | null = null;

  // Bound handlers for cleanup
  private onMoveBound = this.onPointerMove.bind(this);
  private onUpBound = this.onPointerUp.bind(this);

  /**
   * Initialise (or re-initialise) with the current dashboard state.
   * Safe to call multiple times (e.g. after setData rebuilds the grid).
   */
  init(app: Application, gridInfo: GridInfo, dates: string[], rowBleacherUuids: string[]) {
    this.app = app;
    this.gridInfo = gridInfo;
    this.dates = dates;
    this.rowBleacherUuids = rowBleacherUuids;
  }

  /** Update just the row mapping (e.g. after filter changes) */
  updateRows(rowBleacherUuids: string[]) {
    this.rowBleacherUuids = rowBleacherUuids;
  }

  /** Update just the dates (e.g. after date range changes) */
  updateDates(dates: string[]) {
    this.dates = dates;
  }

  /**
   * Claim a tracker pointer sequence from the stage. This is intentionally done
   * on pointerdown, before the drag threshold is crossed: event spans underneath
   * trackers are also interactive and otherwise can take the next pointermove.
   */
  beginPendingDrag(
    ctx: DragContext,
    globalX: number,
    globalY: number,
    onClick: () => void,
    onEnd: () => void,
  ) {
    if (!this.app || !this.gridInfo) return false;
    if (this.isDragging || this.pendingDrag) return false;

    this.pendingDrag = { ctx, startX: globalX, startY: globalY, onClick, onEnd };

    this.app.stage.on("pointermove", this.onMoveBound);
    this.app.stage.on("pointerup", this.onUpBound);
    this.app.stage.on("pointerupoutside", this.onUpBound);
    return true;
  }

  private startDrag(ctx: DragContext, globalX: number, globalY: number) {
    if (!this.app || !this.gridInfo || this.isDragging) return;

    this.isDragging = true;
    this.dragCtx = ctx;

    // Create ghost
    this.ghost = this.createGhost(ctx.tracker);
    this.ghost.position.set(globalX, globalY);
    this.app.stage.addChild(this.ghost);

    // Create cell highlight
    this.highlight = new Graphics();
    this.highlight.visible = false;
    this.app.stage.addChild(this.highlight);
  }

  private onPointerMove(e: FederatedPointerEvent) {
    if (this.pendingDrag && !this.isDragging) {
      const dx = e.global.x - this.pendingDrag.startX;
      const dy = e.global.y - this.pendingDrag.startY;
      if (dx * dx + dy * dy > DRAG_THRESHOLD * DRAG_THRESHOLD) {
        this.startDrag(this.pendingDrag.ctx, e.global.x, e.global.y);
      }
      return;
    }

    if (!this.isDragging || !this.ghost || !this.highlight || !this.gridInfo) return;

    const gx = e.global.x;
    const gy = e.global.y;

    // Move ghost
    this.ghost.position.set(gx, gy);

    // Calculate target cell
    const target = this.globalToCell(gx, gy);
    if (target) {
      const gridPos = this.gridInfo.getGlobalPosition();
      const cellScreenX = gridPos.x + target.col * CELL_WIDTH - this.gridInfo.getCurrentScrollX();
      const cellScreenY = gridPos.y + target.row * CELL_HEIGHT - this.gridInfo.getCurrentScrollY();

      this.highlight.clear();
      this.highlight
        .rect(cellScreenX, cellScreenY, CELL_WIDTH, CELL_HEIGHT)
        .stroke({ width: 2, color: 0x3b82f6, alpha: 0.8 });
      this.highlight
        .rect(cellScreenX + 1, cellScreenY + 1, CELL_WIDTH - 2, CELL_HEIGHT - 2)
        .fill({ color: 0x3b82f6, alpha: 0.15 });
      this.highlight.visible = true;
    } else {
      this.highlight.visible = false;
    }
  }

  private async onPointerUp(e: FederatedPointerEvent) {
    if (this.pendingDrag && !this.isDragging) {
      const { onClick } = this.pendingDrag;
      this.cleanup();
      onClick();
      return;
    }

    if (!this.isDragging || !this.dragCtx) {
      this.cleanup();
      return;
    }

    const target = this.globalToCell(e.global.x, e.global.y);
    const ctx = this.dragCtx;
    this.cleanup();

    if (!target) return;

    const targetBleacherUuid = this.rowBleacherUuids[target.row];
    const targetDate = this.dates[target.col];

    if (!targetBleacherUuid || !targetDate) return;

    // No-op if dropped on same cell
    if (targetBleacherUuid === ctx.sourceBleacherUuid && targetDate === ctx.sourceDate) return;

    const canEdit = await canEditWorkTrackerByUuid(ctx.tracker.workTrackerUuid);
    if (!canEdit) {
      createErrorToast(["You do not have permission to move this work tracker."]);
      return;
    }

    if (isWorkTrackerBlockedFromEdit(ctx.tracker.status)) {
      createErrorToast([
        "This trip is in progress and cannot be moved. Contact a lead account manager if changes are needed.",
      ]);
      return;
    }

    if (ctx.tracker.status === "accepted") {
      const confirmed = await useWorkTrackerDragConfirmStore.getState().requestConfirm(ctx.tracker);
      if (!confirmed) return;
    }

    const nextStatus = ctx.tracker.status === "accepted" ? "released" : ctx.tracker.status;

    // Optimistic local update
    this.optimisticMove(
      ctx.tracker,
      ctx.sourceBleacherUuid,
      targetBleacherUuid,
      targetDate,
      nextStatus,
    );

    try {
      await moveWorkTracker({
        workTrackerUuid: ctx.tracker.workTrackerUuid,
        targetBleacherUuid,
        targetDate,
        previousStatus: ctx.tracker.status,
        previousBleacherUuid: ctx.sourceBleacherUuid,
        driverUuid: ctx.tracker.driverUuid,
        date: ctx.sourceDate,
        dropoffAddress: ctx.tracker.dropoffAddress ?? "an unknown dropoff location",
      });
    } catch (err) {
      this.optimisticMove(
        { ...ctx.tracker, date: targetDate, status: nextStatus },
        targetBleacherUuid,
        ctx.sourceBleacherUuid,
        ctx.sourceDate,
        ctx.tracker.status,
      );
      createErrorToast(["Failed to move work tracker.", String(err)]);
      return;
    }

    createSuccessToast(["Work tracker moved successfully."]);
  }

  /**
   * Convert global screen coordinates to grid row/col.
   * Returns null if outside the grid bounds.
   */
  private globalToCell(gx: number, gy: number): { row: number; col: number } | null {
    if (!this.gridInfo) return null;

    const gridPos = this.gridInfo.getGlobalPosition();
    const localX = gx - gridPos.x + this.gridInfo.getCurrentScrollX();
    const localY = gy - gridPos.y + this.gridInfo.getCurrentScrollY();

    if (localX < 0 || localY < 0) return null;

    const col = Math.floor(localX / CELL_WIDTH);
    const row = Math.floor(localY / CELL_HEIGHT);

    if (row < 0 || row >= this.rowBleacherUuids.length) return null;
    if (col < 0 || col >= this.dates.length) return null;

    return { row, col };
  }

  /**
   * Optimistically move a work tracker between bleachers in the local store.
   */
  private optimisticMove(
    tracker: BleacherWorkTracker,
    fromBleacherUuid: string,
    toBleacherUuid: string,
    toDate: string,
    statusOverride?: BleacherWorkTracker["status"],
  ) {
    const movedTracker: BleacherWorkTracker = {
      ...tracker,
      date: toDate,
      ...(statusOverride ? { status: statusOverride } : {}),
    };
    const store = useDashboardBleachersStore.getState();
    const sameBleacher = fromBleacherUuid === toBleacherUuid;
    const bleachers = store.data.map((b) => {
      if (sameBleacher && b.bleacherUuid === fromBleacherUuid) {
        return {
          ...b,
          workTrackers: [
            ...b.workTrackers.filter((wt) => wt.workTrackerUuid !== tracker.workTrackerUuid),
            movedTracker,
          ],
        };
      }
      if (b.bleacherUuid === fromBleacherUuid) {
        return {
          ...b,
          workTrackers: b.workTrackers.filter(
            (wt) => wt.workTrackerUuid !== tracker.workTrackerUuid,
          ),
        };
      }
      if (b.bleacherUuid === toBleacherUuid) {
        return {
          ...b,
          workTrackers: [...b.workTrackers, movedTracker],
        };
      }
      return b;
    });
    store.setData(bleachers);
  }

  /**
   * Create a small ghost sprite to follow the cursor during drag.
   */
  private createGhost(tracker: BleacherWorkTracker): Container {
    const size = 40;
    const container = new Container();
    container.alpha = 0.8;
    container.pivot.set(size / 2, size / 2);

    const bg = new Graphics().rect(0, 0, size, size).fill(STATUS_TINT[tracker.status] ?? 0x808080);
    bg.stroke({ width: 1, color: 0x000000, alpha: 0.5 });
    container.addChild(bg);

    const initials =
      (tracker.driverFirstName?.charAt(0) ?? "").toUpperCase() +
      (tracker.driverLastName?.charAt(0) ?? "").toUpperCase();

    if (initials) {
      const txt = new Text({
        text: initials,
        style: { fontSize: 14, fontWeight: "600", fill: 0x000000, fontFamily: "Helvetica" },
      });
      txt.alpha = 0.6;
      txt.anchor.set(0.5, 0.5);
      txt.position.set(size / 2, size / 2);
      container.addChild(txt);
    }

    return container;
  }

  /**
   * Remove ghost, highlight and unbind stage listeners.
   */
  private cleanup() {
    const onEnd = this.pendingDrag?.onEnd;

    this.isDragging = false;
    this.dragCtx = null;
    this.pendingDrag = null;

    if (this.ghost) {
      this.ghost.destroy({ children: true });
      this.ghost = null;
    }
    if (this.highlight) {
      this.highlight.destroy();
      this.highlight = null;
    }
    if (this.app) {
      this.app.stage.off("pointermove", this.onMoveBound);
      this.app.stage.off("pointerup", this.onUpBound);
      this.app.stage.off("pointerupoutside", this.onUpBound);
    }
    onEnd?.();
  }

  /** Tear down all state (called on dashboard unmount). */
  destroy() {
    this.cleanup();
    this.app = null;
    this.gridInfo = null;
  }
}

/** Singleton instance */
export const WorkTrackerDragManager = new _WorkTrackerDragManager();
