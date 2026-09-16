export interface Box2D {
  id: string;
  minX: number;
  minY: number;
  maxX: number;
  maxY: number;
  padding?: number;
}

export interface Point2D {
  x: number;
  y: number;
}

/**
 * 2D Spatial Occupancy & Collision Avoidance Manager.
 * Ensures zero overlaps between boxes, notes, flows, and diagrams.
 */
export class SpaceManager {
  private obstacles: Box2D[] = [];

  constructor(initialObstacles: Box2D[] = []) {
    this.obstacles = [...initialObstacles];
  }

  /**
   * Registers an obstacle box in the spatial manager.
   */
  public register(box: Box2D): void {
    this.obstacles.push(box);
  }

  /**
   * Clears all registered obstacles.
   */
  public clear(): void {
    this.obstacles = [];
  }

  /**
   * Gets all registered obstacles.
   */
  public getObstacles(): Box2D[] {
    return this.obstacles;
  }

  /**
   * Checks whether a candidate bounding box collides with any registered obstacle,
   * taking into account safe padding.
   */
  public collides(
    candidate: { x: number; y: number; width: number; height: number },
    padding = 24,
    ignoreId?: string,
  ): boolean {
    const cMinX = candidate.x - padding;
    const cMinY = candidate.y - padding;
    const cMaxX = candidate.x + candidate.width + padding;
    const cMaxY = candidate.y + candidate.height + padding;

    for (const obs of this.obstacles) {
      if (ignoreId && obs.id === ignoreId) continue;
      const obsPadding = obs.padding ?? 0;
      const oMinX = obs.minX - obsPadding;
      const oMinY = obs.minY - obsPadding;
      const oMaxX = obs.maxX + obsPadding;
      const oMaxY = obs.maxY + obsPadding;

      const noOverlap =
        cMaxX <= oMinX || cMinX >= oMaxX || cMaxY <= oMinY || cMinY >= oMaxY;

      if (!noOverlap) {
        return true;
      }
    }
    return false;
  }

  /**
   * Finds the closest collision-free position for a candidate box by shifting
   * along a search direction vector (dirX, dirY).
   */
  public findClearPosition(
    candidate: { x: number; y: number; width: number; height: number },
    dirX: number,
    dirY: number,
    step = 20,
    maxSteps = 60,
    padding = 24,
    ignoreId?: string,
  ): { x: number; y: number } {
    let curX = candidate.x;
    let curY = candidate.y;

    for (let s = 0; s < maxSteps; s++) {
      if (
        !this.collides(
          { x: curX, y: curY, width: candidate.width, height: candidate.height },
          padding,
          ignoreId,
        )
      ) {
        return { x: curX, y: curY };
      }
      curX += dirX * step;
      curY += dirY * step;
    }

    return { x: curX, y: curY };
  }

  /**
   * Checks if a line segment between (x1, y1) and (x2, y2) intersects any obstacle box.
   * Uses Liang-Barsky parametric clipping algorithm.
   */
  public segmentIntersectsAnyObstacle(
    x1: number,
    y1: number,
    x2: number,
    y2: number,
    ignoreIds: Set<string>,
    margin = 6,
  ): boolean {
    for (const obs of this.obstacles) {
      if (ignoreIds.has(obs.id)) continue;
      if (lineIntersectsBox(x1, y1, x2, y2, obs, margin)) {
        return true;
      }
    }
    return false;
  }
}

/**
 * Robust Liang-Barsky parametric 2D line segment vs AABB intersection test.
 */
export function lineIntersectsBox(
  x1: number,
  y1: number,
  x2: number,
  y2: number,
  box: Box2D,
  margin = 6,
): boolean {
  const minX = box.minX + margin;
  const maxX = box.maxX - margin;
  const minY = box.minY + margin;
  const maxY = box.maxY - margin;

  if (minX >= maxX || minY >= maxY) return false;

  // If either endpoint is strictly inside the box
  if (x1 > minX && x1 < maxX && y1 > minY && y1 < maxY) return true;
  if (x2 > minX && x2 < maxX && y2 > minY && y2 < maxY) return true;

  const dx = x2 - x1;
  const dy = y2 - y1;

  let t0 = 0;
  let t1 = 1;

  const p = [-dx, dx, -dy, dy];
  const q = [x1 - minX, maxX - x1, y1 - minY, maxY - y1];

  for (let i = 0; i < 4; i++) {
    if (p[i] === 0) {
      if (q[i]! < 0) return false;
    } else {
      const r = q[i]! / p[i]!;
      if (p[i]! < 0) {
        if (r > t1) return false;
        if (r > t0) t0 = r;
      } else {
        if (r < t0) return false;
        if (r < t1) t1 = r;
      }
    }
  }

  return t0 <= t1;
}
