import { create } from 'zustand';
import { generateWishBatch } from '../utils/gemini';

interface WishState {
  wishPool: string[];
  isFetching: boolean;
  addWishes: (wishes: string[]) => void;
  consumeWish: () => string | null;
  checkAndRefill: () => Promise<void>;
}

export const useWishStore = create<WishState>((set, get) => ({
  wishPool: [],
  isFetching: false,
  
  addWishes: (newWishes) => set((state) => ({ 
    wishPool: [...state.wishPool, ...newWishes] 
  })),

  consumeWish: () => {
    const { wishPool } = get();
    if (wishPool.length === 0) return null;
    
    const wish = wishPool[0];
    set({ wishPool: wishPool.slice(1) });
    
    // Trigger background refill if low
    get().checkAndRefill();
    
    return wish;
  },

  checkAndRefill: async () => {
    const { wishPool, isFetching } = get();
    // Maintain a buffer of at least 5 wishes
    if (wishPool.length < 5 && !isFetching) {
      set({ isFetching: true });
      try {
        const newBatch = await generateWishBatch();
        if (newBatch && newBatch.length > 0) {
            get().addWishes(newBatch);
        }
      } catch (err) {
        console.error("Failed to refill wish pool", err);
      } finally {
        set({ isFetching: false });
      }
    }
  }
}));