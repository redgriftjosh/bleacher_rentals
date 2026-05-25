import { Container, Text, Graphics, Application } from "pixi.js";
import { EventSpanType } from "../../util/Events";
import { LabelText } from "./LabelText";
import { GoodShuffleIcon } from "./GoodShuffleIcon";
import { AlertCount } from "./AlertCount";
import { Baker } from "../../util/Baker";
import { loadEventById } from "../../db/client/loadEventById";
import { supabaseClientRegistry } from "../../util/supabaseClientRegistry";
import { useDashboardAlertsStore } from "../../state/useDashboardAlertsStore";

/**
 * Event cell label that can render in different modes for optimal caching
 * - static: Just text, can be fully baked
 * - dynamic: Text + static triangle, can be baked as unit
 * - separated: Text baked separately, triangle rendered live for animation
 *
 * Alert badges are driven by the useDashboardAlertsStore Zustand store.
 * Dashboard.ts subscribes to that store and triggers scheduleRecompute(),
 * which rebuilds all grids and re-creates PinnableSections with fresh counts.
 * No per-instance subscription is needed (and would leak because the grid
 * uses removeChildren() without calling destroy()).
 */
export class PinnableSection extends Container {
  private labelText: LabelText;
  private eventInfo: EventSpanType;

  constructor(
    eventInfo: EventSpanType,
    app: Application,
    baker: Baker,
    availableWidth?: number,
  ) {
    super();
    this.position.set(4, 4);

    this.eventInfo = eventInfo;

    // Make clickable
    this.eventMode = "static";
    this.cursor = "pointer";
    this.on("pointerdown", this.handleClick.bind(this));

    // Count alerts for this span (read once at construction; Dashboard recompute
    // rebuilds PinnableSections when alert data changes)
    const alertCount = this.countAlerts();

    // Only add badge if there are alerts — don't add to scene graph at all when 0
    if (alertCount > 0) {
      const alertBadge = new AlertCount(alertCount);
      alertBadge.position.set(-2, -2);
      this.addChild(alertBadge);
    }

    // Shift label right to make room for badge when present
    const BADGE_OFFSET = alertCount > 0 ? 14 : 0;
    this.labelText = new LabelText(eventInfo, availableWidth);
    this.labelText.position.set(BADGE_OFFSET, 0);
    if (eventInfo.ev.goodshuffleUrl) {
      const labelDimensions = this.labelText.getNameLabelDimensions();
      const gsLogo = new GoodShuffleIcon(baker, eventInfo.ev.goodshuffleUrl);
      gsLogo.position.set(
        BADGE_OFFSET + labelDimensions.width + 4,
        0,
      );
      this.addChild(gsLogo);
    }
    this.addChild(this.labelText);
  }

  /**
   * Count alerts relevant to this span:
   * - entity_type "bleacher_event" + entity_uuid matches this bleacherEventUuid
   * - entity_type "event" + entity_uuid matches this eventUuid (event-level → all spans)
   */
  private countAlerts(): number {
    const alerts = useDashboardAlertsStore.getState().alerts;
    const { bleacherEventUuid, eventUuid } = this.eventInfo.ev;

    console.log("[AlertCount]", {
      eventName: this.eventInfo.ev.eventName,
      bleacherEventUuid,
      eventUuid,
      totalAlertsInStore: alerts.length,
      alerts: alerts.map(a => ({ entity_type: a.entity_type, entity_uuid: a.entity_uuid })),
    });

    let count = 0;
    for (const a of alerts) {
      if (
        a.entity_type === "bleacher_event" &&
        a.entity_uuid === bleacherEventUuid
      ) {
        count++;
      } else if (a.entity_type === "event" && a.entity_uuid === eventUuid) {
        count++;
      }
    }

    console.log("[AlertCount] result:", { eventName: this.eventInfo.ev.eventName, bleacherEventUuid, count });
    return count;
  }

  private async handleClick(e: any) {
    // Don't handle if clicking on an interactive child (like GoodShuffleIcon)
    let target = e.target;
    while (target && target !== this) {
      if (target.eventMode === "static" && target !== this.labelText) {
        return;
      }
      target = target.parent;
    }

    const supabase = supabaseClientRegistry.getClient();

    if (!supabase) {
      console.warn("No Supabase client available");
      return;
    }

    await loadEventById(this.eventInfo.ev.eventUuid, supabase);
  }

  /**
   * Clean up resources
   */
  destroy(options?: Parameters<Container["destroy"]>[0]) {
    this.off("pointerenter");
    this.off("pointerleave");
    super.destroy(options);
  }
}
