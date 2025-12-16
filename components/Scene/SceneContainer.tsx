import React, { Suspense, useState, useRef, useEffect, memo, useMemo } from 'react';
import { Canvas } from '@react-three/fiber';
import { OrbitControls, PerspectiveCamera, CameraShake } from '@react-three/drei';
import { EffectComposer, Bloom, Vignette } from '@react-three/postprocessing';
import * as THREE from 'three';
import { v4 as uuidv4 } from 'uuid';

import { useGame } from '../../context/GameContext';
import { useQuality } from '../../hooks/useQuality';
import { audioManager } from '../../utils/audio';
import { DecorationType, Decoration } from '../../types';
import { getSnowHeight } from '../../utils/snowMath';

// Components
import { ChristmasTree } from '../Tree';
import { SnowGlobe } from '../SnowGlobe';
import { SimulatedUsers } from '../SimulatedUsers';
import { Gifts } from '../Gifts';
import { Campfire } from '../Campfire';
import { WillOTheWisp } from '../WillOTheWisp';
import { Fireworks } from '../Fireworks';
import { SantaAirdrop } from '../SantaAirdrop';
import { SolarSystem } from '../SolarSystem';

// --- MEMOIZED COMPONENTS ---
const MemoizedTree = memo(ChristmasTree);
const MemoizedGlobe = memo(SnowGlobe);
const MemoizedGifts = memo(Gifts);

// Helper for Scene Lighting
const SceneLighting = ({ isLit, shadowsEnabled }: { isLit: boolean, shadowsEnabled: boolean }) => {
    return (
        <>
            <ambientLight intensity={isLit ? 0.4 : 0.05} color="#ccddff" />
            
            {/* 
               The SUN Light - Positioned to match the SolarSystem visual Sun [50, 20, 50].
               Increased map size for sharper shadows over large distances.
            */}
            <directionalLight 
                position={[50, 20, 50]} 
                intensity={isLit ? 1.5 : 0.1} 
                castShadow={shadowsEnabled} 
                shadow-mapSize={[2048, 2048]}
                shadow-camera-left={-20}
                shadow-camera-right={20}
                shadow-camera-top={20}
                shadow-camera-bottom={-20}
                color="#ffeedd"
            />

            {/* Rim light for cinematic edge highlighting */}
            <spotLight 
                position={[-20, 10, -20]} 
                angle={0.5} 
                penumbra={1} 
                intensity={isLit ? 0.5 : 0} 
                color="#4455ff"
            />
        </>
    );
};

// --- INTERACTION CONTROLLER ---
// Handles keyboard inputs and specific scene interactions
const InteractionController = ({ 
    setFireworksPos, 
    setSuperNovaTrigger, 
    setHeatWaveIntensity, 
    setGlobalFlareTrigger,
    setAirdropActive,
    setShakeIntensity
}: any) => {
    const { state } = useGame();
    const lastKeyTime = useRef(0);
    const lastFlareTime = useRef(0); // Strict debounce for Flare

    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            const tag = (document.activeElement?.tagName || '').toUpperCase();
            if (tag === 'INPUT' || tag === 'TEXTAREA') return;
            if (state.gameState === 'LOBBY') return;

            const now = Date.now();
            
            // Standard debounce for interactions
            if (now - lastKeyTime.current < 200) return;

            if (e.key.toLowerCase() === 'g') {
                // STRICT DEBOUNCE: 3 Seconds to prevent particle explosion/crash
                if (now - lastFlareTime.current < 3000) return;
                
                lastKeyTime.current = now;
                lastFlareTime.current = now;
                
                setGlobalFlareTrigger((prev: number) => prev + 1);
                setHeatWaveIntensity(2); // Set max intensity
            } else if (e.key.toLowerCase() === 'h') {
                lastKeyTime.current = now;
                setAirdropActive(true);
            } else if (e.key.toLowerCase() === 'j') {
                lastKeyTime.current = now;
                setFireworksPos(new THREE.Vector3(0, 4.8, 0));
                setSuperNovaTrigger(now);
                audioManager.playFirework();
            }
        };

        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [state.gameState]);
    
    return null;
};

