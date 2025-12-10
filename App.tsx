import React, { useState, useEffect, Suspense, useCallback, useRef } from 'react';
import { Canvas } from '@react-three/fiber';
import { OrbitControls, PerspectiveCamera, CameraShake } from '@react-three/drei';
import { EffectComposer, Bloom, Vignette } from '@react-three/postprocessing';
import * as THREE from 'three';
import { v4 as uuidv4 } from 'uuid';

import { ChristmasTree } from './components/Tree';
import { SnowGlobe } from './components/SnowGlobe';
import { SimulatedUsers } from './components/SimulatedUsers';
import { Overlay } from './components/Overlay';
import { Gifts } from './components/Gifts';
import { Campfire } from './components/Campfire';
import { WillOTheWisp } from './components/WillOTheWisp'; // Replaced Snowman
import { InventoryBar } from './components/InventoryBar';
import { Fireworks } from './components/Fireworks';
import { SantaAirdrop } from './components/SantaAirdrop';
import { GameState, Decoration, CeremonyState, DecorationType } from './types';
import { CEREMONY_TARGET } from './constants';
import { audioManager } from './utils/audio';

// Helper component to animate lights
const SceneLighting = ({ isLit }: { isLit: boolean }) => {
    return (
        <>
            <ambientLight intensity={isLit ? 0.3 : 0.02} color="#ccddff" />
            <directionalLight 
                position={[10, 20, 10]} 
                intensity={isLit ? 0.8 : 0.1} 
                castShadow 
                shadow-mapSize={[1024, 1024]}
                color="#aaddff"
            />
            <spotLight 
                position={[0, 10, 0]} 
                angle={0.5} 
                penumbra={1} 
                intensity={isLit ? 1 : 0} 
                castShadow
                color="#ffaa44"
            />
        </>
    );
};

