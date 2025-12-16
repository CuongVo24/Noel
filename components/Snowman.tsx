import React from 'react';
import '../types';

export const Snowman: React.FC<{ position: [number, number, number], rotation?: [number, number, number] }> = ({ position, rotation = [0,0,0] }) => {
  return (
    <group position={position} rotation={rotation}>
        {/* Body Stack */}
        <mesh position={[0, 0.4, 0]} castShadow receiveShadow>
            <sphereGeometry args={[0.45, 16, 16]} />
            <meshStandardMaterial color="white" roughness={0.9} />
        </mesh>
        <mesh position={[0, 1.0, 0]} castShadow receiveShadow>
            <sphereGeometry args={[0.35, 16, 16]} />
            <meshStandardMaterial color="white" roughness={0.9} />
        </mesh>
        <mesh position={[0, 1.5, 0]} castShadow receiveShadow>
            <sphereGeometry args={[0.25, 16, 16]} />
            <meshStandardMaterial color="white" roughness={0.9} />
        </mesh>
        
        {/* Buttons */}
        <mesh position={[0, 1.0, 0.32]}>
             <sphereGeometry args={[0.03]} />
             <meshStandardMaterial color="#1a1a1a" />
        </mesh>
        <mesh position={[0, 1.15, 0.28]}>
             <sphereGeometry args={[0.03]} />
             <meshStandardMaterial color="#1a1a1a" />
        </mesh>

        {/* Eyes */}
        <mesh position={[0.08, 1.55, 0.2]}>
             <sphereGeometry args={[0.03]} />
             <meshStandardMaterial color="#1a1a1a" />
        </mesh>
        <mesh position={[-0.08, 1.55, 0.2]}>
             <sphereGeometry args={[0.03]} />
             <meshStandardMaterial color="#1a1a1a" />
        </mesh>

        {/* Carrot Nose */}
        <mesh position={[0, 1.5, 0.25]} rotation={[1.5, 0, 0]}>
            <coneGeometry args={[0.04, 0.25, 8]} />
            <meshStandardMaterial color="orange" />
        </mesh>

        {/* Stick Arms */}
        <mesh position={[0.3, 1.1, 0]} rotation={[0, 0, -0.5]}>
            <cylinderGeometry args={[0.02, 0.02, 0.6]} />
            <meshStandardMaterial color="#3e2723" />
        </mesh>
         <mesh position={[-0.3, 1.1, 0]} rotation={[0, 0, 0.5]}>
            <cylinderGeometry args={[0.02, 0.02, 0.6]} />
            <meshStandardMaterial color="#3e2723" />
        </mesh>
        
        {/* Top Hat */}
         <mesh position={[0, 1.7, 0]}>
            <cylinderGeometry args={[0.25, 0.25, 0.05]} />
            <meshStandardMaterial color="#1a1a1a" />
        </mesh>
         <mesh position={[0, 1.9, 0]}>
            <cylinderGeometry args={[0.15, 0.15, 0.4]} />
            <meshStandardMaterial color="#1a1a1a" />
        </mesh>
        
        {/* Scarf */}
        <mesh position={[0, 1.3, 0]}>
            <torusGeometry args={[0.22, 0.05, 8, 16]} />
            <meshStandardMaterial color="#d32f2f" />
        </mesh>
    </group>
  );
};
