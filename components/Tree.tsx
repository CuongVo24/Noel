import React, { useRef, useState, useMemo } from 'react';
import { useFrame, extend } from '@react-three/fiber';
import * as THREE from 'three';
import { TreeFoliageMaterial } from './TreeShaderMaterial';
import { Decoration } from '../types';
import { DecorationMesh } from './DecorationMeshes';

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
  superNovaTrigger?: number; // Timestamp of last trigger
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

export const ChristmasTree: React.FC<TreeProps> = ({ snowAmount, onDecorateStart, decorations, isLit, onStarClick, superNovaTrigger = 0 }) => {
  const groupRef = useRef<THREE.Group>(null);
  const starRef = useRef<THREE.Mesh>(null);
  const starLightRef = useRef<THREE.PointLight>(null);
  const flashSpriteRef = useRef<THREE.Sprite>(null);

  const matRef1 = useRef<any>(null);
  const matRef2 = useRef<any>(null);
  const matRef3 = useRef<any>(null);
  
  const [hoverPoint, setHoverPoint] = useState<THREE.Vector3 | null>(null);

  // Generate a soft glow texture for the fake bloom sprite
  const glowTexture = useMemo(() => {
    const canvas = document.createElement('canvas');
    canvas.width = 64;
    canvas.height = 64;
    const ctx = canvas.getContext('2d');
    if (ctx) {
        const gradient = ctx.createRadialGradient(32, 32, 0, 32, 32, 32);
        gradient.addColorStop(0, 'rgba(255, 255, 255, 1)');
        gradient.addColorStop(0.4, 'rgba(255, 255, 255, 0.4)');
        gradient.addColorStop(1, 'rgba(255, 255, 255, 0)');
        ctx.fillStyle = gradient;
        ctx.fillRect(0, 0, 64, 64);
    }
    return new THREE.CanvasTexture(canvas);
  }, []);

  useFrame((state) => {
    const time = state.clock.getElapsedTime();
    const now = Date.now();
    
    // Update uniforms for snow amount only.
    if (matRef1.current) matRef1.current.uSnowAmount = snowAmount; 
    if (matRef2.current) matRef2.current.uSnowAmount = snowAmount;
    if (matRef3.current) matRef3.current.uSnowAmount = snowAmount;
    
    // Star Pulse Animation
    if (starRef.current && isLit) {
         starRef.current.scale.setScalar(1 + Math.sin(time * 2) * 0.05);
    }

    // SUPER NOVA LIGHT LOGIC (Environmental Light)
    // We handle this OUTSIDE the isLit check so the flash can override the off state
    if (starLightRef.current) {
        const age = (now - superNovaTrigger) / 1000;
        const LIGHT_DURATION = 2.5;
        
        // Define Base State (Lit vs Unlit)
        const baseIntensity = isLit ? 4.0 : 0.0;
        const baseDistance = isLit ? 15.0 : 0.0;
        const baseDecay = 2.0;

        if (superNovaTrigger > 0 && age < LIGHT_DURATION) {
            const t = age / LIGHT_DURATION;
            // Lerp from Flash(20) down to Base(4 or 0)
            starLightRef.current.intensity = THREE.MathUtils.lerp(20.0, baseIntensity, t);
            starLightRef.current.distance = THREE.MathUtils.lerp(150.0, baseDistance, t);
            starLightRef.current.decay = THREE.MathUtils.lerp(1.0, baseDecay, t);
        } else {
            // Resting State
            starLightRef.current.intensity = baseIntensity;
            starLightRef.current.distance = baseDistance;
            starLightRef.current.decay = baseDecay;
        }
    }

    // SUPER NOVA SPRITE LOGIC (Visual Flash "Lens Flare")
    if (flashSpriteRef.current) {
        const age = (now - superNovaTrigger) / 1000;
        const FLASH_DURATION = 0.5;

        if (superNovaTrigger > 0 && age < FLASH_DURATION) {
            // Lerp from Huge (50) to 0
            const t = age / FLASH_DURATION; // 0 to 1
            const scale = THREE.MathUtils.lerp(50, 0, t);
            const opacity = THREE.MathUtils.lerp(1, 0, t);
            
            flashSpriteRef.current.scale.setScalar(scale);
            flashSpriteRef.current.material.opacity = opacity;
            flashSpriteRef.current.visible = true;
        } else {
            flashSpriteRef.current.scale.setScalar(0);
            flashSpriteRef.current.material.opacity = 0;
            flashSpriteRef.current.visible = false;
        }
    }
  });

  const handlePointerDown = (e: any) => {
    e.stopPropagation();
    if (!e.face) return;

    if (groupRef.current) {
        const localPoint = groupRef.current.worldToLocal(e.point.clone());
        const normal = e.face.normal.clone().applyQuaternion(groupRef.current.quaternion);
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
    if (groupRef.current) {
        const localPoint = groupRef.current.worldToLocal(e.point.clone());
        setHoverPoint(localPoint);
    }
  };

  const handlePointerOut = () => {
    setHoverPoint(null);
  };

  return (
    <group ref={groupRef} scale={0.8}>
      
      {/* TREE TRUNK */}
      <mesh position={[0, 0.5, 0]} castShadow receiveShadow>
        <cylinderGeometry args={[0.2, 0.35, 1.2, 8]} />
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

      {hoverPoint && (
        <mesh position={hoverPoint}>
            <sphereGeometry args={[0.05]} />
            <meshBasicMaterial color="white" opacity={0.5} transparent />
        </mesh>
      )}

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
            emissiveIntensity={isLit ? 10 : 0.5}
            toneMapped={false}
         />
      </mesh>
      
      {/* 
         ALWAYS RENDERED: Star Light and Flash Sprite
         These are outside the `isLit` check so they can trigger even in the dark.
         Their intensity/visibility is controlled by `useFrame` logic.
      */}
      <pointLight 
          ref={starLightRef}
          position={[0, 4.8, 0]} 
          intensity={0} // Controlled by useFrame
          distance={0}  // Controlled by useFrame
          color="#FFD700" 
          decay={2} 
      />

      <sprite ref={flashSpriteRef} position={[0, 4.8, 0]} renderOrder={9999}>
          <spriteMaterial 
            map={glowTexture} 
            transparent 
            opacity={0} 
            depthWrite={false} 
            depthTest={false} // Ensure it draws on top of everything, even in the dark
            blending={THREE.AdditiveBlending} 
          />
      </sprite>
      
      {/* GENERAL LIGHTING - Only active when tree is ON */}
      {isLit && (
        <>
            <pointLight position={[0, 2.5, 1]} distance={3} intensity={2} color="#ffaa00" decay={2} />
        </>
      )}
    </group>
  );
};