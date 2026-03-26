import { Container, FederatedPointerEvent } from "pixi.js";
import { Baker } from "../../../util/Baker";
import { CELL_HEIGHT, CELL_WIDTH } from "../../../values/constants";
import type { BleacherWorkTracker } from "../../../types";
import { WorkTrackerFull } from "./WorkTrackerFull";
import { WorkTrackerHalf } from "./WorkTrackerHalf";
import { WorkTrackerSmall } from "./WorkTrackerSmall";
import { WorkTrackerDragManager } from "../../../util/WorkTrackerDragManager";

const MAX_SMALL_THUMBNAILS = 4;
const DRAG_THRESHOLD = 6; // px movement before drag starts

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
      const sprite = new WorkTrackerFull(baker, sorted[0]);
      sprite.position.set(-1, -1);
      this.addInteractionHandler(sprite, sorted[0], bleacherUuid, date, onTrackerClick);
      this.addChild(sprite);
    } else if (!useSmall && sorted.length === 2) {
      // Two halves side by side
      const halfW = Math.floor(CELL_WIDTH / 2);
      const left = new WorkTrackerHalf(baker, sorted[0], true);
      left.position.set(-1, -1);
      this.addInteractionHandler(left, sorted[0], bleacherUuid, date, onTrackerClick);
      this.addChild(left);

      const right = new WorkTrackerHalf(baker, sorted[1], false);
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
        const small = new WorkTrackerSmall(baker, sorted[i]);
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
   * - Movement > DRAG_THRESHOLD → initiates drag-and-drop
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

    let downX = 0;
    let downY = 0;
    let isDown = false;
    let dragStarted = false;

    const onMove = (e: FederatedPointerEvent) => {
      if (!isDown) return;
      const dx = e.global.x - downX;
      const dy = e.global.y - downY;
      if (!dragStarted && dx * dx + dy * dy > DRAG_THRESHOLD * DRAG_THRESHOLD) {
        dragStarted = true;
        // Initiate drag via the manager
        WorkTrackerDragManager.startDrag(
          { tracker, sourceBleacherUuid: bleacherUuid, sourceDate: date },
          e.global.x,
          e.global.y,
        );
        // Remove move listener from this target — manager takes over on stage
        target.off("pointermove", onMove);
      }
    };

    target.on("pointerdown", (e: FederatedPointerEvent) => {
      e.stopPropagation();
      downX = e.global.x;
      downY = e.global.y;
      isDown = true;
      dragStarted = false;
      target.cursor = "grabbing";
      target.on("pointermove", onMove);
    });

    target.on("pointerup", (e: FederatedPointerEvent) => {
      e.stopPropagation();
      target.off("pointermove", onMove);
      target.cursor = "grab";
      if (isDown && !dragStarted) {
        onClick(tracker);
      }
      isDown = false;
      dragStarted = false;
    });

    target.on("pointerupoutside", () => {
      target.off("pointermove", onMove);
      target.cursor = "grab";
      isDown = false;
      dragStarted = false;
    });

    target.on("pointertap", (e: FederatedPointerEvent) => e.stopPropagation());
    target.on("click", (e: FederatedPointerEvent) => e.stopPropagation());
  }
}