const App: React.FC = () => {
  const [gameState, setGameState] = useState<GameState>('LOBBY');
  const [userName, setUserName] = useState('');
  const [userColor, setUserColor] = useState('#ff0000');
  
  // Ceremony/Lighting State
  const [ceremony, setCeremony] = useState<CeremonyState>({ active: false, progress: 0, target: CEREMONY_TARGET });
  const [treeLit, setTreeLit] = useState(false);

  // Decoration State
  const [decorations, setDecorations] = useState<Decoration[]>([]);
  const [selectedType, setSelectedType] = useState<DecorationType>('orb');
  const [pendingPosition, setPendingPosition] = useState<THREE.Vector3 | null>(null);
  const [decorationMessage, setDecorationMessage] = useState('');

  // Fireworks State
  const [fireworksPos, setFireworksPos] = useState<THREE.Vector3 | null>(null);

  // Gift State
  const [activeGiftMsg, setActiveGiftMsg] = useState<string | null>(null);

  // Time simulation
  const [snowAmount, setSnowAmount] = useState(0);

  // Shake & Airdrop State
  const [shakeIntensity, setShakeIntensity] = useState(0);
  const [airdropActive, setAirdropActive] = useState(false);

  // Global Effects Triggers
  const [globalFlareTrigger, setGlobalFlareTrigger] = useState(0);
  const [heatWaveIntensity, setHeatWaveIntensity] = useState(0);
  const lastKeyTime = useRef(0);

  const handleStart = (name: string, color: string) => {
    setUserName(name);
    setUserColor(color);
    setGameState('DECORATING');
  };

  useEffect(() => {
    if (gameState === 'LOBBY') return;
    const interval = setInterval(() => {
        setSnowAmount(prev => Math.min(prev + 0.005, 0.8));
    }, 1000);

    // Shake Decay for heatwave
    const decay = setInterval(() => {
        setShakeIntensity(prev => Math.max(0, prev * 0.9));
        setHeatWaveIntensity(prev => Math.max(0, prev * 0.9));
    }, 100);

    return () => {
        clearInterval(interval);
        clearInterval(decay);
    };
  }, [gameState]);

  // Keyboard Controls
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
        if (gameState === 'LOBBY') return;
        const now = Date.now();
        // 200ms Debounce
        if (now - lastKeyTime.current < 200) return;

        if (e.key.toLowerCase() === 'g') {
            lastKeyTime.current = now;
            setGlobalFlareTrigger(prev => prev + 1);
            setHeatWaveIntensity(2); // High intensity shake for heat wave
        } else if (e.key.toLowerCase() === 'h') {
            lastKeyTime.current = now;
            setAirdropActive(true);
        } else if (e.key.toLowerCase() === 'j') {
            // FIREWORKS TRIGGER
            lastKeyTime.current = now;
            setFireworksPos(new THREE.Vector3(0, 4.8, 0));
            audioManager.playFirework();
        }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [gameState]);

  // Decoration Handler
  const handleDecorateStart = useCallback((point: THREE.Vector3) => {
    if (!treeLit) return; 
    setPendingPosition(point);
    setDecorationMessage(''); 
  }, [treeLit]);

  const handleConfirmDecoration = (e: React.FormEvent) => {
    e.preventDefault();
    if (!pendingPosition) return;

    const newDec: Decoration = {
        id: uuidv4(),
        position: [pendingPosition.x, pendingPosition.y, pendingPosition.z],
        type: selectedType,
        color: userColor,
        sender: userName,
        message: decorationMessage || "Happy Holidays!",
        timestamp: Date.now()
    };
    
    setDecorations(prev => [...prev, newDec]);
    audioManager.playChime(); 
    setPendingPosition(null);
  };

  const handlePowerOn = () => {
      setTreeLit(true);
      setCeremony({ ...ceremony, active: false });
  };

  const handleStarClick = (pos: THREE.Vector3) => {
    setFireworksPos(pos);
    audioManager.playFirework();
  };

  const handleAirdropExplosion = () => {
      audioManager.playFirework(); 
      const newItems: Decoration[] = [];
      const types: DecorationType[] = ['orb', 'star', 'candy', 'stocking'];
      const colors = ['#ff0000', '#00ff00', '#0000ff', '#ffff00', '#ff00ff'];

      const spawnCount = 20;

      for(let i = 0; i < spawnCount; i++) {
          // Optimized Scattering Logic
          // 1. Pick Height (Y). Bias towards lower values to distribute evenly over cone surface area.
          // range 0 to 1, biased towards 0
          const distBias = 1 - Math.sqrt(Math.random());
          
          // Map to Tree Vertical Range: 1.5 (bottom branches) to 4.0 (top branches)
          const minY = 1.5;
          const maxY = 4.0;
          const y = minY + (distBias * (maxY - minY));
          
          // 2. Calculate Radius at this Y
          // Base radius at Y=1.5 is approx 1.6. Radius at top (Y=4.5) is 0.
          // Linear cone slope calculation
          const treeHeight = 3.0; // 4.5 - 1.5
          const heightFromBase = y - 1.5;
          const radiusAtY = 1.6 * (1 - (heightFromBase / treeHeight));
          
          // 3. Random Angle
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
      setDecorations(prev => [...prev, ...newItems]);
      
      // Also trigger a fireworks burst at top
      setFireworksPos(new THREE.Vector3(0, 4.8, 0));
  };

  // Shake Detection for SnowGlobe particles only
  const handlePointerMove = (e: React.PointerEvent) => {
      const speed = Math.abs(e.movementX) + Math.abs(e.movementY);
      if (speed > 5) {
          setShakeIntensity(prev => Math.min(1.5, prev + speed * 0.002));
      }
  };

  const isNight = true;
  const bgColor = treeLit ? '#050510' : '#020205';

  return (
    <div 
        style={{ backgroundColor: bgColor, width: '100%', height: '100%', transition: 'background-color 2s ease' }}
        onPointerMove={handlePointerMove}
    >
      <Overlay 
        gameState={gameState} 
        onStart={handleStart}
        ceremony={ceremony}
        onPowerClick={handlePowerOn}
        activeGiftMessage={activeGiftMsg}
        onCloseGift={() => setActiveGiftMsg(null)}
        isLightsOn={treeLit}
      />

      {/* Airdrop Button (Top Right) */}
      {treeLit && (
          <button 
            onClick={() => setAirdropActive(true)}
            className="absolute top-20 right-4 z-50 bg-red-600 hover:bg-red-500 text-white p-2 rounded-full border-2 border-white shadow-lg font-bold text-xs"
          >
              🎁 DROP
          </button>
      )}

      {/* Inventory Bar */}
      {gameState === 'DECORATING' && treeLit && (
          <InventoryBar selectedType={selectedType} onSelect={setSelectedType} />
      )}

      {/* Message Input Modal */}
      {pendingPosition && (
          <div className="absolute inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm pointer-events-auto">
              <form onSubmit={handleConfirmDecoration} className="bg-[#1a1a2e] p-6 rounded-lg border border-white/20 shadow-xl w-80">
                  <h3 className="text-yellow-400 font-[Cinzel] mb-4">Add a Wish</h3>
                  <textarea 
                    autoFocus
                    maxLength={50}
                    placeholder="Write a short wish..."
                    value={decorationMessage}
                    onChange={e => setDecorationMessage(e.target.value)}
                    className="w-full bg-black/50 text-white p-2 rounded mb-4 focus:outline-none focus:border-yellow-400 border border-white/10"
                    rows={3}
                  />
                  <div className="flex gap-2">
                      <button 
                        type="button" 
                        onClick={() => setPendingPosition(null)}
                        className="flex-1 bg-gray-600 hover:bg-gray-500 text-white py-2 rounded"
                      >
                          Cancel
                      </button>
                      <button 
                        type="submit"
                        className="flex-1 bg-yellow-600 hover:bg-yellow-500 text-white py-2 rounded font-bold"
                      >
                          Hang It!
                      </button>
                  </div>
              </form>
          </div>
      )}

      <Canvas shadows dpr={[1, 2]}>
        {/* Camera Reset: High, Wide angle for full view */}
        <PerspectiveCamera makeDefault position={[0, 10, 25]} fov={45} />
        
        {/* Heatwave Shake Effect - Only active on G key press */}
        <CameraShake 
            maxPitch={0.1 * heatWaveIntensity} 
            maxYaw={0.1 * heatWaveIntensity} 
            maxRoll={0.1 * heatWaveIntensity} 
            yawFrequency={10} 
            pitchFrequency={10} 
            rollFrequency={10}
            intensity={heatWaveIntensity} 
        />

        {/* OrbitControls: Clean Hard Reset */}
        <OrbitControls 
            makeDefault
            target={[0, 0, 0]}
            enablePan={false}
            enableDamping={true}
            dampingFactor={0.05}
            minDistance={5}
            maxDistance={50}
            // Fully Unlock Angles for 360 sphere rotation
            minAzimuthAngle={-Infinity}
            maxAzimuthAngle={Infinity}
            minPolarAngle={0}
            maxPolarAngle={Math.PI}
            // Disable auto rotate for manual control
            autoRotate={false}
        />

        <SceneLighting isLit={treeLit} />

        <Suspense fallback={null}>
            <SnowGlobe isNight={isNight} shakeIntensity={shakeIntensity} />
            
            <ChristmasTree 
                snowAmount={snowAmount} 
                onDecorateStart={handleDecorateStart}
                decorations={decorations}
                isLit={treeLit}
                onStarClick={handleStarClick}
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

            <Campfire position={[4, 0, 2]} flareTrigger={globalFlareTrigger} />
            <Campfire position={[-3, 0, 3]} flareTrigger={globalFlareTrigger} />
            <Campfire position={[0, 0, -5]} flareTrigger={globalFlareTrigger} />

            {/* Replaced Snowmen with Will-o'-the-Wisps */}
            <WillOTheWisp position={[-3, 0, -2]} color="#00ffff" />
            <WillOTheWisp position={[2.5, 0, 4]} color="#ffaa00" />
            <WillOTheWisp position={[4.5, 0, -3]} color="#00ffaa" />

            <Gifts onOpen={setActiveGiftMsg} />
            
            <SimulatedUsers />
        </Suspense>

        <EffectComposer enableNormalPass={false}>
            <Bloom 
                luminanceThreshold={treeLit ? 1 : 0.5} 
                mipmapBlur 
                intensity={1.5} 
                radius={0.4}
            />
            <Vignette eskil={false} offset={0.1} darkness={1.1} />
        </EffectComposer>
      </Canvas>
    </div>
  );
};

export default App;