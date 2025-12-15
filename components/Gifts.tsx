import React, { useState, useMemo } from 'react';
import { useSpring, animated } from '@react-spring/three';
import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { Gift } from '../types';

// Static mock gifts
const STATIC_GIFTS: Gift[] = [
    { id: 'g1', position: [1.5, 0, 1.5], color: '#d32f2f', message: 'Giáng sinh an lành! Merry Christmas!', sender: 'Mom', opened: false },
    { id: 'g2', position: [-1.2, 0, 1], color: '#1976d2', message: 'Chúc bạn một mùa đông ấm áp bên gia đình.', sender: 'Dev', opened: false },
    { id: 'g3', position: [0.5, 0, -1.5], color: '#388e3c', message: 'Peace and Joy to the world.', sender: 'Santa', opened: false },
    { id: 'g4', position: [2.5, 0, 0.5], color: '#ffeb3b', message: 'Năm mới phát tài phát lộc!', sender: 'Friend', opened: false },
    { id: 'g5', position: [-2, 0, -2], color: '#9c27b0', message: 'Happy Holidays!', sender: 'Secret Santa', opened: false },
    { id: 'g6', position: [3, 0, -1], color: '#00bcd4', message: 'Chúc mừng giáng sinh!', sender: 'Bro', opened: false },
    { id: 'g7', position: [-3.5, 0, 1.5], color: '#ff5722', message: 'Mong mọi điều ước của bạn thành hiện thực.', sender: 'Sis', opened: false },
    { id: 'g8', position: [0, 0, 3], color: '#e91e63', message: 'Love and Happiness.', sender: 'Dad', opened: false },
    { id: 'g9', position: [-1.5, 0, 2.5], color: '#795548', message: 'Giáng sinh vui vẻ nhé!', sender: 'Neighbor', opened: false },
    { id: 'g10', position: [2, 0, 2.5], color: '#607d8b', message: 'Merry Xmas!', sender: 'Colleague', opened: false },
];

// --- ORGANIC SNOW CAP GENERATOR (PROCEDURAL) ---
const OrganicSnowCap = ({ size }: { size: number }) => {
  const geometry = useMemo(() => {
    // 1. Create High-Res Plane (64x64 for smooth curves)
    // Scale 1.25x to allow significant overhang
    const geo = new THREE.PlaneGeometry(size * 1.25, size * 1.25, 64, 64);
    
    // 2. Displace Vertices (The "Melting Pile" Logic)
    const posAttribute = geo.attributes.position;
    
    for (let i = 0; i < posAttribute.count; i++) {
        const x = posAttribute.getX(i);
        const y = posAttribute.getY(i);
        
        // Calculate distance from center
        const dist = Math.sqrt(x * x + y * y);
        const radius = size * 0.55; // box edge threshold
        const maxHeight = 0.15 * size; // Taller peak for accumulation

        // BASE SHAPE: Domed center
        // smoothstep(0, radius, dist) creates a value from 0 (center) to 1 (edge)
        let h = maxHeight * (1 - THREE.MathUtils.smoothstep(0, radius, dist));

        // NOISE: Low frequency "clumps" + High frequency details
        // We use Math.sin/cos as a cheap deterministic noise
        const clumping = Math.sin(x * 6) * Math.cos(y * 6) * 0.02; // Large bumps
        const grain = (Math.random() - 0.5) * 0.005; // Tiny surface roughness
        h += clumping + grain;

        // PHYSICS: GRAVITY DROOP
        // If past the edge of the box, snow hangs down heavily
        if (dist > size * 0.48) {
            // Calculate how far past the edge we are
            const overhang = dist - (size * 0.48);
            // Exponential dropoff to simulate wet, heavy snow pulling down
            const droop = overhang * 4.0 + (overhang * overhang * 10.0);
            h -= droop;
        }

        // Apply new height (Z in local space)
        posAttribute.setZ(i, h);
    }

    geo.computeVertexNormals();
    return geo;
  }, [size]);

  return (
    <mesh 
      geometry={geometry} 
      rotation={[-Math.PI / 2, 0, 0]} 
      position={[0, 0.002, 0]} 
      castShadow 
      receiveShadow
    >
      {/* 
         Use MeshPhysicalMaterial for 'clearcoat' to simulate a wet/icy surface layer.
         Color is slightly blue-tinted white for coldness.
      */}
      <meshPhysicalMaterial 
        color="#f8fafd" 
        roughness={0.7} 
        metalness={0.1}
        clearcoat={0.5}
        clearcoatRoughness={0.2}
      />
    </mesh>
  );
};

interface GiftBoxProps {
  gift: Gift;
  onOpen: (msg: string) => void;
}

