import { Container, FederatedPointerEvent } from "pixi.js";
import { Baker } from "../../../util/Baker";
import { CELL_HEIGHT, CELL_WIDTH } from "../../../values/constants";
import type { BleacherWorkTracker } from "../../../types";
import { WorkTrackerFull } from "./WorkTrackerFull";
import { WorkTrackerHalf } from "./WorkTrackerHalf";
import { WorkTrackerSmall } from "./WorkTrackerSmall";
import { WorkTrackerDragManager } from "../../../util/WorkTrackerDragManager";
import { isDriverUnavailable } from "../../../state/useDriverUnavailabilityStore";
import { useAlertCountsStore } from "../../../state/useAlertCountsStore";

const MAX_SMALL_THUMBNAILS = 4;
/**
 * Controller container that decides how to render work trackers for a cell.
 *
 * Display rules:
 *  - 1 tracker + no event overlap → WorkTrackerFull (entire cell)
 *  - 2 trackers + no event overlap → two WorkTrackerHalf side by side
 *  - Otherwise → WorkTrackerSmall thumbnails (max 4, bottom-left row, sorted by status)
 *
 * Always renders in front of events (caller sets zIndex on this container).
 * Uses bleed pattern: sprites positioned at (-1,-1) to overlap tile borders.
 * Supports drag-and-drop to move trackers between cells.
 */
export class WorkTrackerGroup extends Container {
  constructor(
    baker: Baker,
    trackers: BleacherWorkTracker[],
    hasEventOverlap: boolean,
    bleacherUuid: string,
    date: string,
    onTrackerClick: (tracker: BleacherWorkTracker) => void,
  ) {
    super();

    if (trackers.length === 0) return;

    const alertCounts = useAlertCountsStore.getState().byWorkTrackerUuid;

    // Sort trackers deterministically by status then driver name
    const sorted = [...trackers].sort((a, b) => {
      if (a.status !== b.status) return a.status.localeCompare(b.status);
      const nameA = `${a.driverFirstName ?? ""}${a.driverLastName ?? ""}`;
      const nameB = `${b.driverFirstName ?? ""}${b.driverLastName ?? ""}`;
      return nameA.localeCompare(nameB);
    });

    const useSmall = hasEventOverlap || sorted.length > 2;

    if (!useSmall && sorted.length === 1) {
      // Full-cell mode
      const unavail = isDriverUnavailable(sorted[0].driverUuid, date);
      const ac = alertCounts.get(sorted[0].workTrackerUuid) ?? 0;
      const sprite = new WorkTrackerFull(baker, sorted[0], unavail, ac);
      sprite.position.set(-1, -1);
      this.addInteractionHandler(sprite, sorted[0], bleacherUuid, date, onTrackerClick);
      this.addChild(sprite);
    } else if (!useSmall && sorted.length === 2) {
      // Two halves side by side
      const halfW = Math.floor(CELL_WIDTH / 2);
      const unavailL = isDriverUnavailable(sorted[0].driverUuid, date);
      const acL = alertCounts.get(sorted[0].workTrackerUuid) ?? 0;
      const left = new WorkTrackerHalf(baker, sorted[0], true, unavailL, acL);
      left.position.set(-1, -1);
      this.addInteractionHandler(left, sorted[0], bleacherUuid, date, onTrackerClick);
      this.addChild(left);

      const unavailR = isDriverUnavailable(sorted[1].driverUuid, date);
      const acR = alertCounts.get(sorted[1].workTrackerUuid) ?? 0;
      const right = new WorkTrackerHalf(baker, sorted[1], false, unavailR, acR);
      right.position.set(halfW - 1, -1);
      this.addInteractionHandler(right, sorted[1], bleacherUuid, date, onTrackerClick);
      this.addChild(right);
    } else {
      // Small thumbnails — bottom-left row
      const size = Math.floor(CELL_HEIGHT / 2);
      const count = Math.min(sorted.length, MAX_SMALL_THUMBNAILS);
      const gap = 0;
      const startY = CELL_HEIGHT - size - 1;

      for (let i = 0; i < count; i++) {
        const unavail = isDriverUnavailable(sorted[i].driverUuid, date);
        const ac = alertCounts.get(sorted[i].workTrackerUuid) ?? 0;
        const small = new WorkTrackerSmall(baker, sorted[i], unavail, ac);
        small.position.set(i * (size + gap), startY);
        this.addInteractionHandler(small, sorted[i], bleacherUuid, date, onTrackerClick);
        this.addChild(small);
      }
    }

    // Block propagation from the whole group so tile click doesn't fire
    this.eventMode = "static";
    this.cursor = "pointer";
    this.on("pointerdown", (e: FederatedPointerEvent) => e.stopPropagation());
  }

  /**
   * Adds pointer handlers that differentiate between click and drag.
   * - Small movement → click (opens modal)
   * - Movement > 6px → initiates drag-and-drop
   */
  private addInteractionHandler(
    target: Container,
    tracker: BleacherWorkTracker,
    bleacherUuid: string,
    date: string,
    onClick: (tracker: BleacherWorkTracker) => void,
  ) {
    target.eventMode = "static";
    target.cursor = "grab";

    target.on("pointerdown", (e: FederatedPointerEvent) => {
      e.stopPropagation();
      target.cursor = "grabbing";
      const dragStarted = WorkTrackerDragManager.beginPendingDrag(
        { tracker, sourceBleacherUuid: bleacherUuid, sourceDate: date },
        e.global.x,
        e.global.y,
        () => onClick(tracker),
        () => {
          target.cursor = "grab";
        },
      );
      if (!dragStarted) target.cursor = "grab";
    });

    target.on("pointertap", (e: FederatedPointerEvent) => e.stopPropagation());
    target.on("click", (e: FederatedPointerEvent) => e.stopPropagation());
  }
}
