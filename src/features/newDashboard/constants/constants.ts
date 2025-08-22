/**
 * World & chunk sizing. Tweak these to scale load.
 *
 * CELL_*   : size of one logical "cell" (what you called a tile box)
 * CHUNK_*  : how many cells per chunk; chunk = single sprite built from a canvas
 */
export const CELL_W = 100;
export const CELL_H = 50;

export const CHUNK_COLS = 12;
export const CHUNK_ROWS = 8;

export const CHUNK_W = CELL_W * CHUNK_COLS;
export const CHUNK_H = CELL_H * CHUNK_ROWS;

/**
 * Camera/streaming defaults.
 * "ring" is how many chunk rings around the camera we keep resident:
 * visible chunks ≈ (2*ring + 1)^2
 */
export const DEFAULT_RING = 2;

/** Movement speed (px/sec). Just for the demo controls. */
export const CAMERA_SPEED = 600;
