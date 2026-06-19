import { Container, Graphics, Sprite } from "pixi.js";
import { Baker } from "../util/Baker";
import { Bleacher } from "../types";

/**
 * Returns true if the current user has access to the given bleacher.
 * Reads the pre-computed `isAccessible` flag set during data assembly — avoids
 * calling usePermissionsStore on every cell render.
 */
export function isBleacherAccessible(bleacher: Bleacher | undefined): boolean {
  return bleacher?.isAccessible ?? false;
}
