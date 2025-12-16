import React, { useRef, useState, useMemo, useLayoutEffect, memo } from 'react';
import { useFrame } from '@react-three/fiber';
import { Html } from '@react-three/drei';
import * as THREE from 'three';
import { Decoration } from '../types';

const DecorationMeshComponent: React.FC<{ data: Decoration; isLit: boolean }> = ({ data, isLit }) => {
  const groupRef = useRef<THREE.Group>(null);
  const [hovered, setHovered] = useState(false);
  const [born, setBorn] = useState(0);

  // Early return if data is invalid to prevent "undefined" errors
  if (!data || !data.position) return null;

  // Calculate alignment quaternion based on the normal vector
  const orientation = useMemo(() => {
    // Robust check for data.normal to prevent spread errors
    const hasNormal = data.normal && Array.isArray(data.normal) && data.normal.length === 3;
    let normal = hasNormal ? new THREE.Vector3(...data.normal!) : new THREE.Vector3(0, 1, 0);
    
    // Safety check: Ensure normal is not zero-length or NaN
    if (normal.lengthSq() < 0.0001 || isNaN(normal.x)) {
        normal = new THREE.Vector3(0, 1, 0);
    } else {
        normal.normalize();
    }
    
    // CHANGED: Use (0,0,1) [Z-Axis] as the reference "Forward" vector.
    // This implies that the decoration's Z-axis will point OUT from the tree.
    const forward = new THREE.Vector3(0, 0, 1);
    
    const alignQuat = new THREE.Quaternion();
    
    // Check dot product to avoid singularity at 180 degrees in setFromUnitVectors
    const dot = forward.dot(normal);
    if (dot < -0.9999) {
        // Parallel but opposite direction
        alignQuat.setFromAxisAngle(new THREE.Vector3(1, 0, 0), Math.PI);
    } else if (dot > 0.9999) {
        // Parallel same direction
        alignQuat.identity();
    } else {
        alignQuat.setFromUnitVectors(forward, normal);
    }
    
    // Add random spin around the normal axis for variety
    const randomSpin = new THREE.Quaternion().setFromAxisAngle(normal, Math.random() * Math.PI * 2);
    return alignQuat.multiply(randomSpin);
  }, [data.normal]);

  // Apply quaternion manually to avoid "read-only property" assignment errors in R3F
  useLayoutEffect(() => {
    if (groupRef.current) {
        groupRef.current.quaternion.copy(orientation);
    }
  }, [orientation]);

  // Memoize geometry for the star to improve performance
  const starGeometry = useMemo(() => {
    const shape = new THREE.Shape();
    const points = 5;
    const outerRadius = 0.15;
    const innerRadius = 0.07;
    
    for (let i = 0; i < points * 2; i++) {
        const r = (i % 2 === 0) ? outerRadius : innerRadius;
        const a = (i / (points * 2)) * Math.PI * 2;
        const x = Math.cos(a + Math.PI / 2) * r; // Rotate to point up
        const y = Math.sin(a + Math.PI / 2) * r;
        if (i === 0) shape.moveTo(x, y);
        else shape.lineTo(x, y);
    }
    shape.closePath();
    
    return new THREE.ExtrudeGeometry(shape, { depth: 0.05, bevelEnabled: true, bevelThickness: 0.01, bevelSize: 0.01, bevelSegments: 2 });
  }, []);

  useFrame((state) => {
    // Entrance animation
    if (born < 1) {
        setBorn(prev => Math.min(prev + 0.05, 1));
        if (groupRef.current) {
            groupRef.current.scale.setScalar(born);
        }
    }
    // Hover idle animation
    if (groupRef.current && hovered) {
        // Rotate around local Z (which is now aligned to normal)
        groupRef.current.rotateZ(0.02);
    }
  });

  const renderContent = () => {
    switch (data.type) {
        case 'star':
            return (
                <group position={[0, 0, 0.15]} scale={1.5}>
                    <mesh geometry={starGeometry} castShadow>
                        <meshStandardMaterial 
                            color="#FFD700" 
                            emissive="#FFD700"
                            emissiveIntensity={isLit ? 0.8 : 0.2}
                            metalness={0.8}
                            roughness={0.2}
                        />
                    </mesh>
                </group>
            );

        case 'candy':
            return (
                <group position={[0, 0, 0.15]} rotation={[0, 0, 0]} scale={0.8}>
                    <mesh position={[0, -0.1, 0]} castShadow>
                        <cylinderGeometry args={[0.03, 0.03, 0.4]} />
                        <meshStandardMaterial color="#f44336" roughness={0.3} metalness={0.1} />
                    </mesh>
                    {[0, 1, 2, 3].map(i => (
                         <mesh key={i} position={[0, -0.25 + (i * 0.1), 0]} rotation={[0.2, 0, 0]}>
                             <torusGeometry args={[0.032, 0.005, 8, 16]} />
                             <meshStandardMaterial color="#ffcdd2" />
                        </mesh>
                    ))}
                    <mesh position={[-0.1, 0.1, 0]} rotation={[0, 0, Math.PI / 2]}>
                        <torusGeometry args={[0.1, 0.03, 8, 16, Math.PI]} />
                        <meshStandardMaterial color="#f44336" roughness={0.3} metalness={0.1} />
                    </mesh>
                </group>
            );

        case 'stocking':
             return (
                 <group position={[0, 0, 0.15]} scale={0.7} rotation={[0, 0, 0]}>
                    <mesh position={[0, 0.15, 0]} castShadow>
                        <cylinderGeometry args={[0.12, 0.1, 0.35]} />
                        <meshStandardMaterial color="#2196f3" roughness={0.9} />
                    </mesh>
                    <mesh position={[0.15, -0.05, 0]} rotation={[0, 0, -0.4]}>
                        <capsuleGeometry args={[0.11, 0.25, 4, 8]} />
                        <meshStandardMaterial color="#2196f3" roughness={0.9} />
                    </mesh>
                    <mesh position={[0, -0.05, 0]}>
                        <sphereGeometry args={[0.115]} />
                        <meshStandardMaterial color="#ff9800" roughness={1} />
                    </mesh>
                    <mesh position={[0.35, -0.12, 0]}>
                        <sphereGeometry args={[0.115]} />
                        <meshStandardMaterial color="#ff9800" roughness={1} />
                    </mesh>
                    <mesh position={[0, 0.35, 0]}>
                        <cylinderGeometry args={[0.14, 0.14, 0.1]} />
                        <meshStandardMaterial color="#ff9800" roughness={1} />
                    </mesh>
                 </group>
             );

        case 'orb':
        default:
            return (
                <group position={[0, 0, 0.25]}>
                    <mesh castShadow>
                        <sphereGeometry args={[0.15, 32, 32]} />
                        <meshStandardMaterial 
                            color="#9c27b0"
                            emissive="#7b1fa2"
                            emissiveIntensity={0.5}
                            metalness={0.7}
                            roughness={0.2}
                            envMapIntensity={1}
                        />
                    </mesh>
                    <mesh position={[0, 0.14, 0]}>
                         <cylinderGeometry args={[0.04, 0.04, 0.05]} />
                         <meshStandardMaterial color="#ffd700" metalness={1} roughness={0.3} />
                    </mesh>
                    <mesh position={[0, 0.17, 0]}>
                         <torusGeometry args={[0.02, 0.005, 8, 16]} />
                         <meshStandardMaterial color="#ffd700" />
                    </mesh>
                </group>
            );
    }
  };

  return (
    <group 
        ref={groupRef}
        position={data.position} 
        // quaternion assigned via useLayoutEffect above
    >
        <group
            onPointerOver={(e) => { e.stopPropagation(); setHovered(true); }}
            onPointerOut={(e) => { e.stopPropagation(); setHovered(false); }}
        >
            {renderContent()}
        </group>

        <pointLight 
            color={data.type === 'orb' ? '#e040fb' : data.type === 'star' ? '#ffeb3b' : data.type === 'stocking' ? '#2196f3' : '#ff5252'}
            intensity={0.4} 
            distance={1.5} 
            decay={2} 
        />
        
        {hovered && (
            <Html distanceFactor={10} position={[0, 0.3, 0]} center zIndexRange={[100, 0]}>
                <div className="bg-black/80 backdrop-blur text-white text-xs p-2 rounded border border-yellow-500/50 min-w-[120px] text-center pointer-events-none">
                    <div className="font-bold text-yellow-400 mb-1">{data.sender}</div>
                    <div className="italic text-gray-300">"{data.message}"</div>
                </div>
            </Html>
        )}
    </group>
  );
};

// Memoize: Add optional chaining to data access to be safe
export const DecorationMesh = memo(DecorationMeshComponent, (prev, next) => {
    return prev.data?.id === next.data?.id && prev.isLit === next.isLit;
});