import React, { useRef, useState } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { MOCK_PLAYERS } from '../constants';
import { Html } from '@react-three/drei';
import '../types';

export const SimulatedUsers: React.FC = () => {
  const groupRef = useRef<THREE.Group>(null);
  
  const [users] = useState(() => MOCK_PLAYERS.map(p => ({
    ...p,
    pos: new THREE.Vector3(
      (Math.random() - 0.5) * 8, 
      1 + Math.random() * 3, 
      (Math.random() - 0.5) * 8
    ),
    target: new THREE.Vector3(0,0,0),
    speed: 0.02 + Math.random() * 0.03
  })));

  useFrame((state) => {
    const time = state.clock.getElapsedTime();
    users.forEach((u, i) => {
        if (Math.random() < 0.01) {
            u.target.set(
                (Math.random() - 0.5) * 6,
                0.5 + Math.random() * 4,
                (Math.random() - 0.5) * 6
            );
        }
        u.pos.lerp(u.target, u.speed);
        u.pos.y += Math.sin(time * 2 + i) * 0.005;
        
        const child = groupRef.current?.children[i];
        if (child) {
            // Safe update of position
            child.position.copy(u.pos);
        }
    });
  });

  return (
    <group ref={groupRef}>
      {users.map((user) => (
        <group key={user.id} position={[user.pos.x, user.pos.y, user.pos.z]}>
            <mesh>
                <sphereGeometry args={[0.1, 16, 16]} />
                <meshBasicMaterial color={user.color} toneMapped={false} transparent opacity={0.8} />
            </mesh>
            <pointLight color={user.color} distance={2} intensity={0.5} />
            <Html position={[0, 0.25, 0]} center sprite zIndexRange={[50, 0]}>
                <div className="text-[10px] text-white font-sans bg-black/30 px-2 py-0.5 rounded-full backdrop-blur-[2px] whitespace-nowrap opacity-80 border border-white/10">
                    {user.name}
                </div>
            </Html>
        </group>
      ))}
    </group>
  );
};
