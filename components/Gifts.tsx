import React, { useState } from 'react';
import { useSpring, animated } from '@react-spring/three';
import { RoundedBox } from '@react-three/drei';
import * as THREE from 'three';
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

interface GiftBoxProps {
  gift: Gift;
  onOpen: (msg: string) => void;
}

const HollowGiftBox: React.FC<GiftBoxProps> = ({ gift, onOpen }) => {
  const [active, setActive] = useState(false);
  
  // --- DIMENSIONS & CONSTANTS ---
  const SIZE = 0.5;
  const WALL_THICKNESS = 0.02; 
  const HALF_SIZE = SIZE / 2;
  
  // LID CONFIGURATION
  // The Lid is a solid plate that sits ON TOP of the walls.
  // Walls end at y = SIZE = 0.5 (relative to ground) if box is placed at y=0.
  // Pivot is at y = SIZE.
  const LID_THICKNESS = 0.04;
  const SNOW_HEIGHT = 0.06;
  const SNOW_SIZE = SIZE * 0.9; // INSET: 90% of lid size to prevent z-fighting

  // Vertical Stacking Relative to Pivot (y=0 in Lid Group)
  // 1. Lid Mesh Bottom = 0. Lid Mesh Center Y = LID_THICKNESS / 2.
  const LID_MESH_Y = LID_THICKNESS / 2;
  
  // 2. Snow Mesh Bottom = LID_THICKNESS. Snow Mesh Center Y = LID_THICKNESS + SNOW_HEIGHT / 2.
  // We add a tiny epsilon (0.001) to ensure no z-fighting with lid top
  const SNOW_MESH_Y = LID_THICKNESS + (SNOW_HEIGHT / 2) + 0.001;

  // Memoize random rotation
  const [rotation] = useState(() => [0, Math.random() * Math.PI, 0] as [number, number, number]);

  // Spring animation for Lid Opening
  const { lidRotation } = useSpring({
    lidRotation: active ? -Math.PI / 1.5 : 0, 
    config: { tension: 180, friction: 12 }
  });

  const handleClick = (e: any) => {
    e.stopPropagation();
    setActive(!active);
    if (!active) {
        onOpen(gift.message);
    }
  };

  const wallMaterial = new THREE.MeshStandardMaterial({
      color: gift.color,
      roughness: 0.8,
      side: THREE.DoubleSide, // Needed for walls to be visible inside and out
  });

  return (
    <group position={gift.position} rotation={rotation} onClick={handleClick}>
      
      {/* --- HOLLOW BODY (5 Separate Walls) --- */}
      {/* Walls are shifted up by HALF_SIZE so bottom aligns with ground (y=0) if group is at y=0 */}
      <group position={[0, HALF_SIZE, 0]}>
          {/* Bottom Floor */}
          <mesh position={[0, -HALF_SIZE + (WALL_THICKNESS/2), 0]} castShadow receiveShadow material={wallMaterial}>
              <boxGeometry args={[SIZE, WALL_THICKNESS, SIZE]} />
          </mesh>
          
          {/* Left Wall */}
          <mesh position={[-HALF_SIZE + (WALL_THICKNESS/2), 0, 0]} castShadow receiveShadow material={wallMaterial}>
              <boxGeometry args={[WALL_THICKNESS, SIZE, SIZE]} />
          </mesh>

          {/* Right Wall */}
          <mesh position={[HALF_SIZE - (WALL_THICKNESS/2), 0, 0]} castShadow receiveShadow material={wallMaterial}>
              <boxGeometry args={[WALL_THICKNESS, SIZE, SIZE]} />
          </mesh>

          {/* Front Wall */}
          <mesh position={[0, 0, HALF_SIZE - (WALL_THICKNESS/2)]} castShadow receiveShadow material={wallMaterial}>
              <boxGeometry args={[SIZE - (WALL_THICKNESS*2), SIZE, WALL_THICKNESS]} />
          </mesh>

          {/* Back Wall */}
          <mesh position={[0, 0, -HALF_SIZE + (WALL_THICKNESS/2)]} castShadow receiveShadow material={wallMaterial}>
              <boxGeometry args={[SIZE - (WALL_THICKNESS*2), SIZE, WALL_THICKNESS]} />
          </mesh>

          {/* External Ribbons (Decals) */}
          <mesh position={[0, 0, HALF_SIZE + 0.001]}>
              <planeGeometry args={[0.08, SIZE]} />
              <meshStandardMaterial color="#ffffff" side={THREE.DoubleSide} transparent opacity={0.9} />
          </mesh>
          <mesh position={[0, 0, -HALF_SIZE - 0.001]} rotation={[0, Math.PI, 0]}>
              <planeGeometry args={[0.08, SIZE]} />
              <meshStandardMaterial color="#ffffff" side={THREE.DoubleSide} transparent opacity={0.9} />
          </mesh>
      </group>

      {/* --- HINGED LID --- */}
      {/* Pivot Point: Top Back Edge of the box. y=SIZE (0.5), z=-HALF_SIZE (-0.25) */}
      {/* @ts-ignore */}
      <animated.group position={[0, SIZE, -HALF_SIZE]} rotation-x={lidRotation}>
          
          {/* Offset the content so the pivot acts on the back edge */}
          <group position={[0, 0, HALF_SIZE]}>
            
            {/* 1. Main Lid Plate */}
            <mesh position={[0, LID_MESH_Y, 0]} castShadow receiveShadow material={wallMaterial}>
                <boxGeometry args={[SIZE, LID_THICKNESS, SIZE]} />
            </mesh>

            {/* 2. Snow Cap - Inset to fix side artifacts */}
            <RoundedBox 
                args={[SNOW_SIZE, SNOW_HEIGHT, SNOW_SIZE]} 
                radius={0.02} 
                smoothness={4}
                position={[0, SNOW_MESH_Y, 0]}
            >
                <meshStandardMaterial color="#ffffff" roughness={1.0} side={THREE.FrontSide} />
            </RoundedBox>

            {/* Bow on top of snow */}
            <mesh position={[0, SNOW_MESH_Y + (SNOW_HEIGHT/2) + 0.04, 0]}>
                <sphereGeometry args={[0.08]} />
                <meshStandardMaterial color="#ffffff" roughness={0.9} />
            </mesh>

          </group>
      </animated.group>

      {/* Fake Ground Shadow */}
      <mesh position={[0, 0.01, 0]} rotation={[-Math.PI/2, 0, 0]}>
         <planeGeometry args={[SIZE * 1.2, SIZE * 1.2]} />
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