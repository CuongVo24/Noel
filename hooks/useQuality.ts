import { useState, useEffect } from 'react';

export type QualityTier = 'LOW' | 'HIGH';

interface QualitySettings {
  tier: QualityTier;
  dpr: [number, number];
  effectsEnabled: boolean; // Bloom, Vignette
  particleMultiplier: number; // 0.5 for mobile, 1.0 for desktop
  shadowsEnabled: boolean;
}

export const useQuality = (): QualitySettings => {
  const [settings, setSettings] = useState<QualitySettings>({
    tier: 'LOW',
    dpr: [1, 1],
    effectsEnabled: false,
    particleMultiplier: 0.5,
    shadowsEnabled: false,
  });

  useEffect(() => {
    // Simple heuristic: Check for mobile user agent or low hardware concurrency
    const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
    const lowConcurrency = navigator.hardwareConcurrency && navigator.hardwareConcurrency <= 4;
    
    // Default to LOW for mobile or weak CPUs
    const isLowEnd = isMobile || lowConcurrency;

    if (isLowEnd) {
      setSettings({
        tier: 'LOW',
        dpr: [1, 1.5], // Cap DPR on mobile
        effectsEnabled: false, // Disable expensive post-processing
        particleMultiplier: 0.4, // Reduce particles significantly
        shadowsEnabled: false,
      });
      console.log('Running in Performance Mode (LOW)');
    } else {
      setSettings({
        tier: 'HIGH',
        dpr: [1, 2],
        effectsEnabled: true,
        particleMultiplier: 1.0,
        shadowsEnabled: true,
      });
      console.log('Running in Fidelity Mode (HIGH)');
    }
  }, []);

  return settings;
};