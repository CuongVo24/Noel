import React, { useRef, useState } from 'react';
import { useFrame, extend } from '@react-three/fiber';
import * as THREE from 'three';
import { TreeFoliageMaterial } from './TreeShaderMaterial';
import { Decoration } from '../types';
import { DecorationMesh } from './DecorationMeshes';
import { Html } from '@react-three/drei';

// Register the custom material
extend({ TreeFoliageMaterial });

// Add type definition for the custom element
declare module '@react-three/fiber' {
  interface ThreeElements {
    treeFoliageMaterial: any;
  }
}

interface TreeProps {
  snowAmount: number;
  onDecorateStart: (point: THREE.Vector3) => void;
  decorations: Decoration[];
  isLit: boolean;
  onStarClick: (position: THREE.Vector3) => void;
}

const TreeLayer = ({ position, scale, materialRef }: { position: [number, number, number], scale: number, materialRef: any }) => {
  return (
    <mesh position={position} scale={scale} castShadow receiveShadow>
      <coneGeometry args={[1.5, 2.5, 8]} />
      {/* Custom material usage */}
      <treeFoliageMaterial ref={materialRef} attach="material" />
    </mesh>
  );
};

export const ChristmasTree: React.FC<TreeProps> = ({ snowAmount, onDecorateStart, decorations, isLit, onStarClick }) => {
  const groupRef = useRef<THREE.Group>(null);
  const starRef = useRef<THREE.Mesh>(null);
  const matRef1 = useRef<any>(null);
  const matRef2 = useRef<any>(null);
  const matRef3 = useRef<any>(null);
  
  const [hoverPoint, setHoverPoint] = useState<THREE.Vector3 | null>(null);

  useFrame((state) => {
    const time = state.clock.getElapsedTime();
    
    // Update uniforms for snow amount only. Wind strength and time-based sway are disabled in shader.
    if (matRef1.current) { 
        matRef1.current.uSnowAmount = snowAmount; 
    }
    if (matRef2.current) { 
        matRef2.current.uSnowAmount = snowAmount;
    }
    if (matRef3.current) { 
        matRef3.current.uSnowAmount = snowAmount;
    }
    
    // Star animation removed - static state
    // We only update scale for light pulse if lit, but keep rotation static
    if (starRef.current && isLit) {
         starRef.current.scale.setScalar(1 + Math.sin(time * 2) * 0.05); // Very subtle pulse
    }
  });

  const handlePointerDown = (e: any) => {
    e.stopPropagation();
    
    // Calculate local point because the tree is scaled
    if (groupRef.current) {
        // e.point is in world space. We need it in the local space of the tree group 
        // because decoration positions are rendered relative to this group.
        const localPoint = groupRef.current.worldToLocal(e.point.clone());
        
        // Add a small offset along the normal so it sits on surface
        const normal = e.face.normal.clone().applyQuaternion(groupRef.current.quaternion);
        // Note: applyQuaternion handles rotation, but for scale we might need more math, 
        // but simply adding normal offset usually works fine for placement.
        localPoint.add(normal.multiplyScalar(0.2));
        
        onDecorateStart(localPoint);
    }
  };

  const handleStarClick = (e: any) => {
      e.stopPropagation();
      onStarClick(e.object.getWorldPosition(new THREE.Vector3()));
  };

  const handlePointerMove = (e: any) => {
    e.stopPropagation();
    // Transform world point to local for the hover cursor
    if (groupRef.current) {
        const localPoint = groupRef.current.worldToLocal(e.point.clone());
        setHoverPoint(localPoint);
    }
  };

  const handlePointerOut = () => {
    setHoverPoint(null);
  };

  return (
    // Scaled the entire tree group down to 0.8
    <group ref={groupRef} scale={0.8}>
      {/* Tree Layers */}
      <mesh position={[0, 0.5, 0]} castShadow receiveShadow>
        <cylinderGeometry args={[0.3, 0.5, 1.5, 8]} />
        <meshStandardMaterial color="#3e2723" roughness={0.9} />
      </mesh>

      <group 
        onClick={handlePointerDown} 
        onPointerMove={handlePointerMove}
        onPointerOut={handlePointerOut}
      >
        <TreeLayer position={[0, 1.5, 0]} scale={1.2} materialRef={matRef1} />
        <TreeLayer position={[0, 2.5, 0]} scale={1.0} materialRef={matRef2} />
        <TreeLayer position={[0, 3.5, 0]} scale={0.8} materialRef={matRef3} />
      </group>

      {/* Helper to show where you are clicking */}
      {hoverPoint && (
        <mesh position={hoverPoint}>
            <sphereGeometry args={[0.05]} />
            <meshBasicMaterial color="white" opacity={0.5} transparent />
        </mesh>
      )}

      {/* Render Decorations */}
      {decorations.map((dec) => (
        <DecorationMesh key={dec.id} data={dec} isLit={isLit} />
      ))}

      {/* Tree Topper - Interactive Star */}
      <mesh 
        ref={starRef} 
        position={[0, 4.8, 0]} 
        onClick={handleStarClick}
        onPointerOver={() => document.body.style.cursor = 'pointer'}
        onPointerOut={() => document.body.style.cursor = 'auto'}
      >
         <octahedronGeometry args={[0.4, 0]} />
         <meshStandardMaterial 
            color="#FFD700" 
            emissive="#FFD700"
            emissiveIntensity={isLit ? 5 : 0.5}
            toneMapped={false}
         />
      </mesh>
      
      {/* Procedural Lights */}
      {isLit && (
        <pointLight position={[0, 2.5, 1]} distance={3} intensity={2} color="#ffaa00" decay={2} />
      )}
    </group>
  );
};