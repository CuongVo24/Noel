import React, { createContext, useContext, useReducer, useEffect, PropsWithChildren } from 'react';
import { GameState, Decoration, CeremonyState } from '../types';
import { CEREMONY_TARGET } from '../constants';
import { subscribeToDecorations } from '../utils/firebase';

// --- STATE DEFINITION ---
interface State {
  gameState: GameState;
  userName: string;
  userColor: string;
  isLit: boolean;
  decorations: Decoration[];
  ceremony: CeremonyState;
  snowAmount: number;
}

// --- ACTIONS ---
type Action =
  | { type: 'START_GAME'; payload: { name: string; color: string } }
  | { type: 'TOGGLE_LIGHTS' }
  | { type: 'LOAD_DECORATIONS'; payload: Decoration[] }
  | { type: 'SET_SNOW'; payload: number };

// --- INITIAL STATE ---
const initialState: State = {
  gameState: 'LOBBY',
  userName: '',
  userColor: '#ff0000',
  isLit: false,
  decorations: [], // Start empty, let Firebase populate
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
    case 'LOAD_DECORATIONS':
      // Single source of truth update from Cloud
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

  // REALTIME DATABASE SUBSCRIPTION
  useEffect(() => {
    // Connect to Firebase and listen for changes
    const unsubscribe = subscribeToDecorations((data) => {
        dispatch({ type: 'LOAD_DECORATIONS', payload: data });
    });

    // Cleanup listener on unmount
    return () => unsubscribe();
  }, []);

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
