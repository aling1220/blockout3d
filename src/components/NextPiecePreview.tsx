import React, { useEffect, useRef } from 'react';
import * as THREE from 'three';
import { Vector3D } from '../game/constants';

interface NextPiecePreviewProps {
  piece: {
    shape: Vector3D[];
    color: string;
  } | null;
}

const NextPiecePreview: React.FC<NextPiecePreviewProps> = ({ piece }) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const sceneRef = useRef<THREE.Scene | null>(null);
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
  const groupRef = useRef<THREE.Group | null>(null);
  const requestRef = useRef<number | null>(null);

  useEffect(() => {
    if (!containerRef.current) return;

    const scene = new THREE.Scene();
    sceneRef.current = scene;

    const camera = new THREE.PerspectiveCamera(45, 1, 0.1, 100);
    camera.position.set(5, 5, 5);
    camera.lookAt(0, 0, 0);

    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setClearColor(0x000000, 0); // Transparent background
    
    const width = containerRef.current.clientWidth || 150;
    const height = containerRef.current.clientHeight || 150;
    renderer.setSize(width, height);
    containerRef.current.appendChild(renderer.domElement);
    rendererRef.current = renderer;

    const ambientLight = new THREE.AmbientLight(0xffffff, 1);
    scene.add(ambientLight);
    
    const directionalLight = new THREE.DirectionalLight(0xffffff, 1);
    directionalLight.position.set(5, 10, 7);
    scene.add(directionalLight);

    const group = new THREE.Group();
    scene.add(group);
    groupRef.current = group;

    const animate = () => {
      if (groupRef.current) {
        groupRef.current.rotation.y += 0.02;
        groupRef.current.rotation.x += 0.01;
      }
      renderer.render(scene, camera);
      requestRef.current = requestAnimationFrame(animate);
    };
    requestRef.current = requestAnimationFrame(animate);

    const resizeObserver = new ResizeObserver((entries) => {
      if (!entries[0] || !rendererRef.current) return;
      const { width, height } = entries[0].contentRect;
      if (width > 0 && height > 0) {
        rendererRef.current.setSize(width, height);
      }
    });
    resizeObserver.observe(containerRef.current);

    return () => {
      resizeObserver.disconnect();
      if (requestRef.current) cancelAnimationFrame(requestRef.current);
      renderer.dispose();
      if (containerRef.current) {
        containerRef.current.innerHTML = '';
      }
    };
  }, []);

  useEffect(() => {
    if (!groupRef.current) return;
    const group = groupRef.current;
    
    // Clear previous blocks
    while(group.children.length > 0){ 
      const child = group.children[0] as THREE.Mesh;
      if (child.geometry) child.geometry.dispose();
      if (child.material) {
        if (Array.isArray(child.material)) {
          child.material.forEach(m => m.dispose());
        } else {
          child.material.dispose();
        }
      }
      group.remove(child); 
    }

    if (!piece) return;

    const boxGeo = new THREE.BoxGeometry(0.9, 0.9, 0.9);
    
    // Calculate center of the piece to offset it
    let minX = Infinity, maxX = -Infinity;
    let minY = Infinity, maxY = -Infinity;
    let minZ = Infinity, maxZ = -Infinity;

    piece.shape.forEach(([x, y, z]) => {
      minX = Math.min(minX, x); maxX = Math.max(maxX, x);
      minY = Math.min(minY, y); maxY = Math.max(maxY, y);
      minZ = Math.min(minZ, z); maxZ = Math.max(maxZ, z);
    });

    const offsetX = (minX + maxX) / 2;
    const offsetY = (minY + maxY) / 2;
    const offsetZ = (minZ + maxZ) / 2;

    piece.shape.forEach(([sx, sy, sz]) => {
      const material = new THREE.MeshStandardMaterial({ 
        color: new THREE.Color(piece.color),
        roughness: 0.3,
        metalness: 0.2,
        transparent: true,
        opacity: 0.9
      });
      const mesh = new THREE.Mesh(boxGeo, material);
      mesh.position.set(sx - offsetX, sy - offsetY, sz - offsetZ);
      group.add(mesh);

      const edges = new THREE.EdgesGeometry(boxGeo);
      const line = new THREE.LineSegments(edges, new THREE.LineBasicMaterial({ color: 0xffffff, linewidth: 2 }));
      line.position.set(sx - offsetX, sy - offsetY, sz - offsetZ);
      group.add(line);
    });
  }, [piece]);

  return (
    <div ref={containerRef} className="w-full h-full relative">
      {!piece && (
        <div className="absolute inset-0 flex items-center justify-center bg-black/20">
          <div className="text-[10px] text-blue-900 animate-pulse uppercase tracking-widest">Ready</div>
        </div>
      )}
    </div>
  );
};

export default NextPiecePreview;
