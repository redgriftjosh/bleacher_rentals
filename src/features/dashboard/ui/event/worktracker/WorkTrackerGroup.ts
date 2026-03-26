import { Container, FederatedPointerEvent } from "pixi.js";
import { Baker } from "../../../util/Baker";
import { CELL_HEIGHT, CELL_WIDTH } from "../../../values/constants";
import type { BleacherWorkTracker } from "../../../types";
import { WorkTrackerFull } from "./WorkTrackerFull";
import { WorkTrackerHalf } from "./WorkTrackerHalf";
import { WorkTrackerSmall } from "./WorkTrackerSmall";

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
 */
export class WorkTrackerGroup extends Container {
  constructor(
    baker: Baker,
    trackers: BleacherWorkTracker[],
    hasEventOverlap: boolean,
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
      this.addClickHandler(sprite, sorted[0], onTrackerClick);
      this.addChild(sprite);
    } else if (!useSmall && sorted.length === 2) {
      // Two halves side by side
      const halfW = Math.floor(CELL_WIDTH / 2);
      const left = new WorkTrackerHalf(baker, sorted[0], true);
      left.position.set(-1, -1);
      this.addClickHandler(left, sorted[0], onTrackerClick);
      this.addChild(left);

      const right = new WorkTrackerHalf(baker, sorted[1], false);
      right.position.set(halfW - 1, -1);
      this.addClickHandler(right, sorted[1], onTrackerClick);
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
        this.addClickHandler(small, sorted[i], onTrackerClick);
        this.addChild(small);
      }
    }

    // Block propagation from the whole group so tile click doesn't fire
    this.eventMode = "static";
    this.cursor = "pointer";
    this.on("pointerdown", (e: FederatedPointerEvent) => e.stopPropagation());
  }

  private addClickHandler(
    target: Container,
    tracker: BleacherWorkTracker,
    onClick: (tracker: BleacherWorkTracker) => void,
  ) {
    target.eventMode = "static";
    target.cursor = "pointer";
    target.on("pointerup", (e: FederatedPointerEvent) => {
      e.stopPropagation();
      onClick(tracker);
    });
    target.on("pointertap", (e: FederatedPointerEvent) => e.stopPropagation());
    target.on("click", (e: FederatedPointerEvent) => e.stopPropagation());
  }
}
