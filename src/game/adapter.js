import { getPiece } from '../engine/pieces';

/**
 * Adapter functions converting pure engine piece references into the shapes
 * expected by UI components (Tray, HoldSlot, Piece).
 *
 * Engine pieces: { id: string, color: number }
 * UI pieces: { id: string, color: number, cells: Array<[number, number]> }
 */

const pieceCache = new WeakMap();
const trayCache = new WeakMap();

/**
 * Converts an engine piece ref ({ id, color }) into the shape expected by UI components.
 * Cells are looked up from the engine piece catalog.
 *
 * @param {{ id: string, color: number, cells?: Array<[number, number]> } | null} pieceRef
 * @returns {{ id: string, color: number, cells: Array<[number, number]> } | null}
 */
export function adaptPiece(pieceRef) {
  if (!pieceRef || typeof pieceRef !== 'object' || !pieceRef.id) {
    return null;
  }

  const cached = pieceCache.get(pieceRef);
  if (
    cached &&
    cached.id === pieceRef.id &&
    cached.color === pieceRef.color &&
    (!pieceRef.cells || cached.cells === pieceRef.cells)
  ) {
    return cached;
  }

  const catalogPiece = getPiece(pieceRef.id);
  const cells = catalogPiece ? catalogPiece.cells : pieceRef.cells;

  if (!cells) {
    return null;
  }

  const adapted = {
    id: pieceRef.id,
    color: pieceRef.color,
    cells,
  };

  try {
    pieceCache.set(pieceRef, adapted);
  } catch {
    // Ignore if not a valid WeakMap key
  }

  return adapted;
}

/**
 * Converts an engine tray array into the shape expected by Tray component.
 *
 * @param {Array<{ id: string, color: number } | null>} tray
 * @returns {Array<{ id: string, color: number, cells: Array<[number, number]> } | null>}
 */
export function adaptTray(tray) {
  if (!Array.isArray(tray)) {
    return [null, null, null];
  }

  const cached = trayCache.get(tray);
  if (cached) {
    return cached;
  }

  const adapted = tray.map(adaptPiece);
  try {
    trayCache.set(tray, adapted);
  } catch {
    // Ignore if not a valid WeakMap key
  }

  return adapted;
}
