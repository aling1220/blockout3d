import React, { useEffect, useRef } from 'react';
import * as THREE from 'three';
import { GRID_WIDTH, GRID_HEIGHT, GRID_DEPTH, Vector3D } from '../game/constants';

interface GameCanvasProps {
  grid: (string | null)[][][];
  activePiece: {
    shape: Vector3D[];
    position: Vector3D;
    color: string;
  } | null;
  ghostPosition: Vector3D | null;
}

const GameCanvas: React.FC<GameCanvasProps> = ({ grid, activePiece, ghostPosition }) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const sceneRef = useRef<THREE.Scene | null>(null);
  const cameraRef = useRef<THREE.PerspectiveCamera | null>(null);
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
  const blocksGroupRef = useRef<THREE.Group | null>(null);

  useEffect(() => {
    if (!containerRef.current) return;

    // Scene setup
    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x050505);
    sceneRef.current = scene;

    // Camera setup - looking down from top with strong perspective
    const camera = new THREE.PerspectiveCamera(
      90, 
      containerRef.current.clientWidth / containerRef.current.clientHeight, 
      0.1, 
      1000
    );
    
    camera.position.set(GRID_WIDTH / 2 - 0.5, GRID_HEIGHT / 2 - 0.5, GRID_DEPTH + 1);
    camera.lookAt(GRID_WIDTH / 2 - 0.5, GRID_HEIGHT / 2 - 0.5, 0);
    cameraRef.current = camera;

    // Renderer setup
    const renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setSize(containerRef.current.clientWidth, containerRef.current.clientHeight);
    
    // Clear container to prevent duplicate canvases (especially in StrictMode)
    while (containerRef.current.firstChild) {
      containerRef.current.removeChild(containerRef.current.firstChild);
    }
    containerRef.current.appendChild(renderer.domElement);
    rendererRef.current = renderer;

    // Lighting
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.4);
    scene.add(ambientLight);
    const pointLight = new THREE.PointLight(0xffffff, 0.8);
    pointLight.position.set(GRID_WIDTH / 2, GRID_HEIGHT / 2, GRID_DEPTH + 5);
    scene.add(pointLight);

    // Grid lines for depth perception - Bright Green
    for (let z = 0; z <= GRID_DEPTH; z++) {
      const planeGeo = new THREE.PlaneGeometry(GRID_WIDTH, GRID_HEIGHT);
      const planeEdges = new THREE.EdgesGeometry(planeGeo);
      const planeLine = new THREE.LineSegments(planeEdges, new THREE.LineBasicMaterial({ color: 0x00ff00, transparent: true, opacity: 0.4 }));
      planeLine.position.set(GRID_WIDTH / 2 - 0.5, GRID_HEIGHT / 2 - 0.5, z - 0.5);
      scene.add(planeLine);
    }

    // Side lines connecting the planes
    for (let x = 0; x <= GRID_WIDTH; x++) {
      for (let y = 0; y <= GRID_HEIGHT; y++) {
        if (x === 0 || x === GRID_WIDTH || y === 0 || y === GRID_HEIGHT) {
          const points = [
            new THREE.Vector3(x - 0.5, y - 0.5, -0.5),
            new THREE.Vector3(x - 0.5, y - 0.5, GRID_DEPTH - 0.5)
          ];
          const geometry = new THREE.BufferGeometry().setFromPoints(points);
          const line = new THREE.Line(geometry, new THREE.LineBasicMaterial({ color: 0x00ff00, transparent: true, opacity: 0.2 }));
          scene.add(line);
        }
      }
    }

    const blocksGroup = new THREE.Group();
    scene.add(blocksGroup);
    blocksGroupRef.current = blocksGroup;

    let animationFrameId: number;
    const animate = () => {
      animationFrameId = requestAnimationFrame(animate);
      renderer.render(scene, camera);
    };
    animate();

    const handleResize = () => {
      if (!containerRef.current || !cameraRef.current || !rendererRef.current) return;
      cameraRef.current.aspect = containerRef.current.clientWidth / containerRef.current.clientHeight;
      cameraRef.current.updateProjectionMatrix();
      rendererRef.current.setSize(containerRef.current.clientWidth, containerRef.current.clientHeight);
    };
    window.addEventListener('resize', handleResize);

    return () => {
      window.removeEventListener('resize', handleResize);
      cancelAnimationFrame(animationFrameId);
      renderer.dispose();
      if (containerRef.current && renderer.domElement.parentNode === containerRef.current) {
        containerRef.current.removeChild(renderer.domElement);
      }
    };
  }, []);

  // Update blocks when grid or activePiece changes
  useEffect(() => {
    if (!blocksGroupRef.current) return;
    const group = blocksGroupRef.current;
    
    // Clear previous blocks
    while(group.children.length > 0){ 
      const child = group.children[0] as THREE.Mesh;
      child.geometry.dispose();
      (child.material as THREE.Material).dispose();
      group.remove(child); 
    }

    const boxGeo = new THREE.BoxGeometry(0.95, 0.95, 0.95);

    // Render static grid blocks
    for (let z = 0; z < GRID_DEPTH; z++) {
      for (let y = 0; y < GRID_HEIGHT; y++) {
        for (let x = 0; x < GRID_WIDTH; x++) {
          const color = grid[z][y][x];
          if (color) {
            // Solid color blocks
            const material = new THREE.MeshBasicMaterial({ 
              color: new THREE.Color(color),
            });
            const mesh = new THREE.Mesh(boxGeo, material);
            mesh.position.set(x, y, z);
            group.add(mesh);

            // Black outlines for blocks
            const edges = new THREE.EdgesGeometry(boxGeo);
            const line = new THREE.LineSegments(edges, new THREE.LineBasicMaterial({ color: 0x000000 }));
            line.position.set(x, y, z);
            group.add(line);
          }
        }
      }
    }

    // Render active piece as WHITE WIREFRAME (matching the image)
    if (activePiece) {
      activePiece.shape.forEach(([sx, sy, sz]) => {
        const x = activePiece.position[0] + sx;
        const y = activePiece.position[1] + sy;
        const z = activePiece.position[2] + sz;
        
        // Wireframe only for active piece
        const edges = new THREE.EdgesGeometry(boxGeo);
        const line = new THREE.LineSegments(edges, new THREE.LineBasicMaterial({ color: 0xffffff, linewidth: 2 }));
        line.position.set(x, y, z);
        group.add(line);

        // Optional: very subtle fill so it's not completely transparent
        const material = new THREE.MeshBasicMaterial({ 
          color: 0xffffff,
          transparent: true,
          opacity: 0.05
        });
        const mesh = new THREE.Mesh(boxGeo, material);
        mesh.position.set(x, y, z);
        group.add(mesh);
      });
    }

    // Render ghost piece
    if (activePiece && ghostPosition) {
      activePiece.shape.forEach(([sx, sy, sz]) => {
        const x = ghostPosition[0] + sx;
        const y = ghostPosition[1] + sy;
        const z = ghostPosition[2] + sz;
        
        if (z < GRID_DEPTH) {
          const material = new THREE.MeshBasicMaterial({ 
            color: 0xffffff,
            transparent: true,
            opacity: 0.1,
            wireframe: true
          });
          const mesh = new THREE.Mesh(boxGeo, material);
          mesh.position.set(x, y, z);
          group.add(mesh);
        }
      });
    }

  }, [grid, activePiece, ghostPosition]);

  return <div id="game-canvas-container" ref={containerRef} className="w-full h-full" />;
};

export default GameCanvas;
