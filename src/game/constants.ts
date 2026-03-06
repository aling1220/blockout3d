export const GRID_WIDTH = 5;
export const GRID_HEIGHT = 5;
export const GRID_DEPTH = 12;

export type Vector3D = [number, number, number];

export interface Tetromino {
  shape: Vector3D[];
  color: string;
}

export const TETROMINOES: Record<string, Tetromino> = {
  I: {
    shape: [[0, 0, 0], [1, 0, 0], [2, 0, 0], [3, 0, 0]],
    color: '#00ffff' // Cyan
  },
  O: {
    shape: [[0, 0, 0], [1, 0, 0], [0, 1, 0], [1, 1, 0]],
    color: '#ffff00' // Yellow
  },
  T: {
    shape: [[0, 0, 0], [1, 0, 0], [2, 0, 0], [1, 1, 0]],
    color: '#ff00ff' // Magenta
  },
  S: {
    shape: [[1, 0, 0], [2, 0, 0], [0, 1, 0], [1, 1, 0]],
    color: '#00ff00' // Lime Green
  },
  Z: {
    shape: [[0, 0, 0], [1, 0, 0], [1, 1, 0], [2, 1, 0]],
    color: '#ff0000' // Red
  },
  J: {
    shape: [[0, 0, 0], [0, 1, 0], [1, 1, 0], [2, 1, 0]],
    color: '#0000ff' // Blue
  },
  L: {
    shape: [[2, 0, 0], [0, 1, 0], [1, 1, 0], [2, 1, 0]],
    color: '#ff8800' // Orange
  },
  /* 3D specific shapes (polycubes) - Commented out as requested
  P1: {
    shape: [[0, 0, 0], [1, 0, 0], [0, 1, 0], [0, 0, 1]],
    color: '#ffffff' // White
  },
  P2: {
    shape: [[0, 0, 0], [1, 0, 0], [0, 1, 0], [1, 1, 1]],
    color: '#ff0088' // Pink
  }
  */
};
