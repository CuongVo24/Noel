import React, { useState, useEffect } from 'react';
import { GameState, CeremonyState } from '../types';
import { motion, AnimatePresence } from 'framer-motion';
import { audioManager } from '../utils/audio';

interface OverlayProps {
  gameState: GameState;
  onStart: (name: string, color: string) => void;
  ceremony: CeremonyState; // Kept for type compatibility but replaced with new logic
  onPowerClick: () => void; // Used for new logic now
  activeGiftMessage: string | null;
  onCloseGift: () => void;
  isLightsOn: boolean;
}

export const Overlay: React.FC<OverlayProps> = ({ 
  gameState, 
  onStart, 
  activeGiftMessage,
  onCloseGift,
  isLightsOn,
  onPowerClick
}) => {
  const [color, setColor] = React.useState('#ff0000');
  const [isMuted, setIsMuted] = useState(false);
  
  // Power Button State
  const [isCharging, setIsCharging] = useState(false);

  const toggleMute = () => {
    const muted = audioManager.toggleMute();
    setIsMuted(muted);
  };

  const handleStart = () => {
    const randomId = Math.floor(1000 + Math.random() * 9000);
    const generatedName = `Guest ${randomId}`;
    onStart(generatedName, color);
    audioManager.startAmbience();
  };

  const handlePowerInteraction = () => {
      if (isLightsOn || isCharging) return;
      
      setIsCharging(true);
      audioManager.playPowerUp();

      // Trigger Lights On after 1.5s
      setTimeout(() => {
          onPowerClick(); // This sets lightsOn in App
          setIsCharging(false);
      }, 1500);
  };

  // LOBBY SCREEN
  if (gameState === 'LOBBY') {
    return (
      <div className="absolute inset-0 z-50 flex items-center justify-center bg-black/80 text-white font-[Cinzel]">
        <div className="absolute top-8 right-8 group flex flex-col items-center gap-1 cursor-help">
             <div className="w-16 h-10 bg-red-600 relative rounded-sm shadow-lg overflow-hidden border border-yellow-500/30">
                <div className="absolute inset-0 flex items-center justify-center text-yellow-400 text-3xl" style={{ transform: 'translateY(-2px)' }}>
                   ★
                </div>
             </div>
             <span className="text-xs text-yellow-500/80 font-sans tracking-widest">VIETNAM</span>
        </div>

        <div className="max-w-md w-full bg-[#1a1a2e] border border-white/10 p-8 rounded-xl shadow-2xl backdrop-blur-md">
          <h1 className="text-4xl text-center mb-2 text-yellow-400">Cinematic Tree</h1>
          <p className="text-center text-gray-400 mb-8 font-[Lato]">Join the collaborative decoration experience.</p>
          
          <div className="space-y-4">
            <div>
              <label className="block text-sm mb-1 font-[Lato]">Choose Your Spirit Color</label>
              <div className="flex items-center gap-4 bg-black/40 p-2 rounded border border-white/10">
                 <input 
                    type="color" 
                    value={color} 
                    onChange={(e) => setColor(e.target.value)}
                    className="w-12 h-12 bg-transparent cursor-pointer rounded overflow-hidden border-none"
                  />
                  <span className="text-sm text-gray-400">Pick a color for your presence</span>
              </div>
            </div>
            
            <button 
              onClick={handleStart}
              className="w-full bg-yellow-500 hover:bg-yellow-400 text-black font-bold py-3 rounded transition duration-200 mt-4 text-lg"
            >
              Play
            </button>
          </div>
        </div>
      </div>
    );
  }

  // MAIN HUD
  return (
    <div className="absolute inset-0 z-40 pointer-events-none">
      
      {/* Top Bar */}
      <div className="absolute top-0 left-0 w-full p-4 flex justify-between items-start pointer-events-auto">
         <div className="text-white">
           <h2 className="text-xl font-[Cinzel] text-yellow-100 shadow-black drop-shadow-md">Snow Globe Live</h2>
           <p className="text-xs font-[Lato] opacity-70">Click on the tree to decorate</p>
         </div>
         
         <div className="flex gap-4">
             <button 
                onClick={toggleMute}
                className="w-10 h-10 rounded-full bg-white/10 hover:bg-white/20 backdrop-blur border border-white/20 flex items-center justify-center text-white transition-colors"
             >
                 {isMuted ? '🔇' : '🔊'}
             </button>
         </div>
      </div>

      {/* Power / Light Switch Button (Bottom Left) */}
      {!isLightsOn && (
          <div className="absolute bottom-8 left-8 pointer-events-auto">
              <motion.button
                onClick={handlePowerInteraction}
                disabled={isCharging}
                whileHover={{ scale: 1.1 }}
                whileTap={{ scale: 0.95 }}
                className={`w-20 h-20 rounded-full border-4 flex items-center justify-center shadow-[0_0_30px_rgba(255,255,0,0.2)] transition-colors relative overflow-hidden ${isCharging ? 'border-yellow-300 bg-yellow-900' : 'border-gray-500 bg-gray-900 hover:border-yellow-200'}`}
              >
                  {/* Charging Fill Animation */}
                  {isCharging && (
                      <motion.div 
                        initial={{ height: '0%' }}
                        animate={{ height: '100%' }}
                        transition={{ duration: 1.5, ease: "linear" }}
                        className="absolute bottom-0 left-0 w-full bg-yellow-500 z-0"
                      />
                  )}
                  
                  {/* Icon */}
                  <span className="relative z-10 text-3xl filter drop-shadow-lg">
                      {isCharging ? '⚡' : '💡'}
                  </span>
              </motion.button>
              <div className="text-center mt-2 text-yellow-500/80 font-[Cinzel] text-sm uppercase tracking-wider">
                  {isCharging ? 'Charging...' : 'Power Up'}
              </div>
          </div>
      )}

      {/* Gift Reading Overlay */}
      <AnimatePresence>
        {activeGiftMessage && (
            <motion.div 
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.8 }}
                className="absolute inset-0 flex items-center justify-center pointer-events-auto bg-black/40 backdrop-blur-sm"
                onClick={onCloseGift}
            >
                <div className="bg-[#fff1e6] text-black p-8 max-w-sm w-full shadow-2xl rounded-sm transform rotate-1 border-4 border-double border-red-800">
                    <h3 className="font-[Cinzel] text-red-800 text-xl mb-4 border-b border-red-200 pb-2">A Holiday Greeting</h3>
                    <p className="font-[Lato] text-lg leading-relaxed italic">"{activeGiftMessage}"</p>
                    <div className="mt-6 text-center text-xs text-gray-500 uppercase tracking-widest">Click anywhere to close</div>
                </div>
            </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};