const HollowGiftBox: React.FC<GiftBoxProps> = ({ gift, onOpen }) => {
  const [active, setActive] = useState(false);
  
  const SIZE = 0.5;
  const WALL_THICKNESS = 0.02; 
  const HALF_SIZE = SIZE / 2;
  const LID_THICKNESS = 0.04;
  const LID_MESH_Y = LID_THICKNESS / 2;

  // Static random rotation for natural placement
  const [rotation] = useState(() => [0, Math.random() * Math.PI, 0] as [number, number, number]);

  // Merge geometries for the box body for performance
  const bodyGeometry = useMemo(() => {
    const geometries = [];
    // Bottom
    const bottom = new THREE.BoxGeometry(SIZE, WALL_THICKNESS, SIZE);
    bottom.translate(0, -HALF_SIZE + (WALL_THICKNESS/2), 0);
    geometries.push(bottom);
    // Left
    const left = new THREE.BoxGeometry(WALL_THICKNESS, SIZE, SIZE);
    left.translate(-HALF_SIZE + (WALL_THICKNESS/2), 0, 0);
    geometries.push(left);
    // Right
    const right = new THREE.BoxGeometry(WALL_THICKNESS, SIZE, SIZE);
    right.translate(HALF_SIZE - (WALL_THICKNESS/2), 0, 0);
    geometries.push(right);
    // Front
    const front = new THREE.BoxGeometry(SIZE - (WALL_THICKNESS*2), SIZE, WALL_THICKNESS);
    front.translate(0, 0, HALF_SIZE - (WALL_THICKNESS/2));
    geometries.push(front);
    // Back
    const back = new THREE.BoxGeometry(SIZE - (WALL_THICKNESS*2), SIZE, WALL_THICKNESS);
    back.translate(0, 0, -HALF_SIZE + (WALL_THICKNESS/2));
    geometries.push(back);

    const merged = mergeGeometries(geometries);
    geometries.forEach(g => g.dispose());
    return merged;
  }, [SIZE]);

  // Animation
  const { lidRotation } = useSpring({
    lidRotation: active ? -Math.PI / 1.5 : 0, 
    config: { tension: 180, friction: 12 }
  });

  const handleClick = (e: any) => {
    e.stopPropagation();
    setActive(!active);
    if (!active) onOpen(gift.message);
  };

  const material = new THREE.MeshStandardMaterial({
      color: gift.color,
      roughness: 0.8,
      side: THREE.DoubleSide, 
  });

  return (
    <group position={gift.position} rotation={rotation} onClick={handleClick}>
      
      {/* Box Body */}
      <group position={[0, HALF_SIZE, 0]}>
          <mesh 
            geometry={bodyGeometry} 
            material={material} 
            castShadow 
            receiveShadow 
          />
          {/* Ribbons */}
          <mesh position={[0, 0, HALF_SIZE + 0.001]}>
              <planeGeometry args={[0.08, SIZE]} />
              <meshStandardMaterial color="#ffffff" side={THREE.DoubleSide} transparent opacity={0.9} />
          </mesh>
          <mesh position={[0, 0, -HALF_SIZE - 0.001]} rotation={[0, Math.PI, 0]}>
              <planeGeometry args={[0.08, SIZE]} />
              <meshStandardMaterial color="#ffffff" side={THREE.DoubleSide} transparent opacity={0.9} />
          </mesh>
      </group>

      {/* Box Lid */}
      {/* @ts-ignore */}
      <animated.group position={[0, SIZE, -HALF_SIZE]} rotation-x={lidRotation}>
          <group position={[0, 0, HALF_SIZE]}>
            
            {/* Rigid Lid Part */}
            <mesh position={[0, LID_MESH_Y, 0]} castShadow receiveShadow material={material}>
                <boxGeometry args={[SIZE, LID_THICKNESS, SIZE]} />
            </mesh>

            {/* NEW: PROCEDURAL ORGANIC SNOW CAP */}
            <group position={[0, LID_THICKNESS, 0]}>
                <OrganicSnowCap size={SIZE} />
                
                {/* Decorative Bow (Sitting in the snow) */}
                <mesh position={[0, 0.06, 0]}>
                    <sphereGeometry args={[0.08]} />
                    <meshStandardMaterial color="#ffffff" roughness={0.9} />
                </mesh>
            </group>

          </group>
      </animated.group>

      {/* Fake Ambient Shadow */}
      <mesh position={[0, 0.01, 0]} rotation={[-Math.PI/2, 0, 0]}>
         <planeGeometry args={[SIZE * 1.3, SIZE * 1.3]} />
         <meshBasicMaterial color="#000000" opacity={0.3} transparent />
      </mesh>
    </group>
  );
};

export const Gifts: React.FC<{ onOpen: (msg: string) => void }> = ({ onOpen }) => {
    return (
        <group>
            {STATIC_GIFTS.map(g => <HollowGiftBox key={g.id} gift={g} onOpen={onOpen} />)}
        </group>
    );
};
