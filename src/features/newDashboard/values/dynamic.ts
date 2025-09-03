import { Application } from "pixi.js";
import { DASHBOARD_PADDING_X, DASHBOARD_PADDING_Y, SCROLLBAR_THICKNESS } from "./constants";

export function getGridSize(app: Application) {
  const gridWidth = app.screen.width - DASHBOARD_PADDING_X * 2;
  const gridHeight = app.screen.height - DASHBOARD_PADDING_Y * 2;
  return { gridWidth, gridHeight };
}

/**
 * The horizontal scrollbar should always be under the grid.
 * The padding on the top and bottom of the dashboard are the same.  The scrollbar should be centered within that padding.
 */
export function getHorizontalScrollbarYPosition(app: Application): number {
  const { gridHeight } = getGridSize(app);
  const scrollbarY =
    DASHBOARD_PADDING_Y + gridHeight + (DASHBOARD_PADDING_Y - SCROLLBAR_THICKNESS) / 2;
  return scrollbarY;
}

/**
 * The vertical scrollbar should always be to the right of the grid.
 * The padding on the left and right of the dashboard are the same.  The scrollbar should be centered within that padding.
 */
export function getVerticalScrollbarXPosition(app: Application): number {
  const { gridWidth } = getGridSize(app);
  const scrollbarX =
    DASHBOARD_PADDING_X + gridWidth + (DASHBOARD_PADDING_X - SCROLLBAR_THICKNESS) / 2;
  return scrollbarX;
}
