import React, { useState, useEffect, useCallback, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  GRID_WIDTH, 
  GRID_HEIGHT, 
  GRID_DEPTH, 
  TETROMINOES, 
  Vector3D 
} from './game/constants';
import { 
  createEmptyGrid, 
  checkCollision, 
  rotateX, 
  rotateY, 
  rotateZ, 
  clearFullLayers 
} from './game/logic';
import GameCanvas from './components/GameCanvas';
import NextPiecePreview from './components/NextPiecePreview';
import { Trophy, Play, RotateCcw, ArrowLeft, ArrowRight, ArrowUp, ArrowDown, ChevronUp, ChevronDown, Zap } from 'lucide-react';

export default function App() {
  const [grid, setGrid] = useState(createEmptyGrid());
  const [activePiece, setActivePiece] = useState<{
    shape: Vector3D[];
    position: Vector3D;
    color: string;
  } | null>(null);
  const [score, setScore] = useState(0);
  const [cubesPlayed, setCubesPlayed] = useState(0);
  const [gameOver, setGameOver] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [gameStarted, setGameStarted] = useState(false);
  const [ghostPosition, setGhostPosition] = useState<Vector3D | null>(null);
  const [dropInterval, setDropInterval] = useState(1000);
  const [nextPiece, setNextPiece] = useState<{
    shape: Vector3D[];
    color: string;
  } | null>(null);

  const gameLoopRef = useRef<number | null>(null);
  const lastDropTimeRef = useRef<number>(0);

  const spawnPiece = useCallback(() => {
    const keys = Object.keys(TETROMINOES);
    
    // Use the next piece if available, otherwise generate a random one
    let pieceToSpawn;
    if (nextPiece) {
      pieceToSpawn = nextPiece;
    } else {
      const randomKey = keys[Math.floor(Math.random() * keys.length)];
      pieceToSpawn = TETROMINOES[randomKey];
    }

    // Generate the next piece for the preview
    const nextKey = keys[Math.floor(Math.random() * keys.length)];
    setNextPiece(TETROMINOES[nextKey]);
    
    const startPos: Vector3D = [
      Math.floor(GRID_WIDTH / 2) - 1,
      Math.floor(GRID_HEIGHT / 2) - 1,
      GRID_DEPTH - 1
    ];

    if (checkCollision(pieceToSpawn.shape, startPos, grid)) {
      setGameOver(true);
      return;
    }

    setActivePiece({
      shape: pieceToSpawn.shape,
      position: startPos,
      color: pieceToSpawn.color
    });
    setCubesPlayed(c => c + 1);
  }, [grid, nextPiece]);

  const lockPiece = useCallback(() => {
    if (!activePiece) return;

    const newGrid = [...grid.map(layer => layer.map(row => [...row]))];
    activePiece.shape.forEach(([sx, sy, sz]) => {
      const x = activePiece.position[0] + sx;
      const y = activePiece.position[1] + sy;
      const z = activePiece.position[2] + sz;
      if (z >= 0 && z < GRID_DEPTH && y >= 0 && y < GRID_HEIGHT && x >= 0 && x < GRID_WIDTH) {
        newGrid[z][y][x] = activePiece.color;
      }
    });

    const { newGrid: clearedGrid, clearedCount } = clearFullLayers(newGrid);
    if (clearedCount > 0) {
      setScore(s => s + clearedCount * 100 * clearedCount);
    }
    setGrid(clearedGrid);
    setActivePiece(null);
    spawnPiece();
  }, [activePiece, grid, spawnPiece]);

  const movePiece = useCallback((dx: number, dy: number, dz: number) => {
    if (!activePiece || gameOver || isPaused) return false;

    const newPos: Vector3D = [
      activePiece.position[0] + dx,
      activePiece.position[1] + dy,
      activePiece.position[2] + dz
    ];

    if (!checkCollision(activePiece.shape, newPos, grid)) {
      setActivePiece(prev => prev ? { ...prev, position: newPos } : null);
      return true;
    } else if (dz < 0) {
      lockPiece();
      return false;
    }
    return false;
  }, [activePiece, grid, gameOver, isPaused, lockPiece]);

  const rotatePiece = useCallback((axis: 'x' | 'y' | 'z') => {
    if (!activePiece || gameOver || isPaused) return;

    let newShape: Vector3D[];
    if (axis === 'x') newShape = rotateX(activePiece.shape);
    else if (axis === 'y') newShape = rotateY(activePiece.shape);
    else newShape = rotateZ(activePiece.shape);

    // Wall kick attempts: try original position, then nearby offsets in all 3 directions
    const kicks: Vector3D[] = [
      [0, 0, 0], 
      [1, 0, 0], [-1, 0, 0], [0, 1, 0], [0, -1, 0], [0, 0, 1], [0, 0, -1],
      [1, 1, 0], [-1, -1, 0], [1, -1, 0], [-1, 1, 0],
      [1, 0, 1], [-1, 0, -1], [0, 1, 1], [0, -1, -1],
      [2, 0, 0], [-2, 0, 0], [0, 2, 0], [0, -2, 0], [0, 0, 2]
    ];

    for (const [kx, ky, kz] of kicks) {
      const kickedPos: Vector3D = [
        activePiece.position[0] + kx,
        activePiece.position[1] + ky,
        activePiece.position[2] + kz
      ];
      if (!checkCollision(newShape, kickedPos, grid)) {
        setActivePiece(prev => prev ? { ...prev, shape: newShape, position: kickedPos } : null);
        return;
      }
    }
  }, [activePiece, grid, gameOver, isPaused]);

  const hardDrop = useCallback(() => {
    if (!activePiece || gameOver || isPaused) return;
    let currentZ = activePiece.position[2];
    while (!checkCollision(activePiece.shape, [activePiece.position[0], activePiece.position[1], currentZ - 1], grid)) {
      currentZ--;
    }
    setActivePiece(prev => prev ? { ...prev, position: [prev.position[0], prev.position[1], currentZ] } : null);
    // We don't lock immediately here to let the state update, but the next tick will lock it.
    // Actually, for better feel, we can lock it immediately.
    const finalPos: Vector3D = [activePiece.position[0], activePiece.position[1], currentZ];
    
    const newGrid = [...grid.map(layer => layer.map(row => [...row]))];
    activePiece.shape.forEach(([sx, sy, sz]) => {
      const x = finalPos[0] + sx;
      const y = finalPos[1] + sy;
      const z = finalPos[2] + sz;
      if (z >= 0 && z < GRID_DEPTH && y >= 0 && y < GRID_HEIGHT && x >= 0 && x < GRID_WIDTH) {
        newGrid[z][y][x] = activePiece.color;
      }
    });

    const { newGrid: clearedGrid, clearedCount } = clearFullLayers(newGrid);
    if (clearedCount > 0) {
      setScore(s => s + clearedCount * 100 * clearedCount);
    }
    setGrid(clearedGrid);
    setActivePiece(null);
    spawnPiece();
  }, [activePiece, grid, gameOver, isPaused, spawnPiece]);

  // Update ghost position
  useEffect(() => {
    if (!activePiece) {
      setGhostPosition(null);
      return;
    }
    let gz = activePiece.position[2];
    while (!checkCollision(activePiece.shape, [activePiece.position[0], activePiece.position[1], gz - 1], grid)) {
      gz--;
    }
    setGhostPosition([activePiece.position[0], activePiece.position[1], gz]);
  }, [activePiece, grid]);

  // Game Loop
  useEffect(() => {
    if (!gameStarted || gameOver || isPaused) return;

    const loop = (time: number) => {
      if (time - lastDropTimeRef.current > dropInterval) {
        movePiece(0, 0, -1);
        lastDropTimeRef.current = time;
      }
      gameLoopRef.current = requestAnimationFrame(loop);
    };

    gameLoopRef.current = requestAnimationFrame(loop);
    return () => {
      if (gameLoopRef.current) cancelAnimationFrame(gameLoopRef.current);
    };
  }, [gameStarted, gameOver, isPaused, movePiece]);

  // Keyboard Controls
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!gameStarted || gameOver) return;

      switch (e.key) {
        case 'ArrowLeft': movePiece(-1, 0, 0); break;
        case 'ArrowRight': movePiece(1, 0, 0); break;
        case 'ArrowUp': movePiece(0, 1, 0); break;
        case 'ArrowDown': movePiece(0, -1, 0); break;
        case ' ': hardDrop(); break;
        case 'q': rotatePiece('x'); break;
        case 'w': rotatePiece('y'); break;
        case 'e': rotatePiece('z'); break;
        case 'p': setIsPaused(p => !p); break;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [gameStarted, gameOver, movePiece, rotatePiece, hardDrop]);

  const startGame = (speed: number = 1000) => {
    setGrid(createEmptyGrid());
    setScore(0);
    setCubesPlayed(0);
    setGameOver(false);
    setIsPaused(false);
    setDropInterval(speed);
    
    // Pre-generate the first piece and the next piece
    const keys = Object.keys(TETROMINOES);
    const firstKey = keys[Math.floor(Math.random() * keys.length)];
    const nextKey = keys[Math.floor(Math.random() * keys.length)];
    
    const firstPiece = TETROMINOES[firstKey];
    setNextPiece(TETROMINOES[nextKey]);
    
    const startPos: Vector3D = [
      Math.floor(GRID_WIDTH / 2) - 1,
      Math.floor(GRID_HEIGHT / 2) - 1,
      GRID_DEPTH - 1
    ];

    setActivePiece({
      shape: firstPiece.shape,
      position: startPos,
      color: firstPiece.color
    });
    
    setGameStarted(true);
  };

  // Calculate stack height for the left bar
  const stackHeight = grid.findIndex(layer => layer.every(row => row.every(cell => cell === null)));
  const normalizedHeight = stackHeight === -1 ? 1 : (GRID_DEPTH - stackHeight) / GRID_DEPTH;

  return (
    <div className="relative w-full h-screen bg-black text-white font-mono overflow-hidden flex select-none">
      {/* Left Panel - Level and Stack Height */}
      <div className="w-24 p-4 flex flex-col items-center border-r border-blue-900 bg-black z-10">
        <div className="border-2 border-blue-700 p-1 w-full text-center mb-4">
          <div className="text-[10px] text-blue-400 uppercase">Level</div>
          <div className="text-xl text-yellow-500">0</div>
        </div>
        
        <div className="flex-1 w-8 border-2 border-blue-700 relative flex flex-col-reverse overflow-hidden">
          <div 
            className="bg-gradient-to-t from-blue-900 to-blue-500 w-full transition-all duration-300"
            style={{ height: `${normalizedHeight * 100}%` }}
          />
        </div>
      </div>

      {/* Main Game Area */}
      <div className="flex-1 relative bg-black border-x border-blue-900">
        <GameCanvas grid={grid} activePiece={activePiece} ghostPosition={ghostPosition} />

        {/* Overlays */}
        <AnimatePresence>
          {!gameStarted && (
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 bg-black/90 flex items-center justify-center z-20"
            >
              <div className="text-center border-4 border-blue-700 p-12 bg-black max-w-md w-full">
                <h2 className="text-6xl font-black mb-8 tracking-tighter text-blue-500 italic">BLOCK OUT</h2>
                
                <div className="mb-8">
                  <div className="text-blue-400 text-xs uppercase mb-4 tracking-widest">Select Speed</div>
                  <div className="grid grid-cols-3 gap-4">
                    {[
                      { label: 'SLOW', speed: 1000, color: 'text-emerald-500', border: 'border-emerald-500/50' },
                      { label: 'MED', speed: 600, color: 'text-yellow-500', border: 'border-yellow-500/50' },
                      { label: 'FAST', speed: 300, color: 'text-red-500', border: 'border-red-500/50' }
                    ].map((opt) => (
                      <button
                        key={opt.label}
                        onClick={() => startGame(opt.speed)}
                        className={`py-3 border-2 ${opt.border} ${opt.color} hover:bg-white/10 transition-all font-bold text-sm`}
                      >
                        {opt.label}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="text-[10px] text-zinc-500 uppercase tracking-widest">
                  Choose a speed to begin
                </div>
              </div>
            </motion.div>
          )}

          {gameOver && (
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 bg-black/80 flex items-center justify-center z-30"
            >
              <div className="text-center border-4 border-red-700 p-12 bg-black">
                <h2 className="text-4xl font-black mb-4 text-red-600">GAME OVER</h2>
                <div className="text-xl mb-8 text-yellow-500">SCORE: {score}</div>
                <div className="flex flex-col gap-4">
                  <button 
                    onClick={() => startGame(1000)}
                    className="px-12 py-3 border-2 border-emerald-500 text-emerald-500 hover:bg-emerald-500 hover:text-black transition-all font-bold"
                  >
                    RETRY SLOW
                  </button>
                  <button 
                    onClick={() => startGame(600)}
                    className="px-12 py-3 border-2 border-yellow-500 text-yellow-500 hover:bg-yellow-500 hover:text-black transition-all font-bold"
                  >
                    RETRY MED
                  </button>
                  <button 
                    onClick={() => startGame(300)}
                    className="px-12 py-3 border-2 border-red-500 text-red-500 hover:bg-red-500 hover:text-black transition-all font-bold"
                  >
                    RETRY FAST
                  </button>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Right Panel - Stats */}
      <div className="w-64 p-6 flex flex-col border-l border-blue-900 bg-black z-10">
        <div className="mb-8">
          <h1 className="text-3xl font-black tracking-tighter italic text-blue-600 leading-none">BLOCK</h1>
          <h1 className="text-3xl font-black tracking-tighter italic text-red-600 leading-none ml-4">OUT</h1>
        </div>

        <div className="space-y-6">
          <div className="border-2 border-blue-700 p-2 relative">
            <div className="absolute -top-2 left-2 bg-black px-1 text-[10px] text-blue-400 uppercase">Next</div>
            <div className="h-32 w-full bg-black/50 overflow-hidden">
              <NextPiecePreview piece={nextPiece} />
            </div>
          </div>

          <div className="border-2 border-blue-700 p-2 relative">
            <div className="absolute -top-2 left-2 bg-black px-1 text-[10px] text-blue-400 uppercase">Score</div>
            <div className="text-2xl text-yellow-500 text-right font-mono">{score}</div>
          </div>

          <div className="border-2 border-blue-700 p-2 relative">
            <div className="absolute -top-2 left-2 bg-black px-1 text-[10px] text-blue-400 uppercase">Cubes Played</div>
            <div className="text-2xl text-yellow-500 text-right font-mono">{cubesPlayed}</div>
          </div>

          <div className="border-2 border-blue-700 p-2 relative">
            <div className="absolute -top-2 left-2 bg-black px-1 text-[10px] text-blue-400 uppercase">High Score</div>
            <div className="text-2xl text-blue-500 text-right font-mono">13076</div>
          </div>

          <div className="border-2 border-blue-700 p-2 relative">
            <div className="absolute -top-2 left-2 bg-black px-1 text-[10px] text-blue-400 uppercase">Pit</div>
            <div className="text-xl text-red-500 text-center font-mono">{GRID_WIDTH}x{GRID_HEIGHT}x{GRID_DEPTH}</div>
          </div>

          <div className="border-2 border-blue-700 p-2 relative">
            <div className="absolute -top-2 left-2 bg-black px-1 text-[10px] text-blue-400 uppercase">Block Set</div>
            <div className="text-xl text-yellow-700 text-center font-mono">EXTENDED</div>
          </div>
        </div>

        <div className="mt-auto pt-8 text-[10px] text-zinc-600 space-y-1">
          <div className="flex justify-between"><span>MOVE:</span> <span className="text-zinc-400">ARROWS</span></div>
          <div className="flex justify-between"><span>ROT X:</span> <span className="text-zinc-400">Q</span></div>
          <div className="flex justify-between"><span>ROT Y:</span> <span className="text-zinc-400">W</span></div>
          <div className="flex justify-between"><span>ROT Z:</span> <span className="text-zinc-400">E</span></div>
          <div className="flex justify-between"><span>DROP:</span> <span className="text-zinc-400">SPACE</span></div>
        </div>
      </div>
    </div>
  );
}
