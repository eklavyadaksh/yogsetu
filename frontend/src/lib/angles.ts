export interface LandmarkPoint {
  x: number;
  y: number;
  z?: number;
  visibility?: number;
}

/**
 * Calculates joint angle (in degrees) at vertex B given three points: A, B, C.
 * Angle = angle between vector BA and vector BC.
 */
export function calculateAngle(a: LandmarkPoint, b: LandmarkPoint, c: LandmarkPoint): number {
  const radians = Math.atan2(c.y - b.y, c.x - b.x) - Math.atan2(a.y - b.y, a.x - b.x);
  let angle = Math.abs((radians * 180.0) / Math.PI);
  if (angle > 180.0) {
    angle = 360.0 - angle;
  }
  return Math.round(angle * 10) / 10;
}

/**
 * Calculates inclination from vertical y-axis (degrees).
 * 0 = perfectly vertical, 90 = horizontal.
 */
export function calculateVerticalAngle(top: LandmarkPoint, bottom: LandmarkPoint): number {
  const dx = Math.abs(top.x - bottom.x);
  const dy = Math.abs(top.y - bottom.y);
  const angle = Math.atan2(dx, dy) * (180 / Math.PI);
  return Math.round(angle * 10) / 10;
}

/**
 * Computes midpoint between two landmarks.
 */
export function getMidpoint(a: LandmarkPoint, b: LandmarkPoint): LandmarkPoint {
  return {
    x: (a.x + b.x) / 2,
    y: (a.y + b.y) / 2,
    z: ((a.z || 0) + (b.z || 0)) / 2,
    visibility: Math.min(a.visibility || 1, b.visibility || 1),
  };
}
