import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';

interface User {
  id: string;
  email: string;
  name?: string;
  photoURL?: string;
  role?: 'batsman' | 'bowler' | 'allrounder' | 'wicketkeeper';
  battingHand?: 'right' | 'left';
  bowlingHand?: 'right' | 'left';
  bowlingType?: 'fast' | 'medium' | 'off_spin' | 'leg_spin';
  qrCode?: string;
  hasProfile: boolean;
}

interface AuthState {
  user: User | null;
  isAuthenticated: boolean;
  hasHydrated: boolean;
  setHasHydrated: (state: boolean) => void;
  login: (email: string, profile?: any) => void;
  updateProfile: (profile: Partial<User>) => void;
  logout: () => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      user: null,
      isAuthenticated: false,
      hasHydrated: false,
      setHasHydrated: (state) => set({ hasHydrated: state }),
      login: (email: string, profile?: any) => {
        const id = `user_${email.split('@')[0]}`;
        set({ 
          user: profile ? { ...profile } : { id, email, hasProfile: false }, 
          isAuthenticated: true 
        });
      },
      updateProfile: (profile: Partial<User>) => {
        set((state) => ({
          user: state.user ? { ...state.user, ...profile } : null
        }));
      },
      logout: () => set({ user: null, isAuthenticated: false }),
    }),
    {
      name: 'cric-scorer-auth',
      storage: createJSONStorage(() => AsyncStorage),
      onRehydrateStorage: () => (state) => {
        state?.setHasHydrated(true);
      },
    }
  )
);
