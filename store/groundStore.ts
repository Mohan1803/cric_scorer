import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';

export interface Ground {
  id: string;
  name: string;
  ownerName: string;
  ownerPhone: string;
  address: string;
  city: string;
  latitude: number;
  longitude: number;
  amenities: string[];
  imageUrl?: string;
  rating?: number;
  pricePerMatch?: string;
  creatorId?: string;
}

interface GroundState {
  grounds: Ground[];
  addGround: (ground: Omit<Ground, 'id'>) => void;
  updateGround: (id: string, ground: Partial<Ground>) => void;
  deleteGround: (id: string) => void;
  hasHydrated: boolean;
  setHasHydrated: (state: boolean) => void;
}

export const useGroundStore = create<GroundState>()(
  persist(
    (set, get) => ({
      grounds: [],
      hasHydrated: false,
      setHasHydrated: (state) => set({ hasHydrated: state }),

      addGround: (ground) => {
        const newGround: Ground = {
          ...ground,
          id: `g_${Math.random().toString(36).substring(2, 11)}_${Date.now()}`
        };
        set((state) => ({
          grounds: [newGround, ...state.grounds]
        }));
      },

      updateGround: (id, updatedFields) => {
        set((state) => ({
          grounds: state.grounds.map((g) => (g.id === id ? { ...g, ...updatedFields } : g))
        }));
      },

      deleteGround: (id) => {
        set((state) => ({
          grounds: state.grounds.filter((g) => g.id !== id)
        }));
      }
    }),
    {
      name: 'cric-scorer-grounds-store-v2',
      storage: createJSONStorage(() => AsyncStorage),
      onRehydrateStorage: () => (state) => {
        state?.setHasHydrated(true);
      }
    }
  )
);
