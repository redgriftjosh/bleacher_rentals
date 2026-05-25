import { Container, Graphics, Text } from "pixi.js";
import { useDashboardAlertsStore } from "../../state/useDashboardAlertsStore";

/**
 * Count alerts in the store matching the given entity UUID and type(s).
 * Works for any entity type: "bleacher_event", "event", "work_tracker".
 */
export function countAlertsForEntity(
  entityUuid: string,
  entityTypes: string | string[],
): number {
  const alerts = useDashboardAlertsStore.getState().alerts;
  const types = Array.isArray(entityTypes) ? entityTypes : [entityTypes];
  let count = 0;
  for (const a of alerts) {
    if (a.entity_uuid === entityUuid && types.includes(a.entity_type ?? "")) {
      count++;
    }
  }
  return count;
}

/**
 * Draw an alert badge (red circle + white count) into a container.
 * Use inside baker callbacks where AlertCount (a Container) can't be used as a Sprite.
 */
export function drawAlertBadge(
  parent: Container,
  count: number,
  x: number = 1,
  y: number = 1,
): void {
  if (count <= 0) return;
  const radius = 6;
  const circle = new Graphics();
  circle.circle(x + radius, y + radius, radius).fill(0xff0000);
  parent.addChild(circle);

  const label = new Text({
    text: String(count),
    style: {
      fontFamily: "Helvetica",
      fontSize: 9,
      fill: 0xffffff,
      align: "center",
    },
  });
  label.anchor.set(0.5, 0.5);
  label.position.set(x + radius, y + radius);
  parent.addChild(label);
}

/** 10×10 solid red circle with a white count number centred inside. */
export class AlertCount extends Container {
  private countLabel: Text;
  private circle: Graphics;

  constructor(count: number = 0) {
    super();

    const radius = 7;

    this.circle = new Graphics();
    this.circle.circle(radius, radius, radius).fill(0xff0000);
    this.addChild(this.circle);

    this.countLabel = new Text({
      text: String(count),
      style: {
        fontFamily: "Helvetica",
        fontSize: 10,
        fill: 0xffffff,
        align: "center",
      },
    });
    this.countLabel.anchor.set(0.5, 0.5);
    this.countLabel.position.set(radius, radius);
    this.addChild(this.countLabel);

    // Hide when count is 0
    this.visible = count > 0;
  }

  /** Update the displayed count. Hides badge when 0. */
  setCount(count: number) {
    this.countLabel.text = String(count);
    this.visible = count > 0;
  }
}
