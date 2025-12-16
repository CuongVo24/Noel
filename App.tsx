import React, { useState, useCallback } from 'react';
import * as THREE from 'three';
import { v4 as uuidv4 } from 'uuid';

import { GameProvider, useGame } from './context/GameContext';
import { audioManager } from './utils/audio';
import { DecorationType, Decoration } from './types';
import { addDecorationToDB } from './utils/firebase';

// UI Layouts
import { Overlay } from './components/Overlay';
import { InventoryBar } from './components/InventoryBar';
import { SceneContainer } from './components/Scene/SceneContainer';

// --- MAIN LAYOUT COMPONENT ---
const GameLayout = () => {
  const { state, dispatch } = useGame();
  
  const [selectedType, setSelectedType] = useState<DecorationType>('orb');
  const [pendingPosition, setPendingPosition] = useState<THREE.Vector3 | null>(null);
  const [pendingNormal, setPendingNormal] = useState<THREE.Vector3 | null>(null);
  const [decorationMessage, setDecorationMessage] = useState('');
  const [activeGiftMsg, setActiveGiftMsg] = useState<string | null>(null);
  const [airdropActive, setAirdropActive] = useState(false);

  // Handlers
  const handleStart = (name: string, color: string) => {
    dispatch({ type: 'START_GAME', payload: { name, color } });
  };

  const handlePowerToggle = () => {
    dispatch({ type: 'TOGGLE_LIGHTS' });
  };

  // Updated to handle normal vector for alignment
  const handleDecorateStart = useCallback((point: THREE.Vector3, normal?: THREE.Vector3, dropType?: DecorationType) => {
    if (!state.isLit) return; 

    if (dropType) {
        // INSTANT PLACEMENT FOR DRAG & DROP
        const randomMsgs = ["Happy Holidays!", "Merry Christmas!", "Joy to the World", "Peace & Love", "Warm Wishes"];
        const msg = randomMsgs[Math.floor(Math.random() * randomMsgs.length)];

        const newDec: Decoration = {
            id: uuidv4(),
            position: [point.x, point.y, point.z],
            normal: normal ? [normal.x, normal.y, normal.z] : [0, 1, 0],
            type: dropType,
            color: state.userColor,
            sender: state.userName,
            message: msg,
            timestamp: Date.now()
        };
        
        // MIGRATION: Write to Firebase instead of local dispatch
        addDecorationToDB(newDec);
        audioManager.playChime();
    } else {
        // CLICK INTERACTION -> OPEN MODAL
        setPendingPosition(point);
        setPendingNormal(normal || new THREE.Vector3(0, 1, 0));
        setDecorationMessage(''); 
    }
  }, [state.isLit, state.userColor, state.userName]);

  const handleConfirmDecoration = (e: React.FormEvent) => {
    e.preventDefault();
    if (!pendingPosition) return;

    const newDec: Decoration = {
        id: uuidv4(),
        position: [pendingPosition.x, pendingPosition.y, pendingPosition.z],
        normal: pendingNormal ? [pendingNormal.x, pendingNormal.y, pendingNormal.z] : [0, 1, 0],
        type: selectedType,
        color: state.userColor,
        sender: state.userName,
        message: decorationMessage || "Happy Holidays!",
        timestamp: Date.now()
    };
    
    // MIGRATION: Write to Firebase instead of local dispatch
    addDecorationToDB(newDec);
    
    audioManager.playChime(); 
    setPendingPosition(null);
    setPendingNormal(null);
  };

  const bgColor = state.isLit ? '#050510' : '#020205';

  return (
    <div style={{ backgroundColor: bgColor, width: '100%', height: '100%', transition: 'background-color 2s ease' }}>
      
      {/* 1. UI OVERLAY LAYER (DOM) */}
      <Overlay 
        gameState={state.gameState} 
        onStart={handleStart}
        ceremony={state.ceremony}
        onPowerClick={handlePowerToggle}
        activeGiftMessage={activeGiftMsg}
        onCloseGift={() => setActiveGiftMsg(null)}
        isLightsOn={state.isLit}
      />

      {/* Airdrop Button */}
      {state.isLit && (
          <button 
            onClick={() => setAirdropActive(true)}
            className="absolute top-20 right-4 z-50 bg-red-600 hover:bg-red-500 text-white p-2 rounded-full border-2 border-white shadow-lg font-bold text-xs pointer-events-auto"
          >
              🎁 DROP
          </button>
      )}

      {/* Inventory Bar (Draggable) */}
      {state.gameState === 'DECORATING' && state.isLit && (
          <InventoryBar selectedType={selectedType} onSelect={setSelectedType} />
      )}

      {/* Decoration Modal (For Clicks) */}
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
                        onClick={() => { setPendingPosition(null); setPendingNormal(null); }}
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

      {/* 2. 3D SCENE LAYER (Canvas) */}
      <SceneContainer 
        onDecorateStart={handleDecorateStart}
        onGiftOpen={setActiveGiftMsg}
        onAirdropStart={() => setAirdropActive(true)}
        airdropActive={airdropActive}
        setAirdropActive={setAirdropActive}
      />
    </div>
  );
};

// --- APP ROOT ---
const App = () => {
  return (
    <GameProvider>
      <GameLayout />
    </GameProvider>
  );
};

export default App;
