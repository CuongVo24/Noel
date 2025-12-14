import React, { createContext, useContext, useReducer, useEffect, ReactNode, PropsWithChildren } from 'react';
import { GameState, Decoration, CeremonyState, DecorationType } from '../types';
import { CEREMONY_TARGET } from '../constants';

// --- STATE DEFINITION ---
interface State {
  gameState: GameState;
  userName: string;
  userColor: string;
  isLit: boolean;
  decorations: Decoration[];
  ceremony: CeremonyState;
  snowAmount: number; // Static now, but kept in state for prop drilling
}

// --- ACTIONS ---
type Action =
  | { type: 'START_GAME'; payload: { name: string; color: string } }
  | { type: 'TOGGLE_LIGHTS' }
  | { type: 'ADD_DECORATION'; payload: Decoration }
  | { type: 'ADD_DECORATIONS_BATCH'; payload: Decoration[] }
  | { type: 'LOAD_DECORATIONS'; payload: Decoration[] }
  | { type: 'SET_SNOW'; payload: number };

// --- INITIAL STATE ---
const initialState: State = {
  gameState: 'LOBBY',
  userName: '',
  userColor: '#ff0000',
  isLit: false,
  decorations: [],
  ceremony: { active: false, progress: 0, target: CEREMONY_TARGET },
  snowAmount: 0.4,
};

// --- REDUCER ---
const gameReducer = (state: State, action: Action): State => {
  switch (action.type) {
    case 'START_GAME':
      return {
        ...state,
        gameState: 'DECORATING',
        userName: action.payload.name,
        userColor: action.payload.color,
      };
    case 'TOGGLE_LIGHTS':
      return { ...state, isLit: !state.isLit };
    case 'ADD_DECORATION':
      return { ...state, decorations: [...state.decorations, action.payload] };
    case 'ADD_DECORATIONS_BATCH':
        return { ...state, decorations: [...state.decorations, ...action.payload] };
    case 'LOAD_DECORATIONS':
      return { ...state, decorations: action.payload };
    case 'SET_SNOW':
      return { ...state, snowAmount: action.payload };
    default:
      return state;
  }
};

// --- CONTEXT ---
const GameContext = createContext<{
  state: State;
  dispatch: React.Dispatch<Action>;
} | undefined>(undefined);

export const GameProvider = ({ children }: PropsWithChildren) => {
  const [state, dispatch] = useReducer(gameReducer, initialState);

  // 1. Initial Load
  useEffect(() => {
    try {
      const saved = localStorage.getItem('christmas_decorations');
      if (saved) {
        dispatch({ type: 'LOAD_DECORATIONS', payload: JSON.parse(saved) });
      }
    } catch (e) {
      console.warn('Failed to load decorations', e);
    }
  }, []);

  // 2. Debounced Save (Optimization: Write to disk max once every 2s)
  useEffect(() => {
    if (state.decorations.length === 0) return;

    const handler = setTimeout(() => {
      localStorage.setItem('christmas_decorations', JSON.stringify(state.decorations));
    }, 2000);

    return () => clearTimeout(handler);
  }, [state.decorations]);

  return (
    <GameContext.Provider value={{ state, dispatch }}>
      {children}
    </GameContext.Provider>
  );
};

export const useGame = () => {
  const context = useContext(GameContext);
  if (!context) {
    throw new Error('useGame must be used within a GameProvider');
  }
  return context;
};