// --- WISP FIELD GENERATOR ---
const WispField = ({ count }: { count: number }) => {
    const wisps = useMemo(() => {
        const colors = ['#00ffff', '#ffaa00', '#00ffaa', '#b388ff', '#ff00ff'];
        return Array.from({ length: count }).map((_, i) => {
            const angle = Math.random() * Math.PI * 2;
            const radius = 3 + Math.random() * 5; // Distribute around the tree
            return {
                id: i,
                position: [
                    Math.cos(angle) * radius,
                    Math.random() * 2, // Varied heights
                    Math.sin(angle) * radius
                ] as [number, number, number],
                color: colors[Math.floor(Math.random() * colors.length)]
            };
        });
    }, [count]);

    return (
        <>
            {wisps.map(w => (
                <WillOTheWisp key={w.id} position={w.position} color={w.color} />
            ))}
        </>
    );
};

interface SceneContainerProps {
  onDecorateStart: (point: THREE.Vector3) => void;
  onGiftOpen: (msg: string) => void;
  onAirdropStart: () => void;
  airdropActive: boolean;
  setAirdropActive: (v: boolean) => void;
}

export const SceneContainer: React.FC<SceneContainerProps> = ({ 
    onDecorateStart, 
    onGiftOpen, 
    airdropActive,
    setAirdropActive 
}) => {
  const { state, dispatch } = useGame();
  const quality = useQuality();

  const [fireworksPos, setFireworksPos] = useState<THREE.Vector3 | null>(null);
  const [superNovaTrigger, setSuperNovaTrigger] = useState(0);
  const [shakeIntensity, setShakeIntensity] = useState(0);
  const [globalFlareTrigger, setGlobalFlareTrigger] = useState(0);
  const [heatWaveIntensity, setHeatWaveIntensity] = useState(0);

  // Shake Decay Loop
  useEffect(() => {
    if (state.gameState === 'LOBBY') return;
    const decay = setInterval(() => {
        setShakeIntensity(prev => Math.max(0, prev * 0.9));
        setHeatWaveIntensity(prev => Math.max(0, prev * 0.9));
    }, 100);
    return () => clearInterval(decay);
  }, [state.gameState]);

  const handlePointerMove = (e: React.PointerEvent) => {
      const speed = Math.abs(e.movementX) + Math.abs(e.movementY);
      if (speed > 5) {
          setShakeIntensity(prev => Math.min(1.5, prev + speed * 0.002));
      }
  };

  const handleStarClick = (pos: THREE.Vector3) => {
    setFireworksPos(pos);
    audioManager.playFirework();
  };

  const handleAirdropExplosion = () => {
    audioManager.playFirework();
    setFireworksPos(new THREE.Vector3(0, 4.8, 0));

    const newItems: Decoration[] = [];
    const types: DecorationType[] = ['orb', 'star', 'candy', 'stocking'];
    const colors = ['#ff0000', '#00ff00', '#0000ff', '#ffff00', '#ff00ff'];
    const spawnCount = quality.tier === 'HIGH' ? 20 : 10;

    for(let i = 0; i < spawnCount; i++) {
        const distBias = 1 - Math.sqrt(Math.random());
        const minY = 1.5;
        const maxY = 4.0;
        const y = minY + (distBias * (maxY - minY));
        const treeHeight = 3.0; 
        const heightFromBase = y - 1.5;
        const radiusAtY = 1.6 * (1 - (heightFromBase / treeHeight));
        const theta = Math.random() * Math.PI * 2;
        
        newItems.push({
            id: uuidv4(),
            position: [radiusAtY * Math.cos(theta), y, radiusAtY * Math.sin(theta)],
            type: types[Math.floor(Math.random() * types.length)],
            color: colors[Math.floor(Math.random() * colors.length)],
            sender: 'Santa',
            message: 'Ho Ho Ho!',
            timestamp: Date.now()
        });
    }

    dispatch({ type: 'ADD_DECORATIONS_BATCH', payload: newItems });
  };

  const safeHeatWave = Math.min(heatWaveIntensity, 2.0);

  // Calculate Campfire positions with gravity
  const cf1 = useMemo(() => [4, getSnowHeight(4, 2), 2] as [number, number, number], []);
  const cf2 = useMemo(() => [-3, getSnowHeight(-3, 3), 3] as [number, number, number], []);
  const cf3 = useMemo(() => [0, getSnowHeight(0, -5), -5] as [number, number, number], []);

  return (
    <div 
        style={{ width: '100%', height: '100%' }}
        onPointerMove={handlePointerMove}
    >
        <Canvas shadows={quality.shadowsEnabled} dpr={quality.dpr}>
            <InteractionController 
                setFireworksPos={setFireworksPos}
                setSuperNovaTrigger={setSuperNovaTrigger}
                setHeatWaveIntensity={setHeatWaveIntensity}
                setGlobalFlareTrigger={setGlobalFlareTrigger}
                setAirdropActive={setAirdropActive}
                setShakeIntensity={setShakeIntensity}
            />

            <PerspectiveCamera makeDefault position={[0, 10, 25]} fov={45} near={0.01} />
            
            <CameraShake 
                maxPitch={0.05 * safeHeatWave} 
                maxYaw={0.05 * safeHeatWave} 
                maxRoll={0.05 * safeHeatWave} 
                yawFrequency={10} 
                pitchFrequency={10} 
                rollFrequency={10}
                intensity={safeHeatWave}
                decay={true}
                decayRate={0.65} 
            />

            <OrbitControls 
                makeDefault
                target={[0, 0, 0]}
                enablePan={false}
                enableDamping={true}
                dampingFactor={0.05}
                minDistance={5}
                maxDistance={50}
                minAzimuthAngle={-Infinity}
                maxAzimuthAngle={Infinity}
                minPolarAngle={0}
                maxPolarAngle={Math.PI / 2 - 0.05}
                autoRotate={false}
            />

            <SceneLighting isLit={state.isLit} shadowsEnabled={quality.shadowsEnabled} />

            <Suspense fallback={null}>
                {/* 
                    Stylized Solar System Background 
                    Renders planets and stars outside the globe
                */}
                <SolarSystem />

                <MemoizedGlobe isNight={true} shakeIntensity={shakeIntensity} />
                
                <MemoizedTree 
                    snowAmount={state.snowAmount} 
                    onDecorateStart={onDecorateStart}
                    decorations={state.decorations}
                    isLit={state.isLit}
                    onStarClick={handleStarClick}
                    superNovaTrigger={superNovaTrigger}
                />

                <SantaAirdrop 
                    isActive={airdropActive} 
                    onComplete={() => setAirdropActive(false)}
                    onExplode={handleAirdropExplosion}
                />

                {fireworksPos && (
                    <Fireworks 
                        position={[fireworksPos.x, fireworksPos.y, fireworksPos.z]} 
                        onComplete={() => setFireworksPos(null)} 
                    />
                )}

                <Campfire position={cf1} flareTrigger={globalFlareTrigger} />
                <Campfire position={cf2} flareTrigger={globalFlareTrigger} />
                <Campfire position={cf3} flareTrigger={globalFlareTrigger} />

                <WispField count={quality.tier === 'HIGH' ? 18 : 8} />

                <MemoizedGifts onOpen={onGiftOpen} />
                
                <SimulatedUsers />
            </Suspense>

            {quality.effectsEnabled && (
                <EffectComposer enableNormalPass={false}>
                    <Bloom 
                        luminanceThreshold={state.isLit ? 1.0 : 4.0} 
                        mipmapBlur 
                        intensity={state.isLit ? 1.5 : 0} 
                        radius={0.4}
                    />
                    <Vignette eskil={false} offset={0.1} darkness={1.1} />
                </EffectComposer>
            )}
        </Canvas>
    </div>
  );
};
