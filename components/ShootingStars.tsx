import React, { useRef, useState } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';

const Star = () => {
  const mesh = useRef<THREE.Mesh>(null);
  const [active, setActive] = useState(false);
  
  // Random start
  const [startPos] = useState(() => new THREE.Vector3(
    (Math.random() - 0.5) * 20,
    10 + Math.random() * 5,
    (Math.random() - 0.5) * 20
  ));
  
  const [speed] = useState(0.2 + Math.random() * 0.3);
  const [direction] = useState(() => new THREE.Vector3(
      Math.random() - 0.5,
      -0.5 - Math.random() * 0.5,
      Math.random() - 0.5
  ).normalize());

  useFrame(() => {
    if (!active) {
        // Random chance to start
        if (Math.random() < 0.002) {
            setActive(true);
            if(mesh.current) {
                mesh.current.position.copy(startPos);
                mesh.current.visible = true;
            }
        }
    } else {
        if (mesh.current) {
            mesh.current.position.addScaledVector(direction, speed);
            // Reset if below ground
            if (mesh.current.position.y < 0) {
                setActive(false);
                mesh.current.visible = false;
            }
        }
    }
  });

  return (
    <mesh ref={mesh} visible={false} frustumCulled={false}>
        <cylinderGeometry args={[0.02, 0, 0.8]} />
        <meshBasicMaterial color="#ffffff" transparent opacity={0.8} />
    </mesh>
  );
};

export const ShootingStars = () => {
  return (
    <group>
        {Array.from({ length: 5 }).map((_, i) => <Star key={i} />)}
    </group>
  );
};