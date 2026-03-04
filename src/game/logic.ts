import { Vector3D, GRID_WIDTH, GRID_HEIGHT, GRID_DEPTH } from './constants';

export function rotateX(shape: Vector3D[]): Vector3D[] {
  return shape.map(([x, y, z]) => [x, -z, y]);
}

export function rotateY(shape: Vector3D[]): Vector3D[] {
  return shape.map(([x, y, z]) => [z, y, -x]);
}

export function rotateZ(shape: Vector3D[]): Vector3D[] {
  return shape.map(([x, y, z]) => [-y, x, z]);
}

export function checkCollision(
  shape: Vector3D[],
  position: Vector3D,
  grid: (string | null)[][][]
): boolean {
  for (const [sx, sy, sz] of shape) {
    const x = position[0] + sx;
    const y = position[1] + sy;
    const z = position[2] + sz;

    // Boundary checks
    if (x < 0 || x >= GRID_WIDTH || y < 0 || y >= GRID_HEIGHT || z < 0) {
      return true;
    }
    
    // Grid collision (z can be >= GRID_DEPTH during spawning, but we check if it's within grid bounds)
    if (z < GRID_DEPTH && grid[z][y][x] !== null) {
      return true;
    }
  }
  return false;
}

export function createEmptyGrid(): (string | null)[][][] {
  return Array.from({ length: GRID_DEPTH }, () =>
    Array.from({ length: GRID_HEIGHT }, () =>
      Array.from({ length: GRID_WIDTH }, () => null)
    )
  );
}

export function clearFullLayers(grid: (string | null)[][][]): { newGrid: (string | null)[][][], clearedCount: number } {
  const newGrid = grid.filter(layer => 
    layer.some(row => row.some(cell => cell === null))
  );
  const clearedCount = GRID_DEPTH - newGrid.length;
  
  while (newGrid.length < GRID_DEPTH) {
    newGrid.push(
      Array.from({ length: GRID_HEIGHT }, () =>
        Array.from({ length: GRID_WIDTH }, () => null)
      )
    );
  }
  
  return { newGrid, clearedCount };
}
